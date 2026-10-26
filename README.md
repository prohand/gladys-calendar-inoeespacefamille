# iNoé Espace Famille – Agenda — Gladys Assistant integration

Calendar integration for [Gladys Assistant](https://gladysassistant.com) that reads your
**iNoé Espace Famille** — the family portal [AIGA](https://www.aiga.fr) provides to French towns
and structures (school canteen, after-school club, leisure centre, nursery) — and puts each
child's bookings into the **Gladys calendar**.

- Manifest **`type: "calendar"`**: one calendar per child, one full-day event per booked day
  ("Léa – Accueil de loisirs : Matin, Repas, Après-midi").
- **Per user**: each Gladys user enables it for themselves under "My calendars" with their own
  portal account; their calendars are theirs (private until shared).
- **Cloud**, **read-only**: it signs in to the portal like a parent and never books, cancels
  or pays anything.
- Gladys **5.3+**, built on
  [`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js).
- Texts and documentation in **English, French, German and Spanish**.

It complements [gladys-inoeespacefamille](https://github.com/prohand/gladys-inoeespacefamille)
(invoices, devices, scene triggers): a Gladys integration has a single type, and a calendar
integration has no devices, so the calendar lives in an integration of its own.

User documentation (re-hosted by Gladys, linked from the Configuration screen):
[English](docs/en.md) · [Français](docs/fr.md) · [Deutsch](docs/de.md) · [Español](docs/es.md).

## What you get in Gladys

| Surface                     | Content                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| Calendars                   | One per child and per user: `<first name> – iNoé`, one color per child                           |
| Events                      | One full-day event per booked day, every slot of the day; the structure as location, portal link |
| "My calendars" (every user) | Portal address, email, password; Enable; per calendar `sync` and `shared` toggles                |
| Configuration (admin)       | Sync interval, days published ahead, time zone; **Sync now**                                     |
| Connection status           | Connected, or the first name of each user whose sync failed and why                              |

Through the core, the calendars feed the calendar view, the `calendar.event-is-coming` scene
trigger, the calendar scene actions and the assistant (shared calendars only for the scenes).

## How it works

iNoé has no public API. The integration speaks to the same endpoints as the portal's own web
application, read-only (details in [CLAUDE.md](CLAUDE.md)):

1. find the build serving the structure (`prod.js`, `/version?dossierID=`);
2. read the structure (`infoDossierController/dossier`);
3. sign in on `ism.aiga.fr` (session cookies);
4. read the dashboard (the children) and each child's planning.

A sync runs every `refresh_minutes` (60 by default) for every user who enabled the integration,
and at once when a user enables it or changes their account. Each child's events are published
with a **window** (today to `days_ahead`): Gladys removes the days inside it that are no longer
booked; the past is never touched.

## Project structure

```
.
├─ index.js                          # SDK bootstrap + wiring (no portal logic)
├─ src/
│  ├─ sync.js                        # sync loop: accounts -> planning -> calendars, events, status
│  ├─ calendar.js                    # calendars, events, external ids, prune window
│  ├─ config.js                      # defaults (mirror the manifest), account normalization
│  ├─ messages.js / i18n.js          # user-facing texts {en, fr, de, es}
│  └─ inoe/                          # portal client, cookies, parsing, planning read
├─ docs/{en,fr,de,es}.md             # user documentation
├─ test/                             # node --test, fake portal + SDK fake Gladys
├─ gladys-assistant-integration.json # manifest
├─ Dockerfile                        # Node 24 Alpine, read-only rootfs ready
├─ CHANGELOG.md / CLAUDE.md / SECURITY.md
├─ .github/workflows/ci.yml          # format, lint, tests (Node 22 + 24), store checks, Docker build
├─ .github/workflows/release.yml     # UI-driven release: bump + changelog + tag + build + store check
├─ .github/workflows/build.yml       # multi-arch build (git tag, manual run, or called by release)
├─ .github/workflows/github-release.yml # GitHub Release of every version tag
├─ .github/scripts/changelog-release.mjs # moves [Unreleased] under the released version
└─ .github/dependabot.yml            # weekly npm, monthly Actions and Docker base image
```

## Development

```bash
npm install
npm test               # node --test, no network
npm run lint           # ESLint
npm run format:check   # Prettier (CI gate)
npm run format         # Prettier, fix in place
npx github:GladysAssistant/integration-store --skip-image-check .   # store admission checks
```

Run it against a Gladys instance:

```bash
GLADYS_HOST_API_URL="http://localhost:1443" \
GLADYS_INTEGRATION_TOKEN="<token>" \
GLADYS_INTEGRATION_SELECTOR="inoe-espace-famille-agenda" \
LOG_LEVEL=debug \
npm start
```

## Publishing

1. Add the GitHub topic `gladys-assistant-integration` to the repository, and turn on
   **Private vulnerability reporting** in the security settings ([SECURITY.md](SECURITY.md)
   sends reporters there).
2. Describe the changes under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md).
3. **Actions → Release → Run workflow**, pick `patch`, `minor` or `major`. The repository starts
   at `0.0.0`: the first release is a **`major`** (→ `1.0.0`). The workflow bumps
   `package.json` and the manifest (`version` + `docker_image`), moves the changelog, tags,
   builds the `linux/amd64` + `linux/arm64` image to
   `ghcr.io/prohand/gladys-calendar-inoeespacefamille`, publishes the GitHub Release and runs
   the store checks with the image.
4. Make the ghcr.io package **public** after the first build (Package settings → visibility),
   so Gladys can pull it.

`cover.png` is the catalog cover (800×534 px, ≤ 150 KB).

## License

Apache-2.0
