# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Gladys Assistant **calendar integration** (manifest `type: "calendar"`, Node 22+, ESM, no
build step, one runtime dependency: `@gladysassistant/integration-sdk`) for **iNoé Espace
Famille**, the family portal AIGA sells to French towns and structures (canteen, after-school
club, leisure centre, nursery). Requires Gladys 5.3+. **Cloud only, read-only**: it signs in to
the portal like a parent, reads each child's planning and pushes it into the Gladys calendar
store; it never books, cancels or pays anything.

It is the calendar half of [prohand/gladys-inoeespacefamille](https://github.com/prohand/gladys-inoeespacefamille)
(invoices, devices, scene triggers): a manifest has one `type`, the calendar API answers 403 to
any other type, and a calendar integration has no devices. `src/inoe/client.js`,
`src/inoe/cookies.js` and the planning part of `src/inoe/parse.js` are copies of that
repository's: a portal change fixed there must be ported here (and back).

## Commands

```bash
npm install
npm test                                    # node --test (built-in runner)
node --test test/sync.test.js               # one file
node --test --test-name-pattern "window"    # tests whose name matches
npm run lint                                # eslint .
npm run format:check                        # prettier --check . (CI gate)
npm run format                              # prettier --write .
npx github:GladysAssistant/integration-store --skip-image-check .   # store admission checks
```

CI runs `format:check`, `lint`, `test` on Node 22 and 24, plus the store checks and a Docker
build on pull requests. Releases: **Actions → Release** only (bumps `package.json`, manifest
`version` + `docker_image`, moves the changelog, re-runs Prettier, tags, builds, publishes the
GitHub Release). The repository starts at `0.0.0`: the first release is a `major` (→ 1.0.0).

## Architecture

```
index.js               SDK wiring only: handlers registered before connect()
src/config.js          DEFAULT_CONFIG (mirrors the manifest defaults), account normalization
src/sync.js            the sync loop: accounts -> planning -> calendars, events, status
src/calendar.js        calendars, events, external ids, the prune window
src/messages.js        user-facing messages {en, fr, de, es}: status, "Sync now" report
src/i18n.js            LANGUAGES, pick, localize
src/inoe/client.js     HTTP client of the portal (version, dossier, ISM login, stores)
src/inoe/cookies.js    cookie jar (the session is in cookies on .aiga.fr)
src/inoe/parse.js      tolerant parsing: days, children, bookings
src/inoe/planning.js   one read: the children and their booked days over the window
docs/{en,fr,de,es}.md  user documentation, re-hosted by Gladys
test/helpers/          a fake portal (fetch) and a Sync on the SDK fake Gladys — no network
```

### Two forms

- `config_schema` (administrator, integration-wide): `refresh_minutes`, `days_ahead`, `timezone`.
- `account_schema` (every user, "My calendars"): `portal_url`, `username`, `password`. Enabling
  is the user's consent: only the users `getCalendarAccounts()` returns are read, each with
  their own client (a changed account = a new client). `onCalendarAccountUpdated` is lost while
  disconnected: every connection re-reads every account.

### How the portal is read (no public API)

Same flow as the device integration (see its CLAUDE.md): `prod.js` + `/version` → API base,
`infoDossierController/dossier` (a 303 moves the base), `POST ism.aiga.fr/login` (cookies) then
`loginController/getSession`, then `tableaudebordController/infos/` (children) and, per child,
`pointageANController/events/` + `pointageANController/plageFonctionnements/`. A 401/403 on a
data call = session expired: log in again once (`withSession`). A failed read resets the client.

### Invariants worth knowing

- **Read-only.** Never add a call that books, cancels, pays or edits the family file.
- **The password goes to `ism.aiga.fr` only** and is never logged, nor sent to Gladys; cookie
  values are never logged. Tests check it. Logs name users by selector, never by first name.
- **External ids are forever** and user-scoped: calendar
  `ext:<integration>:<user>:child-<dossierId>-<childId>`, event
  `ext:<integration>:<user>:booking-<dossierId>-<childId>-<YYYY-MM-DD>` (iNoé ids, never names).
- **One full-day event per booked day** (the portal gives slots, not hours): `start` = the day,
  `end` = the next day (exclusive), name `<child> – <activity> : <slots>` (`describeBookings`).
  "Booked" is `isBooked`, as in the device integration.
- **The window replaces**: each child's events go with `pruneWindow({ from: today, to: last })`,
  bounds at 11:00 UTC so that, from UTC-10 to UTC+12, they fall inside the first and last day
  (test in `calendar.test.js`). Days inside no longer booked are pruned by Gladys; the past is
  never touched.
- **A planning that could not be read publishes nothing** for that child (its events stay).
- **`sync` / `shared` / `selector` belong to the user**: a `sync: false` calendar is skipped
  (Gladys would answer 403); name, description, color are ours and overwritten every sync.
- **A child no longer on the account loses its calendar**, but a read with no child deletes
  nothing.
- **Today** is computed in the configured `timezone` (default Europe/Paris), never in the
  container's UTC.
- Bounds of the core: ≤ 50 calendars per user, ≤ 500 events per request (`days_ahead` ≤ 92),
  names ≤ 100 / 200 characters (cut with `…`), 30 calendar writes per minute per integration.
- **Every feature of the store**: `oauth2` / `account_link` are refused in `account_schema`;
  `account_schema` and the calendar type need Gladys 5.2, `keywords` / `countries` 5.3.

### Manifest

`test/manifest.test.js` keeps `gladys-assistant-integration.json` (type, config and account
schemas, actions, keywords, countries, four languages everywhere, store length limits) in sync
with `DEFAULT_CONFIG`, `ACCOUNT_FIELDS` and `index.js`.

## Conventions

- **Changelog**: every user-visible change adds a line under `## [Unreleased]` in
  `CHANGELOG.md` (`### Added`, `Changed`, `Fixed`, `Removed`, `Security`). Never write a
  version heading: the Release workflow does.
- **Versions** belong to the Release workflow: never edit `version` / `docker_image` by hand.
- User-facing text is `{ en, fr, de, es }` (built with `src/i18n.js`); user docs in
  `docs/en.md`, `docs/fr.md`, `docs/de.md`, `docs/es.md`, kept in sync.
- Prettier formats, ESLint catches mistakes. Comments explain **why**, in English. Tests never
  touch the network.
