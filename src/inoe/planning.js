// -----------------------------------------------------------------------------
// One read of a family's planning.
//
// A sync reads the dashboard (the children of the family), then the planning
// of every child over the window, and builds the plain object the calendar
// code turns into calendars and events. Nothing else talks to the portal.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { bookingsByDay, normalizeChildren } from './parse.js';

const logger = createLogger({ name: 'planning' });

/**
 * @typedef {object} ChildPlanning
 * @property {string} id the iNoé id of the child
 * @property {string} name the first name, else the last name, else `#<id>`
 * @property {[string, import('./parse.js').Booking[]][] | null} days the days
 *   with at least one booking, oldest first; null when the planning could not
 *   be read (nothing must then be published for this child)
 */

/**
 * Read the children and their bookings between two days (YYYY-MM-DD, inclusive).
 * @param {import('./client.js').InoeClient} client
 * @param {{ from: string, to: string }} window
 * @returns {Promise<{ dossier: { id: string, code: string, name: string }, children: ChildPlanning[] }>}
 */
export async function readPlanning(client, { from, to }) {
  const dossier = client.dossier ?? (await client.loadDossier());
  const dashboard = (await client.dashboard()) ?? {};
  const children = [];
  for (const child of normalizeChildren(dashboard)) {
    const name = child.firstName || child.lastName || `#${child.id}`;
    try {
      const bookings = bookingsByDay(await client.planning(child.id, from, to));
      const days = [...bookings.entries()]
        .filter(([day, list]) => day >= from && day <= to && list.length > 0)
        .sort(([a], [b]) => a.localeCompare(b));
      children.push({ id: child.id, name, days });
    } catch (err) {
      // One child's planning failing (an activity the structure closed, a
      // timeout) must not hide the other children.
      logger.warn(`Planning of child ${child.id} could not be read: ${err.message}`);
      children.push({ id: child.id, name, days: null });
    }
  }
  return { dossier, children };
}
