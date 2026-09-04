# WoW Reroll Hub

Application de bureau + addon WoW pour piloter un roster multi-personnages **sans avoir à se connecter en jeu sur chaque perso**.

- L'**application** se connecte à ton compte Battle.net (comme Raider.IO), récupère la liste complète de tes personnages et, pour chacun, l'équipement, les statistiques, le score Mythique+, la progression raid et les métiers.
- Tu y colles tes rapports **Droptimizer** de Raidbots : l'app classe tes contenus (raid HM, raid mythique, donjons…) par potentiel de gain et te dit lequel focus sur ce perso.
- L'**addon** `RerollHelper` reçoit ce récap et l'affiche en jeu via `/rh`.

L'application et l'addon sont disponibles en **français et en anglais** (*Réglages → Langue de l'application*, l'addon suit ce choix au prochain export).

```
Projet app reroll wow/
├─ app/                     Application Electron + React + TypeScript
│  └─ src/
│     ├─ main/              Process principal : OAuth, API Blizzard, export
│     ├─ preload/           Pont IPC sécurisé
│     ├─ renderer/          Interface React
│     └─ shared/            Types et logique partagés app ↔ export
└─ addon/RerollHelper/      Addon Lua installé dans Interface/AddOns
```

---

## 1. Lancer l'application

```bash
cd app
npm install
npm run dev          # développement, rechargement à chaud
```

## 1 bis. Créer l'exécutable (pour ne plus passer par le terminal)

```bash
cd app
npm run dist
```

Deux fichiers apparaissent dans `app/release/` :

| Fichier | Usage |
| --- | --- |
| `WoW-Reroll-Hub-Setup-0.1.0.exe` | **Installeur.** Il installe l'app pour ton utilisateur (pas besoin d'être administrateur), crée un raccourci sur le bureau et une entrée dans le menu Démarrer, et s'ajoute à « Applications et fonctionnalités » pour la désinstallation. |
| `WoW-Reroll-Hub-portable-0.1.0.exe` | **Portable.** Un seul fichier, aucune installation : tu le poses où tu veux (clé USB comprise) et tu double-cliques. |

Les deux embarquent l'addon : l'export fonctionne sans garder le dossier du projet.

Tes réglages et tes données restent dans `%APPDATA%/wow-reroll-hub/`, donc une réinstallation ou une mise à jour ne te fait pas repartir de zéro — et la désinstallation ne les efface pas.

