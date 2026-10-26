// -----------------------------------------------------------------------------
// The user-facing messages: connection status and the "Sync now" answer.
//
// Every message is a `{ en, fr, de, es }` object built with `localize`, so the
// Gladys interface shows it in the reader's language (src/i18n.js). A status
// names the users whose sync failed by their first name: the administrator
// reading it knows who to ask.
// -----------------------------------------------------------------------------

import { localize, pick } from './i18n.js';
import { INOE_ERRORS } from './inoe/client.js';

/** Why a user's sync failed, outside the portal's own errors. */
export const SYNC_ERRORS = {
  MISSING: 'missing', // the account form is not complete
  GLADYS: 'gladys', // Gladys refused a calendar or its events
};

const FIELD_NAMES = {
  portal_url: {
    en: 'Portal address',
    fr: 'Adresse du portail',
    de: 'Portaladresse',
    es: 'Dirección del portal',
  },
  username: { en: 'Email', fr: 'E-mail', de: 'E-Mail', es: 'Correo electrónico' },
  password: { en: 'Password', fr: 'Mot de passe', de: 'Passwort', es: 'Contraseña' },
};

const ERROR_MESSAGES = {
  [INOE_ERRORS.NETWORK]: {
    en: 'the iNoé portal cannot be reached. Check the Internet connection of Gladys.',
    fr: 'le portail iNoé est injoignable. Vérifiez la connexion Internet de Gladys.',
    de: 'das iNoé-Portal ist nicht erreichbar. Prüfen Sie die Internetverbindung von Gladys.',
    es: 'no se puede acceder al portal iNoé. Compruebe la conexión a Internet de Gladys.',
  },
  [INOE_ERRORS.DOSSIER]: {
    en: 'this portal address is unknown to iNoé. Copy it again from the email of the structure.',
    fr: "cette adresse de portail est inconnue d'iNoé. Recopiez-la depuis l'e-mail de la structure.",
    de: 'diese Portaladresse ist iNoé unbekannt. Kopieren Sie sie erneut aus der E-Mail der Einrichtung.',
    es: 'iNoé no reconoce esta dirección de portal. Cópiela de nuevo del correo del centro.',
  },
  [INOE_ERRORS.LOGIN]: {
    en: 'the portal refused the email or the password. Check them by signing in on the portal itself.',
    fr: "le portail a refusé l'e-mail ou le mot de passe. Vérifiez-les en vous connectant au portail lui-même.",
    de: 'das Portal hat die E-Mail oder das Passwort abgelehnt. Prüfen Sie sie mit einer Anmeldung im Portal selbst.',
    es: 'el portal rechazó el correo o la contraseña. Compruébelos iniciando sesión en el propio portal.',
  },
  [INOE_ERRORS.SESSION]: {
    en: 'the portal session expired and could not be renewed. It will be retried at the next sync.',
    fr: "la session du portail a expiré et n'a pas pu être renouvelée. Nouvel essai à la prochaine synchronisation.",
    de: 'die Portalsitzung ist abgelaufen und konnte nicht erneuert werden. Neuer Versuch bei der nächsten Synchronisierung.',
    es: 'la sesión del portal caducó y no se pudo renovar. Se reintentará en la próxima sincronización.',
  },
  [INOE_ERRORS.MAINTENANCE]: {
    en: 'the iNoé portal is in maintenance. It will be retried at the next sync.',
    fr: 'le portail iNoé est en maintenance. Nouvel essai à la prochaine synchronisation.',
    de: 'das iNoé-Portal wird gewartet. Neuer Versuch bei der nächsten Synchronisierung.',
    es: 'el portal iNoé está en mantenimiento. Se reintentará en la próxima sincronización.',
  },
  [SYNC_ERRORS.GLADYS]: {
    en: 'Gladys refused the calendar update. Look at the integration logs.',
    fr: "Gladys a refusé la mise à jour de l'agenda. Consultez les journaux de l'intégration.",
    de: 'Gladys hat die Aktualisierung des Kalenders abgelehnt. Sehen Sie in den Protokollen der Integration nach.',
    es: 'Gladys rechazó la actualización del calendario. Consulte los registros de la integración.',
  },
};

