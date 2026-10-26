// -----------------------------------------------------------------------------
// The calendars and events built from a read of the portal.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import {
  buildCalendars,
  buildEvents,
  calendarExternalId,
  COLORS,
  eventExternalId,
  pruneWindow,
} from '../src/calendar.js';

const gladys = createFakeGladys();
const user = { selector: 'julie', first_name: 'Julie', language: 'de' };
const dossier = { id: '11578177', code: 'DEMO', name: 'Ville de Démo' };

test('the ids are user-scoped and made of iNoé ids only', () => {
  assert.equal(
    calendarExternalId(gladys, 'julie', '11578177', '501'),
    'ext:test-integration:julie:child-11578177-501',
  );
  assert.equal(
    eventExternalId(gladys, 'julie', '11578177', '501', '2026-10-27'),
    'ext:test-integration:julie:booking-11578177-501-2026-10-27',
  );
});

test('the calendars follow the language of their user, one color each', () => {
  const children = Array.from({ length: COLORS.length + 1 }, (_, index) => ({
    id: String(index),
    name: `Kind ${index}`,
    days: [],
  }));
  const calendars = buildCalendars(gladys, user, { dossier, children });
  assert.equal(
    calendars[0].description,
    'Buchungen von Kind 0 im iNoé-Familienportal (Ville de Démo).',
  );
  assert.equal(new Set(calendars.slice(0, COLORS.length).map((c) => c.color)).size, COLORS.length);
  // More children than colors: the palette starts again.
  assert.equal(calendars[COLORS.length].color, COLORS[0]);
});

test('an event name too long for Gladys is cut, never refused', () => {
  const slots = Array.from({ length: 40 }, (_, index) => ({
    activity: 'Accueil de loisirs',
    slot: `Créneau ${index}`,
    order: index,
  }));
  const [item] = buildEvents(gladys, user, dossier, {
    id: '501',
    name: 'Léa',
    days: [['2026-10-27', slots]],
  });
  assert.equal(item.name.length, 200);
  assert.ok(item.name.endsWith('…'));
  assert.ok(item.description.length <= 1000);
});

test('a day of several activities lists one activity per line', () => {
  const [item] = buildEvents(gladys, user, dossier, {
    id: '501',
    name: 'Léa',
    days: [
      [
        '2026-10-27',
        [
          { activity: 'Périscolaire', slot: 'Cantine', order: 0 },
          { activity: 'Périscolaire', slot: 'Garderie soir', order: 1 },
          { activity: 'Études', slot: 'Soir', order: 2 },
        ],
      ],
    ],
  });
  assert.equal(item.name, 'Léa – Périscolaire : Cantine, Garderie soir · Études : Soir');
  assert.equal(item.description, 'Périscolaire : Cantine, Garderie soir\nÉtudes : Soir');
  assert.deepEqual([item.start, item.end, item.full_day], ['2026-10-27', '2026-10-28', true]);
});

test('the prune window catches the days read, and only them, in every French time zone', () => {
  const window = pruneWindow({ from: '2026-10-26', to: '2026-11-25' });
  const from = Date.parse(window.from);
  const to = Date.parse(window.to);
  // The overlap rule of the core: start < to, and end > from or start >= from.
  const overlaps = ({ start, end }) => start < to && (end > from || start >= from);
  // A full-day event as Gladys stores it: between two local midnights.
  const stored = (day, offsetMinutes) => {
    const midnight = Date.parse(`${day}T00:00:00Z`) - offsetMinutes * 60_000;
    return { start: midnight, end: midnight + 86_400_000 };
  };
  // French Polynesia (-10, -9:30) to Wallis and Futuna (+12), Paris summer and winter.
  for (const hours of [-10, -9.5, -4, -3, 0, 1, 2, 3, 4, 5, 11, 12]) {
    const offset = hours * 60;
    assert.ok(overlaps(stored('2026-10-26', offset)), `first day, UTC${hours}`);
    assert.ok(overlaps(stored('2026-11-25', offset)), `last day, UTC${hours}`);
    assert.ok(!overlaps(stored('2026-10-25', offset)), `the day before, UTC${hours}`);
    assert.ok(!overlaps(stored('2026-11-26', offset)), `the day after, UTC${hours}`);
  }
});