> **Avertissement Windows au premier lancement.** L'exécutable n'est pas signé numériquement (une signature de code coûte plusieurs centaines d'euros par an). SmartScreen affichera donc « Windows a protégé votre ordinateur » : clique sur *Informations complémentaires* puis *Exécuter quand même*. C'est le comportement normal de tout logiciel non signé.

L'icône est générée par script, sans dépendance graphique :

```bash
npm run make-icon    # régénère app/resources/icon.ico
```

## 2. Créer ses identifiants Battle.net (une seule fois)

L'API Blizzard exige un client OAuth. Il est gratuit et se crée en une minute — c'est exactement le mécanisme que Raider.IO utilise, à ceci près qu'ici le client t'appartient et que rien ne transite par un serveur tiers.

1. Ouvre <https://develop.battle.net/access/clients> et connecte-toi.
2. **Create Client**. Nom libre (ex. « Reroll Hub »).
3. Dans **Redirect URLs**, colle exactement : `http://localhost:8710/callback`
4. Laisse le reste par défaut, valide.
5. Copie le **Client ID** et le **Client Secret** dans l'onglet *Réglages* de l'application.
6. Clique **Se connecter avec Battle.net** : l'autorisation s'ouvre dans ton navigateur, tu acceptes, l'app récupère la session.

Le secret est chiffré au repos avec DPAPI (Windows) et n'est transmis qu'à Blizzard.

> **Portée demandée :** `wow.profile` uniquement — lecture seule des personnages du compte. Aucune action n'est possible sur ton compte.

## 3. Synchroniser

Bouton **Synchroniser le compte** en bas de la liste. L'app interroge :

| Donnée | Endpoint Blizzard |
| --- | --- |
| Liste de tous les persos du compte | `/profile/user/wow` |
| Résumé (ilvl, spé, guilde, faction) | `/profile/wow/character/{royaume}/{nom}` |
| Équipement, enchantements, châsses, tier | `…/equipment` |
| Statistiques secondaires | `…/statistics` |
| Score et clés Mythique+ | `…/mythic-keystone-profile` |
| Progression raid | `…/encounters/raids` |
| Métiers | `…/professions` |
| Objet → boss qui le fait tomber | `/data/wow/journal-instance`, `/data/wow/journal-encounter` |

Un perso en échec (renommé, transféré, supprimé) n'interrompt pas la synchro : il est signalé et les autres passent quand même.

Le niveau minimum est réglable pour ne pas synchroniser les persos-banque.

## 4. Importer un Droptimizer

Dans la fiche d'un perso, section **Droptimizer** :

1. Lance une simulation **Droptimizer** sur <https://www.raidbots.com/simbot/droptimizer> depuis le jeu (`/simc`), une par contenu que tu veux comparer (raid héroïque, raid mythique, donjons…).
2. Colle le lien du rapport (`https://www.raidbots.com/simbot/report/XXXX`) dans le champ, puis **Importer**.
3. Renomme l'étiquette de contenu si besoin — deux rapports partageant la même étiquette sont regroupés dans une seule priorité.

Le classement affiché trie les contenus sur la **moyenne des trois meilleurs gains**, pas sur le pic : un contenu qui lâche cinq objets à +4 % vaut mieux qu'un contenu avec un seul objet à +8 %.

### Meilleure pièce par slot

Sous le classement, la vue **Meilleur par slot** ne garde qu'une ligne par emplacement — deux pour les anneaux et les bijoux, puisque deux s'équipent. Un droptimizer renvoie facilement dix colliers concurrents alors qu'un seul se porte : la question utile est « quelle pièce viser pour ce slot », pas « quels sont les dix meilleurs objets ». Le compteur à droite du nom du slot indique combien d'objets étaient en lice.

L'onglet **Tous les objets** conserve la liste complète, rapport par rapport.

### D'où tombe chaque objet

Chaque amélioration affiche son gain en **pourcentage et en dps absolu**, ainsi que le **boss et le donjon/raid** qui la font tomber. Le pourcentage reste la lecture principale — c'est lui qui se compare d'un personnage à l'autre — mais le dps donne l'ordre de grandeur réel du gain. L'association vient du journal des aventures de Blizzard (`/data/wow/journal-*`), la seule source officielle qui relie un identifiant d'objet à sa rencontre.

L'index est construit automatiquement au premier import, puis mis en cache. Il couvre les deux dernières extensions. S'il manque des sources, *Réglages → Index du butin → Reconstruire l'index*.

**Si le rapport a expiré** (Raidbots purge les rapports gratuits au bout d'un mois) : bascule le champ en mode **JSON** et colle le contenu du `data.json` du rapport, que tu peux télécharger depuis la page Raidbots tant qu'elle est vivante.

Les objets sont identifiés par leur item ID puis résolus via l'API Blizzard (nom et slot), avec un cache local — le format interne de Raidbots peut changer sans casser l'import.

## 5. Exporter vers l'addon

Onglet **Export addon** :

1. Ferme WoW (ou prévois un `/reload` : le jeu ne relit les fichiers Lua qu'au chargement).
2. **Exporter maintenant**. L'app copie l'addon dans `…/_retail_/Interface/AddOns/RerollHelper/` et y écrit `Data/Export.lua`.
3. En jeu, active *Reroll Helper* dans la liste des addons, puis `/rh`.

L'export automatique après chaque synchro est activé par défaut (désactivable dans les Réglages).

### Commandes de l'addon

| Commande | Effet |
| --- | --- |
| `/rh` | Ouvre/ferme la fenêtre |
| `/rh status` | État et date des données exportées |
| `/rh help` | Aide |

La fenêtre liste tous les persos (triables par ilvl, score M+, focus, nom) et affiche pour le perso sélectionné : le contenu à focus, la meilleure pièce par slot avec le boss qui la fait tomber, les enchantements et châsses manquants, les slots en retard, la progression raid et ta note.

L'addon suit la langue choisie dans l'application. À défaut d'export, il utilise celle du client WoW (français, anglais sinon).

---

## Notes techniques

**Pourquoi une app de bureau et pas un site ?** Écrire dans `Interface/AddOns` demande un accès disque. Un addon ne peut pas non plus lire le réseau : la seule passerelle app → jeu est un fichier Lua chargé au démarrage. C'est la méthode utilisée par les outils du même genre.

**Limites connues :**
- L'API Blizzard reflète l'état du perso à sa **dernière déconnexion**, pas en temps réel. Un perso jamais connecté depuis une refonte majeure peut renvoyer un profil incomplet.
- Le jeton Battle.net dure 24 h ; il faut se reconnecter ensuite (un clic).
- L'addon cible l'interface `120100` (patch 12.1.0). À chaque patch majeur, mets à jour la ligne `## Interface:` de `addon/RerollHelper/RerollHelper.toc` : le numéro se lit `XXYYZZ` (extension, mineure, correctif), et se vérifie en jeu avec `/dump select(4, GetBuildInfo())`.
- Le sens app → addon est le seul implémenté. Remonter des données du jeu vers l'app demanderait de lire les `SavedVariables`, ce qui n'est pas nécessaire ici puisque l'API Blizzard fournit déjà tout.

**Où sont stockées les données ?** Dans `%APPDATA%/wow-reroll-hub/` : `settings.json`, `data.json` (persos et rapports), `item-cache.json`, `token.bin` (chiffré).

## Dépannage

| Symptôme | Cause / solution |
| --- | --- |
| `Error: Electron uninstall` au lancement | Le binaire Electron n'a pas été téléchargé pendant `npm install`. Lance `node node_modules/electron/install.js` depuis `app/`. |
| `Cannot read properties of undefined (reading 'requestSingleInstanceLock')` | La variable d'environnement `ELECTRON_RUN_AS_NODE` est définie (certains terminaux intégrés d'éditeurs la posent) : Electron démarre alors comme un simple Node. Lance l'app depuis un terminal normal. |
| `Le port 8710 est déjà utilisé` | Change le port dans *Réglages*, et reporte la nouvelle URL dans les Redirect URLs sur develop.battle.net. |
| `Échange du code refusé (400)` | La Redirect URL enregistrée sur develop.battle.net ne correspond pas exactement à celle affichée dans *Réglages* (le `/callback` final compte). |
| `Accès refusé au dossier AddOns` | WoW est ouvert et verrouille le dossier : ferme le jeu puis relance l'export. |
| L'addon dit « Aucune donnée exportée » | L'export a écrit ailleurs (mauvaise saveur de jeu) ou WoW n'a pas rechargé : vérifie le chemin dans *Réglages* puis fais `/reload`. |
