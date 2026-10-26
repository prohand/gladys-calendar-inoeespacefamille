// -----------------------------------------------------------------------------
// What Gladys receives: one calendar per child, one full-day event per day
// with at least one booking.
//
// Every id is USER-SCOPED (`ext:<integration>:<user>:...`, built with
// `gladys.externalId`): two Gladys users reading the same family never share a
// calendar, each owns theirs. The ids are made of iNoé ids, never of names,
// and are stored by Gladys: never change their format.
//
// The portal gives the slots of a day (Morning, Lunch, Afternoon...), not
// their hours: an event covers the whole day and lists its slots.
// -----------------------------------------------------------------------------

import { PORTAL_URL } from './inoe/client.js';
import { addDays, describeBookings } from './inoe/parse.js';
import { pick } from './i18n.js';

const MAX_CALENDAR_NAME = 100;
const MAX_CALENDAR_DESCRIPTION = 500;
const MAX_EVENT_NAME = 200;
const MAX_EVENT_LOCATION = 500;
const MAX_EVENT_DESCRIPTION = 1000;

// One color per child, in the order the portal lists them: integration-owned,
// so the colors stay the same from one sync to the next.
export const COLORS = ['#3174ad', '#e67e22', '#27ae60', '#8e44ad', '#c0392b', '#16a085'];

/** `text` cut to `max` characters, an ellipsis marking the cut. */
function fit(text, max) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** The external id of a child's calendar: `ext:<integration>:<user>:child-<dossier>-<child>`. */
export function calendarExternalId(gladys, userSelector, dossierId, childId) {
  return gladys.externalId(`${userSelector}:child-${dossierId}-${childId}`);
}

/** The external id of a booked day: `ext:<integration>:<user>:booking-<dossier>-<child>-<day>`. */
export function eventExternalId(gladys, userSelector, dossierId, childId, day) {
  return gladys.externalId(`${userSelector}:booking-${dossierId}-${childId}-${day}`);
}

/** The address of the portal's sign-in page for a structure. */
export function portalAddress(dossierId) {
  return `${PORTAL_URL}/index.html?dossier=${encodeURIComponent(dossierId)}`;
}

/**
 * The calendars of one user: one per child, named after the child.
 * @param {object} gladys the SDK client (for the external ids)
 * @param {{ selector: string, language?: string | null }} user
 * @param {Awaited<ReturnType<typeof import('./inoe/planning.js').readPlanning>>} planning
 */
export function buildCalendars(gladys, user, planning) {
  const { dossier } = planning;
  return planning.children.map((child, index) => ({
    external_id: calendarExternalId(gladys, user.selector, dossier.id, child.id),
    name: fit(`${child.name} – iNoé`, MAX_CALENDAR_NAME),
    description: fit(
      pick(user.language, {
        en: `Bookings of ${child.name} on the iNoé Espace Famille portal (${dossier.name}).`,
        fr: `Réservations de ${child.name} sur l'Espace Famille iNoé (${dossier.name}).`,
        de: `Buchungen von ${child.name} im iNoé-Familienportal (${dossier.name}).`,
        es: `Reservas de ${child.name} en el portal iNoé Espace Famille (${dossier.name}).`,
      }),
      MAX_CALENDAR_DESCRIPTION,
    ),
    color: COLORS[index % COLORS.length],
  }));
}

/**
 * The events of one child: one full-day event per booked day.
 * "Léa – Accueil de loisirs : Matin, Repas, Après-midi".
 * @param {object} gladys the SDK client (for the external ids)
 * @param {{ selector: string }} user
 * @param {{ id: string, name: string }} dossier
 * @param {import('./inoe/planning.js').ChildPlanning} child a child whose planning was read
 */
export function buildEvents(gladys, user, dossier, child) {
  return child.days.map(([day, bookings]) => {
    const summary = describeBookings(bookings);
    return {
      external_id: eventExternalId(gladys, user.selector, dossier.id, child.id, day),
      name: fit(`${child.name} – ${summary}`, MAX_EVENT_NAME),
      start: day,
      // Exclusive, as iCalendar has it: the event covers `day` alone.
      end: addDays(day, 1),
      full_day: true,
      location: fit(dossier.name, MAX_EVENT_LOCATION),
      // One line per activity: "Accueil de loisirs : Matin, Repas".
      description: fit(summary.split(' · ').join('\n'), MAX_EVENT_DESCRIPTION),
      url: portalAddress(dossier.id),
    };
  });
}

/**
 * The window a child's events replace, from the first day to the last day read.
 *
 * Gladys stores a full-day event between two midnights of ITS time zone, and
 * prunes the events overlapping the window that the list does not carry. The
 * bounds sit at 11:00 UTC: in every time zone of France, from UTC-10 (French
 * Polynesia) to UTC+12 (Wallis and Futuna), that instant falls inside the
 * first and the last day, so the window catches every day read — and never
 * yesterday (kept as history) nor the day after the last one.
 * @param {{ from: string, to: string }} days YYYY-MM-DD, inclusive
 */
export function pruneWindow({ from, to }) {
  return { from: `${from}T11:00:00.000Z`, to: `${to}T11:00:00.000Z` };
}
