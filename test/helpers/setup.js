// -----------------------------------------------------------------------------
// A Sync wired to the SDK's fake Gladys and to the fake iNoé portal, with a
// fixed clock and one user who enabled the integration.
// -----------------------------------------------------------------------------

import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { InoeClient } from '../../src/inoe/client.js';
import { Sync } from '../../src/sync.js';
import { createFakeInoe, DOSSIER_ID, PASSWORD, USERNAME } from './fakeInoe.js';

// 09:00 in Paris on Monday 26 October 2026.
export const NOW = new Date('2026-10-26T08:00:00Z');

export const USER = { selector: 'julie', first_name: 'Julie', language: 'fr' };

export const ACCOUNT = {
  portal_url: `https://espacefamille.aiga.fr/${DOSSIER_ID}`,
  username: USERNAME,
  password: PASSWORD,
};

/** The external id of a child's calendar for USER: `ext:test-integration:julie:child-…`. */
export function calendarIdOf(childId, user = USER) {
  return `ext:test-integration:${user.selector}:child-${DOSSIER_ID}-${childId}`;
}

export async function setup({
  accounts = [{ user: USER, config: ACCOUNT }],
  config = {},
  now = NOW,
} = {}) {
  const inoe = createFakeInoe();
  const gladys = createFakeGladys({ config, calendarAccounts: accounts });
  await gladys.connect();
  const clock = { now };
  const sync = new Sync(gladys, {
    createClient: (account) => new InoeClient(account, { fetch: inoe.fetch }),
    now: () => clock.now,
  });
  sync.configure(config);
  return { inoe, gladys, sync, clock };
}
