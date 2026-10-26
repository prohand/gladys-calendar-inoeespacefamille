import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CONFIG,
  isValidTimezone,
  missingAccountFields,
  normalizeAccount,
  normalizeConfig,
  parseDossierId,
} from '../src/config.js';

test('the structure number is read from what the user pastes', () => {
  assert.equal(parseDossierId('https://espacefamille.aiga.fr/11578177'), '11578177');
  assert.equal(parseDossierId('https://espacefamille.aiga.fr/11578177/'), '11578177');
  assert.equal(parseDossierId('https://espacefamille.aiga.fr/11578177#login'), '11578177');
  assert.equal(
    parseDossierId('https://espacefamille.aiga.fr/index.html?dossier=2000212'),
    '2000212',
  );
  // The sign-in page as the browser shows it, hash included.
  assert.equal(
    parseDossierId('https://espacefamille.aiga.fr/index.html?dossier=1626256#connexion&212628'),
    '1626256',
  );
  assert.equal(parseDossierId(' 11578177 '), '11578177');
  assert.equal(parseDossierId('https://espacefamille.aiga.fr/'), null);
  assert.equal(parseDossierId('mairie'), null);
  assert.equal(parseDossierId(''), null);
  assert.equal(parseDossierId(undefined), null);
});

test('normalizeConfig applies the defaults and the bounds', () => {
  assert.deepEqual(normalizeConfig(), DEFAULT_CONFIG);
  const config = normalizeConfig({ refresh_minutes: '5', days_ahead: '400', timezone: 'Mars/X' });
  assert.equal(config.refresh_minutes, 15);
  assert.equal(config.days_ahead, 92);
  assert.equal(config.timezone, 'Europe/Paris');
  assert.equal(normalizeConfig({ days_ahead: '' }).days_ahead, DEFAULT_CONFIG.days_ahead);
  assert.equal(normalizeConfig({ days_ahead: 1 }).days_ahead, 7);
  assert.equal(normalizeConfig({ timezone: 'Indian/Reunion' }).timezone, 'Indian/Reunion');
});

test('an account is read from the values of "My calendars"', () => {
  assert.deepEqual(
    normalizeAccount({
      portal_url: ' https://espacefamille.aiga.fr/11578177 ',
      username: ' a@b.fr ',
      password: ' a b ',
    }),
    // The password is kept as typed, spaces included.
    { dossierId: '11578177', username: 'a@b.fr', password: ' a b ' },
  );
});

test('missingAccountFields names what is left to fill in', () => {
  assert.deepEqual(missingAccountFields(normalizeAccount()), [
    'portal_url',
    'username',
    'password',
  ]);
  assert.deepEqual(
    missingAccountFields(normalizeAccount({ portal_url: '1', username: 'u', password: 'p' })),
    [],
  );
});

test('isValidTimezone knows the IANA names', () => {
  assert.equal(isValidTimezone('Europe/Paris'), true);
  assert.equal(isValidTimezone('Nowhere/Land'), false);
});