const UNKNOWN_ERROR = {
  en: 'the portal gave an unexpected answer. Look at the integration logs.',
  fr: "le portail a donné une réponse inattendue. Consultez les journaux de l'intégration.",
  de: 'das Portal hat unerwartet geantwortet. Sehen Sie in den Protokollen der Integration nach.',
  es: 'el portal dio una respuesta inesperada. Consulte los registros de la integración.',
};

/**
 * What went wrong for one user, in one language, starting lower case: it
 * follows the user's name ("Julie: the portal refused...").
 * @param {string} language
 * @param {{ code?: string, missing?: string[] }} error
 */
export function errorText(language, error) {
  if (error?.code === SYNC_ERRORS.MISSING) {
    const fields = (error.missing ?? []).map((key) => pick(language, FIELD_NAMES[key])).join(', ');
    return pick(language, {
      en: `to fill in under "My calendars": ${fields}.`,
      fr: `à renseigner dans « Mes agendas » : ${fields}.`,
      de: `unter „Meine Kalender“ noch auszufüllen: ${fields}.`,
      es: `por completar en «Mis calendarios»: ${fields}.`,
    });
  }
  return pick(language, ERROR_MESSAGES[error?.code] ?? UNKNOWN_ERROR);
}

/** "Julie" in a sentence: the first name, else the selector. */
function userName(user) {
  return user.first_name || user.selector;
}

/** "Julie: …" in one language, the separator of that language included. */
function namedLine(language, user, text) {
  return `${userName(user)}${language === 'fr' ? ' : ' : ': '}${text}`;
}

/**
 * The status of the Configuration screen after a sync of every user.
 * @param {{ user: object, error?: object }[]} results
 * @returns {{ connected: boolean, message?: Record<string, string> }}
 */
export function connectionStatus(results) {
  if (results.length === 0) {
    return {
      connected: true,
      message: localize((language) =>
        pick(language, {
          en: 'No user has enabled the integration yet: each one does it under "My calendars".',
          fr: "Aucun utilisateur n'a encore activé l'intégration : chacun le fait dans « Mes agendas ».",
          de: 'Noch kein Benutzer hat die Integration aktiviert: Jeder tut das unter „Meine Kalender“.',
          es: 'Ningún usuario ha activado aún la integración: cada uno lo hace en «Mis calendarios».',
        }),
      ),
    };
  }
  const failed = results.filter((result) => result.error);
  if (failed.length === 0) {
    return { connected: true };
  }
  return {
    connected: false,
    message: localize((language) =>
      failed
        .map((result) => namedLine(language, result.user, errorText(language, result.error)))
        .join(' '),
    ),
  };
}

/** The answer of "Sync now": what each user's sync did, in a few lines. */
export function syncReport(results) {
  if (results.length === 0) {
    return connectionStatus(results).message;
  }
  return localize((language) => {
    const t = (texts) => pick(language, texts);
    return results
      .map((result) => {
        if (result.error) {
          return namedLine(language, result.user, errorText(language, result.error));
        }
        const children = result.children.map((child) =>
          child.bookedDays === null
            ? t({
                en: `${child.name} planning unreadable`,
                fr: `${child.name} planning illisible`,
                de: `${child.name} Planung nicht lesbar`,
                es: `${child.name} planificación ilegible`,
              })
            : t({
                en: `${child.name} ${child.bookedDays} day(s) booked`,
                fr: `${child.name} ${child.bookedDays} jour(s) réservé(s)`,
                de: `${child.name} ${child.bookedDays} Tag(e) gebucht`,
                es: `${child.name} ${child.bookedDays} día(s) reservado(s)`,
              }),
        );
        const summary =
          children.length > 0
            ? children.join(', ')
            : t({
                en: 'no child found on this account',
                fr: 'aucun enfant trouvé sur ce compte',
                de: 'kein Kind in diesem Konto gefunden',
                es: 'no se encontró ningún niño en esta cuenta',
              });
        return namedLine(
          language,
          result.user,
          `${result.dossier.name}, ${summary} (${t({
            en: `next ${result.days} days`,
            fr: `${result.days} prochains jours`,
            de: `nächste ${result.days} Tage`,
            es: `próximos ${result.days} días`,
          })}).`,
        );
      })
      .join(' ');
  });
}
