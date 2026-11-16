# Changelog

All notable changes to this integration are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[semantic versioning](https://semver.org/), bumped by the Release workflow.

## [Unreleased]

## [1.0.3] - 2026-11-16

- Maintenance release, no functional change.

## [1.0.2] - 2026-11-16

- Update `@gladysassistant/integration-sdk` to 0.16.1 (security update).

## [1.0.1] - 2026-11-16

- Maintenance release, no functional change.

## [1.0.0] - 2026-10-26

### Added

- First version of the iNoé Espace Famille calendar integration (AIGA family portal), read-only
  and cloud: each child's bookings in the Gladys calendar.
- Per user: every Gladys user enables it under "My calendars" with their own portal account.
- One calendar per child, one full-day event per booked day with every slot of the day ("Léa –
  Accueil de loisirs : Matin, Repas, Après-midi"); a booking cancelled on the portal leaves the
  calendar, past days stay.
- Settings: sync interval, days published ahead (7 to 92), time zone; "Sync now" button.
- English, French, German and Spanish texts and documentation.

[Unreleased]: https://github.com/prohand/gladys-calendar-inoeespacefamille/compare/v1.0.3...HEAD
[1.0.3]: https://github.com/prohand/gladys-calendar-inoeespacefamille/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/prohand/gladys-calendar-inoeespacefamille/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/prohand/gladys-calendar-inoeespacefamille/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/prohand/gladys-calendar-inoeespacefamille/releases/tag/v1.0.0
