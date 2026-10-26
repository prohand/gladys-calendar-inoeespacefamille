// -----------------------------------------------------------------------------
// Configuration: the integration's own settings, and each user's account.
//
// A calendar integration has two forms in Gladys:
//   - the `config_schema`, filled in once by an administrator: how often the
//     portal is read, how far ahead, in which time zone;
//   - the `account_schema`, filled in by EVERY user who enables the
//     integration for themselves ("My calendars"): their own portal address,
//     email and password. `gladys.getCalendarAccounts()` returns them.
//
// This module only provides defaults and normalizes both, so the rest of the
// code never has to deal with `undefined` or with numbers typed as strings.
// -----------------------------------------------------------------------------

// Defaults: they MUST stay consistent with the `default` values declared in the
// `config_schema` of the manifest (test/manifest.test.js checks it).
export const DEFAULT_CONFIG = {
  // Minutes between two reads of the portal. The portal is a web application
  // shared by every family of the structure: once an hour is plenty for
  // bookings that change a few times a week.
  refresh_minutes: 60,
  // How many days of the planning are published, today included. Booked days
  // further ahead appear as the window moves forward.
  days_ahead: 31,
  // "Today" is that of the family, not of the container (which runs in UTC).
  timezone: 'Europe/Paris',
};

// The keys of the `account_schema`, the values every user fills in.
export const ACCOUNT_FIELDS = ['portal_url', 'username', 'password'];

const LIMITS = {
  refresh_minutes: [15, 1440],
  // 92 days keep one child well under the 500 events of one request.
  days_ahead: [7, 92],
};

/** A number within [min, max], or the default when the value is not a number. */
function bounded(value, key) {
  const number = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(number)) {
    return DEFAULT_CONFIG[key];
  }
  const [min, max] = LIMITS[key];
  return Math.min(max, Math.max(min, Math.round(number)));
}

/** Whether `timezone` is a time zone the runtime knows. */
export function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Merge the integration config with the defaults.
 * @param {Record<string, unknown>} raw config returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const timezone = String(raw.timezone ?? '').trim() || DEFAULT_CONFIG.timezone;
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    refresh_minutes: bounded(raw.refresh_minutes, 'refresh_minutes'),
    days_ahead: bounded(raw.days_ahead, 'days_ahead'),
    timezone: isValidTimezone(timezone) ? timezone : DEFAULT_CONFIG.timezone,
  };
}

/**
 * The structure's number (the `dossier`) out of what the user pasted: the full
 * portal address, an address with `?dossier=`, or the number alone.
 * @param {string} value
 * @returns {string | null} the digits, or null when none can be found
 */
export function parseDossierId(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return null;
  }
  const query = /[?&]dossier=(\d+)/i.exec(text);
  if (query) {
    return query[1];
  }
  if (/^\d+$/.test(text)) {
    return text;
  }
  // https://espacefamille.aiga.fr/11578177 (possibly followed by /#login...)
  const path = /^https?:\/\/[^/]+\/(\d+)(?:[/?#]|$)/i.exec(text);
  return path ? path[1] : null;
}

/**
 * One user's account values, as the client needs them.
 * @param {Record<string, unknown>} raw the `config` of a calendar account
 * @returns {{ dossierId: string | null, username: string, password: string }}
 */
export function normalizeAccount(raw = {}) {
  return {
    dossierId: parseDossierId(raw.portal_url),
    username: String(raw.username ?? '').trim(),
    // Kept as typed: a password may start or end with a space.
    password: String(raw.password ?? ''),
  };
}

/**
 * What is still missing before the account can be read, as account keys.
 * @param {ReturnType<typeof normalizeAccount>} account
 * @returns {string[]} empty when the account can be used
 */
export function missingAccountFields(account) {
  const missing = [];
  if (!account.dossierId) {
    missing.push('portal_url');
  }
  if (!account.username) {
    missing.push('username');
  }
  if (!account.password) {
    missing.push('password');
  }
  return missing;
}
