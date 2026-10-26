// -----------------------------------------------------------------------------
// The sync loop against the SDK's fake Gladys (which keeps calendars and
// events like the core) and the fake portal: Léa has the canteen on Monday 26,
// a full day of leisure centre on Tuesday 27 and an absence on Wednesday 28;
// Tom has nothing booked.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PASSWORD } from './helpers/fakeInoe.js';
import { ACCOUNT, calendarIdOf, setup, USER } from './helpers/setup.js';
import { event } from './helpers/fakeInoe.js';
import { syncReport } from '../src/messages.js';

const eventsOf = (gladys, childId, user = USER) =>
  gladys.fake.calendarEvents
    .filter((item) => item.calendar_external_id === calendarIdOf(childId, user))
    .sort((a, b) => a.start.localeCompare(b.start));

test('one calendar per child, named after the child, for the user who enabled it', async () => {
  const { gladys, sync } = await setup();
  await sync.syncAll();
  const calendars = gladys.fake.calendars.sort((a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(
    calendars.map((calendar) => [calendar.external_id, calendar.name, calendar.user]),
    [
      [calendarIdOf('501'), 'Léa – iNoé', 'julie'],
      [calendarIdOf('502'), 'Tom – iNoé', 'julie'],
    ],
  );
  // Written in the user's language, the structure named.
  assert.equal(
    calendars[0].description,
    "Réservations de Léa sur l'Espace Famille iNoé (Ville de Démo).",
  );
  assert.notEqual(calendars[0].color, calendars[1].color);
  assert.deepEqual(gladys.fake.connectionStatus, { connected: true });
});

test('one full-day event per booked day, every slot of the day in its name', async () => {
  const { gladys, sync } = await setup();
  await sync.syncAll();
  const events = eventsOf(gladys, '501');
  assert.deepEqual(
    events.map((item) => item.name),
    ['Léa – Périscolaire : Cantine', 'Léa – Accueil de loisirs : Matin, Repas, Après-midi'],
  );
  const [monday] = events;
  assert.equal(monday.external_id, 'ext:test-integration:julie:booking-11578177-501-2026-10-26');
  assert.equal(monday.full_day, true);
  assert.match(monday.start, /^2026-10-26/);
  assert.match(monday.end, /^2026-10-27/);
  assert.equal(monday.location, 'Ville de Démo');
  assert.equal(monday.url, 'https://espacefamille.aiga.fr/index.html?dossier=11578177');
  // The absence of Wednesday is no event, and Tom has none.
  assert.equal(eventsOf(gladys, '502').length, 0);
});

test('a booking cancelled on the portal leaves the calendar at the next sync', async () => {
  const { gladys, inoe, sync } = await setup();
  await sync.syncAll();
  inoe.events[501] = inoe.events[501].filter((item) => !item.date.startsWith('2026-10-27'));
  inoe.events[501].push(event(9, '2026-11-03', 'soir'));
  await sync.syncAll();
  assert.deepEqual(
    eventsOf(gladys, '501').map((item) => item.name),
    ['Léa – Périscolaire : Cantine', 'Léa – Périscolaire : Garderie soir'],
  );
});

test('past days stay in the calendar as history', async () => {
  const { gladys, inoe, clock, sync } = await setup();
  await sync.syncAll();
  // Two days later, the portal no longer returns Monday (out of the read).
  clock.now = new Date('2026-10-28T08:00:00Z');
  inoe.events[501] = [];
  await sync.syncAll();
  assert.deepEqual(
    eventsOf(gladys, '501').map((item) => item.name),
    ['Léa – Périscolaire : Cantine', 'Léa – Accueil de loisirs : Matin, Repas, Après-midi'],
  );
});

test('the window is the setting: days beyond it are not read', async () => {
  const { gladys, inoe, sync } = await setup({ config: { days_ahead: 7 } });
  inoe.events[501].push(event(9, '2026-11-03', 'soir'));
  await sync.syncAll();
  assert.equal(eventsOf(gladys, '501').length, 2);
  const planningCall = inoe.calls.find((call) => call.url.includes('pointageANController/events'));
  const query = new URL(planningCall.url).searchParams;
  assert.equal(query.get('dateDebut'), '2026-10-26');
  assert.equal(query.get('dateFin'), '2026-11-01');
});

test('a planning that cannot be read keeps the events already published', async () => {
  const { gladys, inoe, sync } = await setup();
  await sync.syncAll();
  inoe.failPlanningOf = '501';
  const [result] = await sync.syncAll();
  assert.equal(eventsOf(gladys, '501').length, 2);
  assert.deepEqual(result.children, [
    { name: 'Léa', bookedDays: null },
    { name: 'Tom', bookedDays: 0 },
  ]);
  assert.match(syncReport([result]).fr, /Léa planning illisible/);
});

test('a calendar the user turned off is skipped, not an error', async () => {
  const { gladys, inoe, sync } = await setup();
  await sync.syncAll();
  gladys.fake.calendars.find((c) => c.external_id === calendarIdOf('501')).sync = false;
  inoe.events[501].push(event(9, '2026-11-03', 'soir'));
  await sync.syncAll();
  assert.ok(!gladys.fake.requests.some((request) => request.status === 403));
  assert.deepEqual(gladys.fake.connectionStatus, { connected: true });
});

test('a child no longer on the account loses its calendar', async () => {
  const { gladys, inoe, sync } = await setup();
  await sync.syncAll();
  inoe.dashboard.familleVO.listeEnfants = inoe.dashboard.familleVO.listeEnfants.filter(
    (person) => person.id !== 502,
  );
  await sync.syncAll();
  assert.deepEqual(gladys.fake.deletedCalendars, [calendarIdOf('502')]);
  assert.deepEqual(
    gladys.fake.calendars.map((calendar) => calendar.external_id),
    [calendarIdOf('501')],
  );
});

test('a read without any child deletes nothing', async () => {
  const { gladys, inoe, sync } = await setup();
  await sync.syncAll();
  inoe.dashboard.familleVO.listeEnfants = [];
  await sync.syncAll();
  assert.deepEqual(gladys.fake.deletedCalendars, []);
});

test('two users of the same family each get calendars of their own', async () => {
  const marc = { selector: 'marc', first_name: 'Marc', language: 'en' };
  const { gladys, sync } = await setup({
    accounts: [
      { user: USER, config: ACCOUNT },
      { user: marc, config: ACCOUNT },
    ],
  });
  await sync.syncAll();
  assert.equal(gladys.fake.calendars.length, 4);
  assert.equal(eventsOf(gladys, '501', marc).length, 2);
  assert.equal(
    gladys.fake.calendars.find((c) => c.external_id === calendarIdOf('501', marc)).description,
    'Bookings of Léa on the iNoé Espace Famille portal (Ville de Démo).',
  );
});

test('a wrong password names the user in the status, and publishes nothing', async () => {
  const { gladys, sync } = await setup({
    accounts: [{ user: USER, config: { ...ACCOUNT, password: 'nope' } }],
  });
  await sync.syncAll();
  assert.equal(gladys.fake.calendars.length, 0);
  const status = gladys.fake.connectionStatus;
  assert.equal(status.connected, false);
  assert.match(status.message.fr, /^Julie : le portail a refusé l'e-mail ou le mot de passe/);
  assert.match(status.message.en, /^Julie: the portal refused/);
});

test('an incomplete account says what to fill in', async () => {
  const { gladys, sync } = await setup({
    accounts: [{ user: USER, config: { portal_url: 'mairie', username: 'a@b.fr' } }],
  });
  await sync.syncAll();
  assert.equal(
    gladys.fake.connectionStatus.message.fr,
    'Julie : à renseigner dans « Mes agendas » : Adresse du portail, Mot de passe.',
  );
});

test('without any enabled user, the status says how to start', async () => {
  const { gladys, inoe, sync } = await setup({ accounts: [] });
  await sync.syncAll();
  assert.equal(inoe.calls.length, 0);
  assert.equal(gladys.fake.connectionStatus.connected, true);
  assert.match(gladys.fake.connectionStatus.message.fr, /Mes agendas/);
});

test('a user who enables the integration is synced at once', async () => {
  const { gladys, sync } = await setup({ accounts: [] });
  await sync.syncAll();
  gladys.fake.calendarAccounts = [{ user: USER, config: ACCOUNT }];
  const result = await sync.syncUser('julie');
  assert.equal(result.dossier.name, 'Ville de Démo');
  assert.equal(gladys.fake.calendars.length, 2);
  assert.deepEqual(gladys.fake.connectionStatus, { connected: true });
});

test('a user who disables it is forgotten: their error leaves the status', async () => {
  const { gladys, sync } = await setup({
    accounts: [{ user: USER, config: { ...ACCOUNT, password: 'nope' } }],
  });
  await sync.syncAll();
  assert.equal(gladys.fake.connectionStatus.connected, false);
  gladys.fake.calendarAccounts = [];
  assert.equal(await sync.syncUser('julie'), null);
  assert.equal(gladys.fake.connectionStatus.connected, true);
  assert.equal(sync.users.size, 0);
});

test('a changed password is used at once: a new client, a new login', async () => {
  const { gladys, inoe, sync } = await setup({
    accounts: [{ user: USER, config: { ...ACCOUNT, password: 'nope' } }],
  });
  await sync.syncAll();
  gladys.fake.calendarAccounts = [{ user: USER, config: ACCOUNT }];
  await sync.syncUser('julie');
  assert.equal(inoe.logins, 1);
  assert.equal(gladys.fake.calendars.length, 2);
});

test('the portal session is kept from one sync to the next', async () => {
  const { inoe, sync } = await setup();
  await sync.syncAll();
  await sync.syncAll();
  assert.equal(inoe.logins, 1);
});

test('the password never reaches Gladys', async () => {
  const { gladys, sync } = await setup();
  await sync.syncAll();
  assert.doesNotMatch(JSON.stringify(gladys.fake.requests), new RegExp(PASSWORD));
});

test('syncs asked at the same time run one after the other', async () => {
  const { inoe, sync } = await setup();
  await Promise.all([sync.syncAll(), sync.syncUser('julie'), sync.syncAll()]);
  assert.equal(inoe.logins, 1);
});

test('the "Sync now" report gives each child\'s booked days', async () => {
  const { sync } = await setup();
  const report = syncReport(await sync.syncAll());
  assert.equal(
    report.fr,
    'Julie : Ville de Démo, Léa 2 jour(s) réservé(s), Tom 0 jour(s) réservé(s) (31 prochains jours).',
  );
  assert.equal(
    report.en,
    'Julie: Ville de Démo, Léa 2 day(s) booked, Tom 0 day(s) booked (next 31 days).',
  );
});
