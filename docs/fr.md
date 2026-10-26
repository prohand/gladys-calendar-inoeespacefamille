# iNoé Espace Famille – Agenda pour Gladys

Cette intégration met les **réservations de vos enfants** sur votre **Espace Famille iNoé** (le
portail famille d'AIGA utilisé par de nombreuses communes et structures : cantine, périscolaire,
accueil de loisirs, crèche) dans l'**agenda de Gladys**.

- Un **agenda par enfant** (« Léa – iNoé »).
- Un **événement sur la journée** pour chaque jour réservé, avec tous les créneaux du jour :
  « Léa – Accueil de loisirs : Matin, Repas, Après-midi ».
- Une absence ou une place en liste d'attente n'est pas un jour réservé.
- Une réservation annulée sur le portail disparaît de l'agenda à la synchronisation suivante.
- Les jours passés restent dans l'agenda.

Le portail donne les créneaux (matin, repas, soir…), pas leurs heures : les événements durent
toute la journée.

L'intégration **ne fait que lire** : elle ne réserve, n'annule et ne paie jamais rien. C'est une
intégration **cloud** : elle passe par les serveurs d'AIGA sur Internet.

Gladys 5.3 ou plus récent est nécessaire.

> Cette intégration complète l'intégration **iNoé Espace Famille** (factures, appareils par
> enfant, déclencheurs de scène), qui reste nécessaire pour tout ce qui n'est pas l'agenda. Les
> deux peuvent être installées ensemble.

## Installation (administrateur)

Dans Gladys, ouvrez **Intégrations**, installez **iNoé Espace Famille – Agenda**. L'écran de
configuration a trois réglages, communs à tous les utilisateurs :

| Champ                         | Clé               | Ce qu'il faut mettre                                                                                           |
| ----------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Intervalle de synchronisation | `refresh_minutes` | Toutes les combien de minutes le portail est lu (60 par défaut, de 15 à 1440).                                 |
| Jours publiés à l'avance      | `days_ahead`      | Combien de jours du planning de chaque enfant vont dans l'agenda, aujourd'hui compris (31 par défaut, 7 à 92). |
| Fuseau horaire                | `timezone`        | Ce qui décide d'« aujourd'hui » : `Europe/Paris` par défaut, `Indian/Reunion`, `America/Martinique`…           |

Le bouton **Synchroniser maintenant** (`sync_now`) lit tout de suite le portail de chaque
utilisateur et donne, pour chacun, la structure et le nombre de jours réservés par enfant.

## Activer son agenda (chaque utilisateur)

Chaque utilisateur de Gladys qui veut les agendas le fait **pour lui-même**, dans le bloc
**Mes agendas** de la page de l'intégration :

| Champ              | Ce qu'il faut mettre                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adresse du portail | L'adresse de la page de connexion du portail, copiée telle quelle : `https://espacefamille.aiga.fr/index.html?dossier=1626256#connexion…` ou `https://espacefamille.aiga.fr/11578177`. Le numéro seul (`1626256`) suffit aussi. |
| E-mail             | L'e-mail avec lequel vous vous connectez au portail.                                                                                                                                                                            |
| Mot de passe       | Le mot de passe du portail. Il n'est envoyé qu'au serveur de connexion d'AIGA et n'est jamais écrit dans les journaux.                                                                                                          |

Puis cliquez sur **Activer**. Les agendas apparaissent après la première lecture (quelques
secondes).

> **Où trouver l'adresse du portail ?** Dans l'e-mail de création de compte envoyé par votre
> structure, ou dans la barre d'adresse de votre navigateur quand vous êtes sur le portail :
> c'est le nombre après `dossier=` (ou après `espacefamille.aiga.fr/`).

Pour chaque agenda, deux interrupteurs vous appartiennent :

- **Synchroniser** : éteint, l'agenda est vidé et n'est plus mis à jour. Rallumé, il est
  rempli à la synchronisation suivante.
- **Partager** : un agenda est **privé** au départ. Partagé, le foyer le voit, et il sert aux
  **scènes** (le déclencheur d'agenda de Gladys, `calendar.event-is-coming`, et les actions
  d'agenda) et à l'assistant.

Désactiver l'intégration dans **Mes agendas** supprime vos agendas iNoé de Gladys.

Un enfant qui n'est plus sur le compte du portail perd son agenda. Une lecture du portail qui ne
renvoie aucun enfant ne supprime rien.

## Exemples de scènes

- Le déclencheur d'agenda de Gladys (`calendar.event-is-coming`) sur l'agenda partagé
  « Léa – iNoé », la veille au soir : envoyer sur Telegram le nom de l'événement (« Léa –
  Périscolaire : Cantine »).
- Demander à l'assistant : « Qu'est-ce que Léa a demain ? »

## En cas de problème

L'écran de configuration affiche, pour chaque utilisateur en échec, son prénom et la cause :

| Message                                             | Que faire                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| « à renseigner dans « Mes agendas » »               | L'utilisateur complète son compte dans **Mes agendas**.                                                      |
| « cette adresse de portail est inconnue d'iNoé »    | Recopiez l'adresse depuis l'e-mail de la structure.                                                          |
| « le portail a refusé l'e-mail ou le mot de passe » | Connectez-vous sur le portail lui-même ; si le mot de passe a changé, mettez-le à jour dans **Mes agendas**. |
| « le portail iNoé est en maintenance »              | Rien à faire : nouvel essai à la prochaine synchronisation.                                                  |
| « Gladys a refusé la mise à jour de l'agenda »      | Consultez les journaux de l'intégration.                                                                     |

Quand le planning d'un enfant ne peut pas être lu, ses événements déjà dans l'agenda restent en
place ; **Synchroniser maintenant** affiche « planning illisible » pour cet enfant.

Le portail n'a pas d'API publique : l'intégration utilise les mêmes échanges que le site web.
Si AIGA change son site, une mise à jour de l'intégration peut être nécessaire.

## Confidentialité

- Seuls les utilisateurs qui ont activé l'intégration sont lus, chacun avec son propre compte.
- Le mot de passe n'est envoyé qu'à `ism.aiga.fr` (le serveur de connexion d'AIGA).
- Rien n'est envoyé ailleurs qu'aux serveurs d'AIGA et à votre Gladys. L'intégration n'écrit
  rien sur disque.
