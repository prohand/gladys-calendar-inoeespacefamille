// -----------------------------------------------------------------------------
// The sync loop: for every user who enabled the integration, read their
// family's planning and push it into Gladys as calendars.
//
// One sync of a user =
//   - read the children and their bookings from today over `days_ahead` days;
//   - publish one calendar per child (name, description, color);
//   - publish each child's booked days as full-day events, with a window: a
//     day no longer booked inside the window is removed by Gladys itself;
//   - delete the calendars of children no longer on the account.
// Then the connection status names the users whose sync failed.
//
// Enabling the integration is the user's consent ("My calendars"): only
// the users `getCalendarAccounts()` returns are read, each with their own
// portal account. Syncs never overlap: they run one after the other.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { buildCalendars, buildEvents, calendarExternalId, pruneWindow } from './calendar.js';
import { missingAccountFields, normalizeAccount, normalizeConfig } from './config.js';
import { InoeClient } from './inoe/client.js';
import { addDays, localDay } from './inoe/parse.js';
import { readPlanning } from './inoe/planning.js';
import { connectionStatus, SYNC_ERRORS } from './messages.js';

const logger = createLogger({ name: 'sync' });

export class Sync {
  /**
   * @param {object} gladys the SDK client
   * @param {object} [options]
   * @param {(account: object) => InoeClient} [options.createClient]
   * @param {() => Date} [options.now]
   */
  constructor(gladys, options = {}) {
    this.gladys = gladys;
    this.createClient = options.createClient ?? ((account) => new InoeClient(account));
    this.now = options.now ?? (() => new Date());
    this.config = normalizeConfig();
    /** @type {Map<string, { key: string, client: InoeClient | null, result: object | null }>} */
    this.users = new Map();
    this.queue = Promise.resolve();
    this.timer = null;
  }

  configure(rawConfig) {
    this.config = normalizeConfig(rawConfig);
  }

  /** Run `task` once the syncs already asked for are done. */
  enqueue(task) {
    const run = this.queue.catch(() => {}).then(task);
    this.queue = run;
    return run;
  }

  /** Sync every user who enabled the integration; resolves with their results. */
  syncAll() {
    return this.enqueue(async () => {
      const accounts = await this.gladys.getCalendarAccounts();
      this.forgetOthers(accounts);
      const results = [];
      for (const account of accounts) {
        results.push(await this.syncAccount(account));
      }
      await this.reportStatus();
      return results;
    });
  }

  /**
   * Sync one user again: they enabled the integration, changed their account
   * or flipped a calendar's toggles. A user who disabled it is forgotten:
   * Gladys already destroyed their calendars.
   */
  syncUser(userSelector) {
    return this.enqueue(async () => {
      const accounts = await this.gladys.getCalendarAccounts();
      this.forgetOthers(accounts);
      const account = accounts.find((candidate) => candidate.user.selector === userSelector);
      const result = account ? await this.syncAccount(account) : null;
      await this.reportStatus();
      return result;
    });
  }

  /** Drop the clients of the users no longer enabled. */
  forgetOthers(accounts) {
    const enabled = new Set(accounts.map((account) => account.user.selector));
    for (const selector of this.users.keys()) {
      if (!enabled.has(selector)) {
        this.users.delete(selector);
      }
    }
  }

  /** The state of a user; a changed account starts from a fresh client. */
  stateOf(user, account) {
    const key = JSON.stringify(account);
    let state = this.users.get(user.selector);
    if (!state || state.key !== key) {
      state = {
        key,
        client: missingAccountFields(account).length === 0 ? this.createClient(account) : null,
        result: null,
      };
      this.users.set(user.selector, state);
    }
    return state;
  }

  async syncAccount({ user, config }) {
    const account = normalizeAccount(config);
    const state = this.stateOf(user, account);
    state.result = await this.readAndPublish(user, account, state.client);
    return state.result;
  }

  async readAndPublish(user, account, client) {
    const missing = missingAccountFields(account);
    if (missing.length > 0 || !client) {
      return { user, error: { code: SYNC_ERRORS.MISSING, missing } };
    }
    const from = localDay(this.now(), this.config.timezone);
    const days = { from, to: addDays(from, this.config.days_ahead - 1) };
    let planning;
    try {
      planning = await readPlanning(client, days);
    } catch (err) {
      logger.error(`Sync of user ${user.selector} failed: ${err.message}`);
      // A failed read may be an expired cookie the portal answers oddly, or
      // a portal version deployed overnight: start the next one afresh.
      client.reset();
      return { user, error: err };
    }
    try {
      await this.publish(user, planning, days);
    } catch (err) {
      logger.error(`Calendars of user ${user.selector} refused by Gladys: ${err.message}`);
      return { user, error: { code: SYNC_ERRORS.GLADYS } };
    }
    return {
      user,
      dossier: planning.dossier,
      days: this.config.days_ahead,
      children: planning.children.map((child) => ({
        name: child.name,
        bookedDays: child.days === null ? null : child.days.length,
      })),
    };
  }

  async publish(user, planning, days) {
    const { gladys } = this;
    const calendars = buildCalendars(gladys, user, planning);
    if (calendars.length > 0) {
      await gladys.publishCalendars(user.selector, calendars);
    }
    const existing = await gladys.getCalendars(user.selector);
    // `sync` belongs to the user: a calendar they turned off is skipped (Gladys
    // would refuse its events), and filled again once they turn it back on.
    const skipped = new Set(existing.filter((c) => !c.sync).map((c) => c.external_id));
    const window = pruneWindow(days);
    for (const child of planning.children) {
      const id = calendarExternalId(gladys, user.selector, planning.dossier.id, child.id);
      // A planning that could not be read publishes nothing: the events
      // already in Gladys stay, rather than being pruned as "not booked".
      if (child.days === null || skipped.has(id)) {
        continue;
      }
      const events = buildEvents(gladys, user, planning.dossier, child);
      const answer = await gladys.publishCalendarEvents(id, events, window);
      logger.debug(
        `User ${user.selector}, child ${child.id}: ${events.length} day(s) booked, ` +
          `${answer?.created ?? 0} created, ${answer?.updated ?? 0} updated, ${answer?.deleted ?? 0} deleted`,
      );
    }
    // A child no longer on the account (or another account typed in): its
    // calendar goes. Never on a read without any child, which may be a
    // portal hiccup rather than a family without children.
    if (calendars.length > 0) {
      const wanted = new Set(calendars.map((calendar) => calendar.external_id));
      for (const calendar of existing) {
        if (!wanted.has(calendar.external_id)) {
          await gladys.deleteCalendar(calendar.external_id);
          logger.info(
            `User ${user.selector}: calendar of a child no longer on the account deleted`,
          );
        }
      }
    }
  }

  /** The connection status, from the last result of every enabled user. */
  async reportStatus() {
    const results = [...this.users.values()].map((state) => state.result).filter(Boolean);
    const { connected, message } = connectionStatus(results);
    try {
      await this.gladys.setConnectionStatus(connected, message);
    } catch (err) {
      logger.warn(`Connection status not published: ${err.message}`);
    }
  }

  /** Sync on a timer, at the interval of the configuration. */
  start() {
    this.stop();
    this.syncAll().catch((err) => logger.error(`Sync failed: ${err.message}`));
    this.timer = setInterval(
      () => this.syncAll().catch((err) => logger.error(`Sync failed: ${err.message}`)),
      this.config.refresh_minutes * 60 * 1000,
    );
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
