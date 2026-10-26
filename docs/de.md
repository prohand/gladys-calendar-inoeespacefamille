# iNoé Espace Famille – Agenda für Gladys

Diese Integration bringt die **Buchungen Ihrer Kinder** in Ihrem **iNoé-Familienportal** (dem
Familienportal von AIGA, das viele französische Gemeinden und Einrichtungen nutzen: Kantine,
Hort, Freizeitzentrum, Krippe) in den **Kalender von Gladys**.

- Ein **Kalender pro Kind** („Léa – iNoé“).
- Ein **ganztägiger Termin** pro gebuchtem Tag, mit allen Zeitfenstern des Tages:
  „Léa – Accueil de loisirs : Matin, Repas, Après-midi“.
- Eine Abwesenheit oder ein Wartelistenplatz ist kein gebuchter Tag.
- Eine im Portal stornierte Buchung verschwindet bei der nächsten Synchronisierung.
- Vergangene Tage bleiben im Kalender.

Das Portal liefert die Zeitfenster (Morgen, Mittagessen, Abend…), nicht ihre Uhrzeiten: Die
Termine dauern den ganzen Tag.

Die Integration **liest nur**: Sie bucht, storniert oder bezahlt nie etwas. Sie ist eine
**Cloud**-Integration: Sie spricht über das Internet mit den Servern von AIGA.

Gladys 5.3 oder neuer ist erforderlich.

> Diese Integration ergänzt die Integration **iNoé Espace Famille** (Rechnungen, ein Gerät pro
> Kind, Szenenauslöser), die für alles außer dem Kalender weiterhin nötig ist. Beide können
> nebeneinander installiert werden.

## Installation (Administrator)

Öffnen Sie in Gladys **Integrationen** und installieren Sie **iNoé Espace Famille – Agenda**.
Der Konfigurationsbildschirm hat drei Einstellungen, die für alle Benutzer gelten:

| Feld                           | Schlüssel         | Was einzutragen ist                                                                                                |
| ------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| Synchronisierungsintervall     | `refresh_minutes` | Wie oft das Portal gelesen wird, in Minuten (standardmäßig 60, 15 bis 1440).                                       |
| Im Voraus veröffentlichte Tage | `days_ahead`      | Wie viele Tage der Planung jedes Kindes in den Kalender kommen, heute eingeschlossen (standardmäßig 31, 7 bis 92). |
| Zeitzone                       | `timezone`        | Was „heute“ bestimmt: standardmäßig `Europe/Paris`, `Indian/Reunion`, `America/Martinique`…                        |

Die Schaltfläche **Jetzt synchronisieren** (`sync_now`) liest sofort das Portal jedes Benutzers
und nennt für jeden die Einrichtung und die Zahl der gebuchten Tage pro Kind.

## Den eigenen Kalender aktivieren (jeder Benutzer)

Jeder Gladys-Benutzer, der die Kalender möchte, tut das **für sich selbst** im Block
**Meine Kalender** der Integrationsseite:

| Feld          | Was einzutragen ist                                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portaladresse | Die Adresse der Anmeldeseite des Portals, unverändert eingefügt: `https://espacefamille.aiga.fr/index.html?dossier=1626256#connexion…` oder `https://espacefamille.aiga.fr/11578177`. Die Nummer allein genügt auch. |
| E-Mail        | Die E-Mail, mit der Sie sich im Portal anmelden.                                                                                                                                                                     |
| Passwort      | Das Passwort des Portals. Es wird nur an den Anmeldeserver von AIGA gesendet und nie in die Protokolle geschrieben.                                                                                                  |

Klicken Sie dann auf **Aktivieren**. Die Kalender erscheinen nach dem ersten Lesen (wenige
Sekunden).

> **Wo steht die Portaladresse?** In der E-Mail zur Kontoerstellung Ihrer Einrichtung oder in
> der Adressleiste Ihres Browsers im Portal: die Nummer nach `dossier=` (oder nach
> `espacefamille.aiga.fr/`).

Zwei Schalter jedes Kalenders gehören Ihnen:

- **Synchronisieren**: aus, wird der Kalender geleert und nicht mehr aktualisiert. Wieder an,
  wird er bei der nächsten Synchronisierung gefüllt.
- **Teilen**: Ein Kalender ist anfangs **privat**. Geteilt sieht ihn der Haushalt, und er
  erreicht die **Szenen** (den Kalenderauslöser von Gladys, `calendar.event-is-coming`, und die
  Kalenderaktionen) und den Assistenten.

Das Deaktivieren der Integration unter **Meine Kalender** entfernt Ihre iNoé-Kalender aus
Gladys.

Ein Kind, das nicht mehr im Portalkonto steht, verliert seinen Kalender. Ein Lesen des Portals
ohne jedes Kind löscht nichts.

## Szenenideen

- Der Kalenderauslöser von Gladys (`calendar.event-is-coming`) auf dem geteilten Kalender
  „Léa – iNoé“, am Vorabend: den Namen des Termins per Telegram senden
  („Léa – Périscolaire : Cantine“).
- Den Assistenten fragen: „Was hat Léa morgen?“

## Fehlerbehebung

Der Konfigurationsbildschirm zeigt für jeden Benutzer, dessen Synchronisierung fehlschlug,
seinen Vornamen und die Ursache:

| Meldung                                                 | Was zu tun ist                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| „unter „Meine Kalender“ noch auszufüllen“               | Der Benutzer vervollständigt sein Konto unter **Meine Kalender**.                                                        |
| „diese Portaladresse ist iNoé unbekannt“                | Kopieren Sie die Adresse erneut aus der E-Mail der Einrichtung.                                                          |
| „das Portal hat die E-Mail oder das Passwort abgelehnt“ | Melden Sie sich im Portal selbst an; wenn sich das Passwort geändert hat, aktualisieren Sie es unter **Meine Kalender**. |
| „das iNoé-Portal wird gewartet“                         | Nichts zu tun: Neuer Versuch bei der nächsten Synchronisierung.                                                          |
| „Gladys hat die Aktualisierung des Kalenders abgelehnt“ | Sehen Sie in den Protokollen der Integration nach.                                                                       |

Kann die Planung eines Kindes nicht gelesen werden, bleiben seine Termine im Kalender;
**Jetzt synchronisieren** zeigt „Planung nicht lesbar“ für dieses Kind.

Das Portal hat keine öffentliche API: Die Integration nutzt dieselben Abläufe wie die Website.
Ändert AIGA seine Website, kann ein Update der Integration nötig sein.

## Datenschutz

- Nur die Benutzer, die die Integration aktiviert haben, werden gelesen, jeder mit seinem
  eigenen Konto.
- Das Passwort wird nur an `ism.aiga.fr` (den Anmeldeserver von AIGA) gesendet.
- Nichts wird anderswohin gesendet als an die Server von AIGA und an Ihr Gladys. Die Integration
  schreibt nichts auf die Festplatte.
