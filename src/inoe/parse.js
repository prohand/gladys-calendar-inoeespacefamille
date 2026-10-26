// -----------------------------------------------------------------------------
// Turn the portal's answers into plain values.
//
// The iNoé payloads are the value objects of its web application
// (PointageEventVO, EnfantResumeVO...). Dates arrive as "Y-m-d" or
// "Y-m-dTH:i:s" in the structure's local time, and a field the structure does
// not use is often null. Everything here is tolerant: a value
// that cannot be read becomes null, never an exception that would stop the
// whole refresh.
// -----------------------------------------------------------------------------

/** "2026-10-27" out of "2026-10-27", "2026-10-27T00:00:00" or "27/10/2026". */
export function parseDay(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const french = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
  return french ? `${french[3]}-${french[2]}-${french[1]}` : null;
}

/** The calendar day of `date` in `timezone`, as YYYY-MM-DD. */
export function localDay(date, timezone) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** `day` (YYYY-MM-DD) plus `count` days. */
export function addDays(day, count) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

/**
 * The children of the family, from the dashboard's `familleVO.listeEnfants`.
 * The list also carries the parents (`parent: true`) and the "add someone"
 * placeholder (id <= 0): neither has a planning of its own here.
 */
export function normalizeChildren(dashboard) {
  const list = dashboard?.familleVO?.listeEnfants;
  return (Array.isArray(list) ? list : [])
    .filter((person) => Number(person?.id) > 0 && person.parent !== true)
    .map((person) => ({
      id: String(person.id),
      firstName: String(person.prenom ?? '').trim(),
      lastName: String(person.nom ?? '').trim(),
    }));
}

const PRESENT_WORDS = ['p', 'presence', 'présence', 'present', 'présent', 'true', 'o', 'oui', '1'];

/**
 * Whether a planning event is a place the child will take: a booking or a
 * planned presence, not an absence, a cancellation or a waiting list.
 *
 * The event carries the palette it was given (`nouvellePalette`, else the one
 * it had, `anciennePalette`); the palette says whether it means presence.
 * The flag's type is not documented: a boolean, a 0/1 or a letter are all
 * read, and a palette without the flag counts as presence (the planning only
 * holds events for the slots something was booked on).
 */
export function isBooked(event) {
  if (!event || event.toDelete === true || event.listeAttente === true) {
    return false;
  }
  const palette = event.nouvellePalette ?? event.anciennePalette ?? null;
  if (!palette) {
    return false;
  }
  const { presence } = palette;
  if (presence === undefined || presence === null) {
    return true;
  }
  if (typeof presence === 'boolean') {
    return presence;
  }
  if (typeof presence === 'number') {
    return presence > 0;
  }
  return PRESENT_WORDS.includes(String(presence).trim().toLowerCase());
}

/**
 * The rows of the planning, as the portal's calendar draws them: one row per
 * slot of an activity (Morning, Lunch, Afternoon...), keyed like the calendar
 * matches an event to its row — activity, slot and tariff.
 *
 * `periodeIntitule` names the activity (the calendar's group header) and
 * `abreviation` the slot (the row label); `intitule` is the fallback of both.
 * The order is the portal's: the rows come sorted as the calendar shows them.
 */
export function planningRows(slots) {
  const rows = new Map();
  (Array.isArray(slots) ? slots : []).forEach((slot, order) => {
    const activity = String(slot?.periodeIntitule ?? '').trim();
    const name = String(slot?.abreviation || slot?.intitule || '').trim();
    const row = { activity, slot: name, order };
    const keys = [
      rowKey(slot?.idActivite, slot?.plageFonctionnementId, slot?.tarifId),
      rowKey(slot?.idActivite, slot?.plageFonctionnementId),
      rowKey(slot?.idActivite),
    ];
    for (const key of keys) {
      if (!rows.has(key)) {
        rows.set(key, row);
      }
    }
  });
  return rows;
}

function rowKey(...ids) {
  return ids.map((id) => (id === undefined || id === null ? '' : String(id))).join('|');
}

/** The row of an event: its exact slot, else what is known of its activity. */
function rowOf(rows, event) {
  const exact =
    rows.get(rowKey(event.idActivite, event.plageFonctionnement_id, event.tarif_id)) ??
    rows.get(rowKey(event.idActivite, event.plageFonctionnement_id));
  if (exact) {
    return exact;
  }
  // A slot the planning does not list: name the activity, never the first
  // slot of the activity (that read a full day as "Morning").
  const anyRow = rows.get(rowKey(event.idActivite));
  if (anyRow?.activity) {
    return { activity: anyRow.activity, slot: '', order: anyRow.order };
  }
  return { activity: '', slot: `#${event.idActivite}`, order: Infinity };
}

/**
 * @typedef {{ activity: string, slot: string, order: number }} Booking
 * One slot booked: "Accueil de loisirs" / "Matin".
 */

/** The key a booking is remembered and compared by. */
export function bookingKey(booking) {
  return `${booking.activity}|${booking.slot}`;
}

/**
 * The bookings of one child, day by day: every slot booked, in the order of
 * the portal's calendar. A full day reads as all its slots (morning, lunch,
 * afternoon), never as the first one alone.
 * @param {{ events: object[], slots: object[] }} planning
 * @returns {Map<string, Booking[]>} day (YYYY-MM-DD) -> slots booked
 */
export function bookingsByDay({ events, slots }) {
  const rows = planningRows(slots);
  const days = new Map();
  for (const event of Array.isArray(events) ? events : []) {
    const day = parseDay(event?.date);
    if (!day || !isBooked(event)) {
      continue;
    }
    const { activity, slot, order } = rowOf(rows, event);
    const booking = { activity, slot, order };
    const list = days.get(day) ?? [];
    if (!list.some((other) => bookingKey(other) === bookingKey(booking))) {
      list.push(booking);
    }
    days.set(
      day,
      list.sort((a, b) => a.order - b.order || bookingKey(a).localeCompare(bookingKey(b))),
    );
  }
  return days;
}

/**
 * The bookings of a day in full: "Accueil de loisirs : Matin, Repas,
 * Après-midi · Garderie : Soir". "-" when there is none.
 * @param {Booking[]} bookings
 */
export function describeBookings(bookings) {
  if (!bookings || bookings.length === 0) {
    return '-';
  }
  const groups = new Map();
  for (const { activity, slot } of bookings) {
    const list = groups.get(activity) ?? [];
    if (slot) {
      list.push(slot);
    }
    groups.set(activity, list);
  }
  return [...groups.entries()]
    .map(([activity, list]) => {
      if (!activity) {
        return list.join(', ');
      }
      return list.length > 0 ? `${activity} : ${list.join(', ')}` : activity;
    })
    .join(' · ');
}
