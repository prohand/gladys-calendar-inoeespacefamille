// -----------------------------------------------------------------------------
// Consistency checks between `gladys-assistant-integration.json` and the code.
// The manifest is validated by the store indexer, but nothing there can know
// which handlers the code actually registers — these tests keep both in sync.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ACCOUNT_FIELDS, DEFAULT_CONFIG } from '../src/config.js';
import { LANGUAGES } from '../src/i18n.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const indexSource = await readFile(new URL('../index.js', import.meta.url), 'utf8');

test('the version, the image tag and package.json agree', () => {
  assert.equal(manifest.version, packageJson.version);
  assert.equal(
    manifest.docker_image,
    `ghcr.io/prohand/gladys-calendar-inoeespacefamille:${packageJson.version}`,
  );
  assert.match(
    manifest.cover_image,
    /^https:\/\/raw\.githubusercontent\.com\/prohand\/gladys-calendar-inoeespacefamille\/main\/cover\.png$/,
  );
});

test('a calendar integration, listening to the "My calendars" changes', () => {
  assert.equal(manifest.type, 'calendar');
  assert.match(indexSource, /onCalendarAccountUpdated\(/);
  // No device: no transport to declare, no device surface.
  assert.equal(manifest.transports, undefined);
});

test('every manifest action is registered in index.js', () => {
  for (const action of manifest.actions ?? []) {
    assert.match(
      indexSource,
      new RegExp(`onAction\\('${action.key}'`),
      `manifest action "${action.key}" has no handler`,
    );
  }
});

// The store schema is the admission authority: a field type outside this list,
// or a placeholder that is not a multi-language object, gets the integration
// rejected by the indexer. `oauth2` and `account_link` are integration-wide:
// never in the per-user account form, and not used here at all.
const FIELD_TYPES = ['string', 'number', 'boolean', 'select', 'multi_select', 'secret', 'section'];

test('every field uses a type the store accepts', () => {
  const allFields = [
    ...manifest.config_schema,
    ...manifest.account_schema,
    ...(manifest.actions ?? []).flatMap((a) => a.fields ?? []),
  ];
  for (const field of allFields) {
    assert.ok(FIELD_TYPES.includes(field.type), `field "${field.key}": type "${field.type}"`);
    assert.match(field.key, /^[a-z0-9_]+$/, `field key "${field.key}" must be snake_case`);
    if (field.placeholder !== undefined) {
      assert.equal(typeof field.placeholder, 'object', `field "${field.key}": placeholder object`);
      assert.ok(
        ['string', 'number', 'secret'].includes(field.type),
        `field "${field.key}": a ${field.type} field cannot have a placeholder`,
      );
    }
    if (field.min !== undefined || field.max !== undefined) {
      assert.equal(field.type, 'number', `field "${field.key}": min/max are number-only`);
    }
    if (field.type === 'secret') {
      assert.equal(field.default, undefined, `secret "${field.key}" has a default`);
      assert.equal(field.placeholder, undefined, `secret "${field.key}" has a placeholder`);
    }
  }
});

test('the description fits what the store allows', () => {
  assert.ok(manifest.name.length >= 3 && manifest.name.length <= 30);
  for (const [language, text] of Object.entries(manifest.description)) {
    assert.ok(
      text.length >= 10 && text.length <= 100,
      `description.${language} must be 10-100 characters, got ${text.length}`,
    );
  }
});

test('config_schema defaults and bounds stay consistent with DEFAULT_CONFIG', () => {
  const stored = manifest.config_schema.filter((field) => field.type !== 'section');
  assert.deepEqual(stored.map((field) => field.key).sort(), Object.keys(DEFAULT_CONFIG).sort());
  for (const field of stored) {
    assert.equal(DEFAULT_CONFIG[field.key], field.default, `DEFAULT_CONFIG.${field.key}`);
  }
});

test('the account form asks exactly what the client needs, all required', () => {
  const stored = manifest.account_schema.filter((field) => field.type !== 'section');
  assert.deepEqual(
    stored.map((field) => field.key),
    ACCOUNT_FIELDS,
  );
  for (const field of stored) {
    assert.equal(field.required, true, `account field "${field.key}"`);
  }
  assert.equal(stored.find((field) => field.key === 'password').type, 'secret');
});

test('section fields are purely presentational', () => {
  const sections = [...manifest.config_schema, ...manifest.account_schema].filter(
    (f) => f.type === 'section',
  );
  for (const section of sections) {
    assert.equal(section.required, undefined);
    assert.equal(section.default, undefined);
    assert.equal(section.placeholder, undefined);
    for (const link of section.links ?? []) {
      assert.match(link.url, /^https:\/\//, 'section links must be https');
    }
  }
});

test('the categories stay inside the vocabulary the store indexes', () => {
  assert.deepEqual(manifest.categories, ['services']);
});

test('the Gladys floor covers every field the manifest declares', () => {
  // The calendar type and `account_schema` need 5.2, `keywords` and `countries` 5.3.
  const [major, minor] = manifest.gladys_version.replace(/^>=/, '').split('.').map(Number);
  assert.ok(major > 5 || (major === 5 && minor >= 3), `got ${manifest.gladys_version}`);
});

test('the search keywords follow the store rules', () => {
  const { keywords } = manifest;
  assert.ok(Array.isArray(keywords) && keywords.length >= 1 && keywords.length <= 10);
  const normalized = keywords.map((keyword) => keyword.trim().toLowerCase());
  assert.equal(new Set(normalized).size, keywords.length, 'keywords must be unique');
  for (const keyword of normalized) {
    assert.ok(keyword.length >= 2 && keyword.length <= 30, `keyword "${keyword}"`);
  }
});

test('iNoé serves French structures: the integration is listed in France', () => {
  assert.deepEqual(manifest.countries, ['FR']);
});

/** Every multi-language object of the manifest, with where it sits. */
function multiLanguageTexts(node, path = 'manifest') {
  if (Array.isArray(node)) {
    return node.flatMap((child, index) => multiLanguageTexts(child, `${path}[${index}]`));
  }
  if (node === null || typeof node !== 'object') {
    return [];
  }
  const keys = Object.keys(node);
  if (keys.includes('en') && keys.every((key) => /^[a-z]{2}$/.test(key))) {
    return [{ path, text: node }];
  }
  return keys.flatMap((key) => multiLanguageTexts(node[key], `${path}.${key}`));
}

test('every multi-language text of the manifest carries en, fr, de and es', () => {
  const texts = multiLanguageTexts(manifest);
  assert.ok(texts.length > 20, `only ${texts.length} texts found`);
  for (const { path, text } of texts) {
    assert.deepEqual(Object.keys(text).sort(), [...LANGUAGES].sort(), `${path}: languages`);
    for (const language of LANGUAGES) {
      assert.equal(typeof text[language], 'string', `${path}.${language}`);
      assert.ok(text[language].trim().length > 0, `${path}.${language} is empty`);
    }
  }
});

test('the per-language length limits of the store hold in every language', () => {
  for (const section of [...manifest.config_schema, ...manifest.account_schema].filter(
    (field) => field.type === 'section',
  )) {
    for (const language of LANGUAGES) {
      const { length } = section.description[language];
      assert.ok(length >= 1 && length <= 1000, `section ${section.key}.${language}: ${length}`);
    }
  }
});

test('the user documentation exists in every language', async () => {
  for (const language of LANGUAGES) {
    const text = await readFile(new URL(`../docs/${language}.md`, import.meta.url), 'utf8');
    for (const key of [...Object.keys(DEFAULT_CONFIG), ...manifest.actions.map((a) => a.key)]) {
      assert.ok(text.includes(`\`${key}\``), `docs/${language}.md does not name \`${key}\``);
    }
  }
});
