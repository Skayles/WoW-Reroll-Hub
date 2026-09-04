/**
 * Traduction de l'application (français / anglais).
 *
 * Le français reste la langue de référence : une clé absente de l'anglais y
 * retombe plutôt que d'afficher la clé brute. Les paramètres sont interpolés
 * avec la syntaxe {nom}.
 *
 * Les messages d'erreur du process main passent aussi par ici, puisqu'ils
 * remontent tels quels dans l'interface.
 */

export type Lang = 'fr' | 'en'

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' }
]

export type Dict = Record<string, string>

const fr: Dict = {
  // -- général
  'app.name': 'WoW Reroll Hub',
  'common.loading': 'Chargement…',
  'common.cancel': 'Annulé.',
  'common.unknown': 'Inconnue',
  'common.never': 'jamais',
  'common.none': '—',
  'common.close': 'Fermer',
  'common.characters': '{count} personnages',

  // -- onglets
  'tab.character': 'Personnage',
  'tab.export': 'Export addon',
  'tab.settings': 'Réglages',

  // -- roster
  'roster.search': 'Rechercher un perso, un royaume…',
  'roster.sort.ilvl': 'Trier par ilvl',
  'roster.sort.mplus': 'Trier par score M+',
  'roster.sort.level': 'Trier par niveau',
  'roster.sort.name': 'Trier par nom',
  'roster.group.pinned': 'Épinglés',
  'roster.group.normal': 'Personnages',
  'roster.group.hidden': 'Masqués',
  'roster.empty': "Aucun personnage synchronisé pour l'instant.",
  'roster.connected': 'Connecté',
  'roster.disconnected': 'Non connecté',
  'roster.sync': 'Synchroniser le compte',
  'roster.syncing': 'Synchronisation…',
  'roster.lastSync': 'Dernière synchro : {date}',
  'roster.count': '{count} perso{s}',

  // -- fiche personnage
  'char.empty.title': 'Aucun personnage',
  'char.empty.body':
    'Connecte-toi à Battle.net dans Réglages, puis lance une synchronisation : tous les persos du compte apparaîtront ici sans avoir à te connecter en jeu sur chacun.',
  'char.pin': 'Épingler',
  'char.unpin': 'Désépingler',
  'char.hide': 'Masquer',
  'char.show': 'Réafficher',
  'char.hideHint':
    "Un perso masqué reste en base mais sort de la liste et de l'export addon.",
  'char.resync': 'Resynchroniser',
  'char.resynced': '{name} resynchronisé.',
  'char.kpi.ilvl': 'Ilvl équipé',
  'char.kpi.ilvlMax': 'Ilvl max',
  'char.kpi.mplus': 'Score M+',
  'char.kpi.tier': 'Set de tier',
  'char.kpi.level': 'Niveau',
  'char.kpi.focus': 'Focus conseillé',
  'char.gear': 'Équipement',
  'char.gear.count': '{count} pièces',
  'char.gear.empty': "Aucun équipement remonté par l'API.",
  'char.gear.noEnchant': 'sans ench.',
  'char.gear.emptySocket': '{count} châsse vide',
  'char.gear.emptySockets': '{count} châsses vides',
  'char.gear.tier': 'tier',
  'char.stats': 'Statistiques',
  'char.stats.empty': 'Statistiques indisponibles pour ce personnage.',
  'char.issues': 'À corriger',
  'char.issues.hint': 'gains gratuits, avant tout farm',
  'char.issues.none': 'Rien à signaler : enchantements et châsses sont à jour.',
  'char.issues.weakSlots': 'Slots en retard : {slots}',
  'char.raids': 'Progression raid',
  'char.professions': 'Métiers',
  'char.note': 'Note',
  'char.note.hint': "exportée vers l'addon",
  'char.note.placeholder': 'Ex : reroll main si tier 4p, sinon rester alt M+',
  'char.partialSync': 'Synchro partielle — {details}',

  // -- statistiques
  'stat.stamina': 'Endurance',
  'stat.health': 'Points de vie',
  'stat.crit': 'Critique',
  'stat.haste': 'Hâte',
  'stat.mastery': 'Maîtrise',
  'stat.versatility': 'Polyvalence',
  'stat.armor': 'Armure',
  'stat.dodge': 'Esquive',
  'stat.parry': 'Parade',
  'stat.block': 'Blocage',
  'stat.strength': 'Force',
  'stat.agility': 'Agilité',
  'stat.intellect': 'Intelligence',

  // -- rôles et factions
  'role.TANK': 'Tank',
  'role.HEALER': 'Soigneur',
  'role.DAMAGE': 'DPS',
  'faction.ALLIANCE': 'Alliance',
  'faction.HORDE': 'Horde',
  'faction.NEUTRAL': 'Neutre',

  // -- slots d'équipement (personnage)
  'slot.HEAD': 'Tête',
  'slot.NECK': 'Cou',
  'slot.SHOULDER': 'Épaules',
  'slot.BACK': 'Dos',
  'slot.CHEST': 'Torse',
  'slot.SHIRT': 'Chemise',
  'slot.TABARD': 'Tabard',
  'slot.WRIST': 'Poignets',
  'slot.HANDS': 'Mains',
  'slot.WAIST': 'Taille',
  'slot.LEGS': 'Jambes',
  'slot.FEET': 'Pieds',
  'slot.FINGER_1': 'Anneau 1',
  'slot.FINGER_2': 'Anneau 2',
  'slot.TRINKET_1': 'Bijou 1',
  'slot.TRINKET_2': 'Bijou 2',
  'slot.MAIN_HAND': 'Main droite',
  'slot.OFF_HAND': 'Main gauche',

  // -- groupes de slots (objets simulés)
  'slotGroup.HEAD': 'Tête',
  'slotGroup.NECK': 'Cou',
  'slotGroup.SHOULDER': 'Épaules',
  'slotGroup.BACK': 'Dos',
  'slotGroup.CHEST': 'Torse',
  'slotGroup.WRIST': 'Poignets',
  'slotGroup.HANDS': 'Mains',
  'slotGroup.WAIST': 'Taille',
  'slotGroup.LEGS': 'Jambes',
  'slotGroup.FEET': 'Pieds',
  'slotGroup.FINGER': 'Anneaux',
  'slotGroup.TRINKET': 'Bijoux',
  'slotGroup.WEAPON': 'Arme',
  'slotGroup.OFFHAND': 'Main gauche',
  'slotGroup.SHIRT': 'Chemise',
  'slotGroup.TABARD': 'Tabard',
  'slotGroup.OTHER': 'Autre',

  // -- droptimizer
  'dropt.title': 'Droptimizer',
  'dropt.hint': 'quel contenu farmer en priorité sur {name}',
  'dropt.placeholder.url': 'https://www.raidbots.com/simbot/report/…',
  'dropt.placeholder.json':
    'Colle ici le contenu du fichier data.json du rapport Raidbots…',
  'dropt.import': 'Importer',
  'dropt.importing': 'Import…',
  'dropt.imported': 'Droptimizer importé.',
  'dropt.mode.link': 'Lien',
  'dropt.mode.json': 'JSON',
  'dropt.mode.hint':
    'Utile si le rapport a expiré côté Raidbots : télécharge son data.json et colle-le ici.',
  'dropt.empty':
    'Aucun droptimizer importé. Lance une simulation Droptimizer sur raidbots.com pour ce perso (une par contenu : raid héroïque, raid mythique, donjons…), puis colle le lien du rapport ci-dessus. Le classement des contenus apparaîtra ici.',
  'dropt.focus.first': 'À focus en priorité',
  'dropt.focus.rank': 'Priorité {rank}',
  'dropt.focus.upgrades': '{count} amélioration{s}',
  'dropt.focus.best': 'meilleur : {item}',
  'dropt.focus.top3': 'moy. top 3',
  'dropt.focus.peak': 'pic +{value}%',
  'dropt.gainDps': '+{value} dps',
  'dropt.view.bySlot': 'Meilleur par slot',
  'dropt.view.all': 'Tous les objets',
  'dropt.bySlot.title': 'Meilleure pièce par slot',
  'dropt.bySlot.hint': 'tous rapports confondus',
  'dropt.bySlot.empty': 'Aucune amélioration trouvée dans les rapports importés.',
  'dropt.source.unknown': 'Source inconnue',
  'dropt.report.baseline': '{dps} dps de référence',
  'dropt.report.style': 'style inconnu',
  'dropt.report.targets': '{count} cible(s)',
  'dropt.report.imported': 'importé le {date}',
  'dropt.report.delete': 'Supprimer',
  'dropt.report.tagHint':
    'Étiquette de contenu : regroupe plusieurs rapports sous la même priorité.',
  'dropt.report.expand': 'Voir les {count} objets',
  'dropt.report.collapse': 'Réduire',

  // -- export
  'export.title': "Export vers l'addon",
  'export.hint': '{count} personnages seront écrits',
  'export.step1':
    'Ferme World of Warcraft (ou au minimum, prévois un /reload après l\'export : le jeu ne relit les fichiers d\'addon qu\'au chargement).',
  'export.step2':
    "Clique sur Exporter maintenant : l'application copie l'addon RerollHelper dans ton dossier Interface/AddOns et y écrit les données de tous tes persos.",
  'export.step3':
    'En jeu, active l\'addon dans la liste, puis tape /rh (ou /reroll) pour ouvrir le récapitulatif.',
  'export.run': 'Exporter maintenant',
  'export.preview': 'Aperçu du fichier',
  'export.saveAs': 'Enregistrer sous…',
  'export.saveAsHint':
    "Enregistre le même fichier ailleurs, pour le copier à la main sur une autre machine.",
  'export.openFolder': 'Ouvrir le dossier',
  'export.needPath': "Configure d'abord le dossier World of Warcraft dans Réglages.",
  'export.success': 'Export réussi : {count} personnages écrits dans l\'addon.',
  'export.failed': 'Export échoué.',
  'export.last': 'Dernier export : {path}',
  'export.noAddonSource':
    " — les fichiers de l'addon n'ont pas été trouvés à côté de l'application, seules les données ont été écrites.",
  'export.auto.ok': 'Addon mis à jour ({count} personnages).',
  'export.auto.failed': 'Export automatique échoué : {error}',
  'export.contents': "Ce que reçoit l'addon",
  'export.contents.hint': 'par personnage',
  'export.contents.identity':
    'Identité : nom, royaume, classe, spécialisation, rôle, faction, guilde, niveau.',
  'export.contents.progress':
    'Progression : ilvl équipé et maximum, score Mythique+, pièces de tier, raids.',
  'export.contents.focus':
    'Contenu à focus : classement des droptimizers importés, avec le gain moyen des trois meilleurs objets.',
  'export.contents.bySlot':
    'Meilleure pièce par slot, avec le donjon ou le boss qui la fait tomber.',
  'export.contents.fixes':
    'Correctifs : enchantements manquants, châsses vides, slots en retard.',
  'export.contents.note': 'Ta note libre écrite dans la fiche du personnage.',
  'export.previewTitle': 'Aperçu',

  // -- réglages
  'settings.auth': 'Connexion Battle.net',
  'settings.auth.hint': 'une seule fois, puis tous les persos remontent seuls',
  'settings.auth.step1':
    'Ouvre develop.battle.net/access/clients et clique sur Create Client (connexion avec ton compte Battle.net).',
  'settings.auth.step2':
    'Renseigne un nom quelconque et, dans Redirect URLs, colle exactement : {uri}',
  'settings.auth.step3':
    'Copie le Client ID et le Client Secret générés dans les champs ci-dessous, puis clique sur Se connecter.',
  'settings.clientId': 'Client ID',
  'settings.clientSecret': 'Client Secret',
  'settings.clientSecret.desc':
    'Stocké chiffré sur cette machine (DPAPI Windows) et envoyé uniquement à Blizzard.',
  'settings.port': 'Port de redirection',
  'settings.port.desc':
    'À changer seulement si le port {port} est déjà pris. Pense à mettre à jour la Redirect URL sur develop.battle.net.',
  'settings.login': 'Se connecter avec Battle.net',
  'settings.login.hint': "L'autorisation s'ouvre dans ton navigateur, comme sur Raider.IO.",
  'settings.logout': 'Se déconnecter',
  'settings.connected': 'Connecté',
  'settings.sessionUntil': 'session valide jusqu\'au {date}',
  'settings.opening': 'Autorisation ouverte dans le navigateur…',
  'oauth.page.failed': 'Connexion échouée',
  'oauth.page.ok': 'Connecté !',
  'oauth.page.okBody': 'Tu peux fermer cet onglet et revenir sur WoW Reroll Hub.',
  'settings.loggedIn': 'Connecté en tant que {battletag}.',
  'settings.loggedOut': 'Déconnecté.',
  'settings.account': 'Compte et synchronisation',
  'settings.region': 'Région',
  'settings.locale': 'Langue des données',
  'settings.locale.desc':
    'Langue des noms d\'objets et de royaumes renvoyés par Blizzard.',
  'settings.language': "Langue de l'application",
  'settings.language.desc':
    "S'applique aussi à l'addon lors du prochain export.",
  'settings.minLevel': 'Niveau minimum',
  'settings.minLevel.desc':
    'Les persos sous ce niveau sont ignorés : ça évite de synchroniser 40 banques de guilde.',
  'settings.wow': 'Dossier World of Warcraft',
  'settings.wow.path': 'Chemin',
  'settings.wow.detect': 'Détecter',
  'settings.wow.detecting': 'Recherche…',
  'settings.wow.browse': 'Parcourir…',
  'settings.wow.found': 'Installations trouvées',
  'settings.wow.notFound':
    'Aucune installation détectée automatiquement — indique le chemin à la main (le dossier qui contient _retail_).',
  'settings.wow.flavor': 'Version du jeu',
  'settings.autoExport': 'Export automatique',
  'settings.autoExport.desc': 'Réécrit les données de l\'addon après chaque synchronisation.',
  'settings.journal': 'Index du butin',
  'settings.journal.desc':
    'Associe chaque objet simulé au donjon ou au boss qui le fait tomber, à partir du journal des aventures de Blizzard. Construit automatiquement au premier import de droptimizer.',
  'settings.journal.rebuild': "Reconstruire l'index",
  'settings.journal.building': 'Construction…',
  'settings.journal.status': '{count} objets indexés, construit le {date}',
  'settings.journal.empty': 'Index non construit.',
  'settings.journal.done': 'Index du butin reconstruit : {count} objets.',

  // -- synchronisation
  'sync.account': 'Lecture du compte Battle.net…',
  'sync.done': '{count} personnages synchronisés.',
  'sync.failedSome': ' {count} en échec : {names}',
  'sync.failed': 'Synchronisation échouée.',

  // -- erreurs du process main
  'err.credentialsMissing':
    'Client ID et Client Secret Battle.net requis. Renseigne-les dans Réglages (créés sur https://develop.battle.net/access/clients).',
  'err.portInUse':
    'Le port {port} est déjà utilisé. Change le port de redirection dans Réglages (et sur develop.battle.net).',
  'err.oauthDenied': "Battle.net a refusé l'autorisation : {error}",
  'err.oauthState': 'State OAuth invalide, tentative rejetée.',
  'err.oauthNoCode': 'Aucun code renvoyé par Battle.net.',
  'err.oauthTimeout': 'Délai dépassé : aucune autorisation reçue en 5 minutes.',
  'err.tokenExchange':
    'Échange du code refusé ({status}). Vérifie que "{uri}" est bien enregistré comme Redirect URI sur develop.battle.net. {body}',
  'err.authExpired': 'Session Battle.net expirée, reconnecte-toi.',
  'err.network': 'Réseau indisponible : {message}',
  'err.apiDown': 'API Blizzard indisponible ({status}) sur {path}',
  'err.api': 'Erreur API {status} sur {path}',
  'err.notFound': 'Ressource introuvable : {path}',
  'err.syncRunning': 'Synchronisation déjà en cours.',
  'err.noAccounts':
    'Aucun compte WoW retourné par Battle.net. Vérifie que le compte autorisé possède bien une licence WoW.',
  'err.noCharacters': 'Aucun personnage au-dessus du niveau {level}.',
  'err.profileUnavailable':
    'Profil indisponible (perso jamais connecté depuis la mise à jour ?)',
  'err.unknownCharacter': 'Personnage inconnu, lance une synchronisation complète.',
  'err.badReportLink':
    "Lien Raidbots non reconnu. Attendu : https://www.raidbots.com/simbot/report/XXXX ou l'identifiant seul.",
  'err.reportNotFound':
    'Rapport {id} introuvable. Les rapports Raidbots expirent (30 jours pour un compte gratuit) — relance le Droptimizer.',
  'err.raidbots': 'Raidbots a répondu {status}.',
  'err.badJson':
    "Le contenu collé n'est pas du JSON valide (attendu : le data.json du rapport).",
  'err.noSimKey': 'JSON inattendu : la clé "sim" est absente.',
  'err.noBaseline': 'Impossible de déterminer le DPS de référence dans ce rapport.',
  'err.notDroptimizer':
    "Ce rapport ne contient aucun profileset : ce n'est probablement pas un Droptimizer (Top Gear et Quick Sim ne sont pas supportés).",
  'err.noWowPath': 'Aucun dossier WoW configuré. Va dans Réglages > Dossier WoW.',
  'err.notWowRoot':
    '"{path}" ne ressemble pas à une installation WoW (aucun dossier _retail_ / _classic_ trouvé).',
  'err.addonsMissing':
    'Dossier introuvable : {path}. Lance WoW au moins une fois avec cette saveur.',
  'err.addonsDenied':
    "Accès refusé au dossier AddOns. Ferme WoW ou lance l'application en administrateur.",
  'err.notWowFolder':
    "Ce dossier ne contient pas d'installation WoW. Choisis le dossier qui contient _retail_.",
  'err.badPath': 'Chemin invalide : aucun dossier de saveur WoW trouvé.',
  'err.urlRefused': 'URL refusée.',
  'err.unknown': 'Erreur inconnue.',

  // -- notes du parseur
  'note.unresolvedItems':
    '{count} objet(s) sans identifiant reconnu, affichés avec leur nom brut.',
  'note.unknownSources':
    "{count} objet(s) sans source connue : reconstruis l'index du butin dans Réglages si le contenu est récent.",

  // -- problèmes d'équipement
  'issue.enchant': "{slot} : pas d'enchantement",
  'issue.socket': '{slot} : {count} châsse vide',
  'issue.sockets': '{slot} : {count} châsses vides',
  'issue.tier': 'Set de tier incomplet ({count}/4 pièces)',
  'issue.unclassified': 'Non classé'
}

const en: Dict = {
  'app.name': 'WoW Reroll Hub',
  'common.loading': 'Loading…',
  'common.cancel': 'Cancelled.',
  'common.unknown': 'Unknown',
  'common.never': 'never',
  'common.none': '—',
  'common.close': 'Close',
  'common.characters': '{count} characters',

  'tab.character': 'Character',
  'tab.export': 'Addon export',
  'tab.settings': 'Settings',

  'roster.search': 'Search a character, a realm…',
  'roster.sort.ilvl': 'Sort by ilvl',
  'roster.sort.mplus': 'Sort by M+ score',
  'roster.sort.level': 'Sort by level',
  'roster.sort.name': 'Sort by name',
  'roster.group.pinned': 'Pinned',
  'roster.group.normal': 'Characters',
  'roster.group.hidden': 'Hidden',
  'roster.empty': 'No character synced yet.',
  'roster.connected': 'Connected',
  'roster.disconnected': 'Not connected',
  'roster.sync': 'Sync account',
  'roster.syncing': 'Syncing…',
  'roster.lastSync': 'Last sync: {date}',
  'roster.count': '{count} character{s}',

  'char.empty.title': 'No character',
  'char.empty.body':
    'Sign in to Battle.net from Settings, then run a sync: every character on the account shows up here without logging into any of them in game.',
  'char.pin': 'Pin',
  'char.unpin': 'Unpin',
  'char.hide': 'Hide',
  'char.show': 'Unhide',
  'char.hideHint':
    'A hidden character stays in the database but leaves the list and the addon export.',
  'char.resync': 'Resync',
  'char.resynced': '{name} resynced.',
  'char.kpi.ilvl': 'Equipped ilvl',
  'char.kpi.ilvlMax': 'Max ilvl',
  'char.kpi.mplus': 'M+ score',
  'char.kpi.tier': 'Tier set',
  'char.kpi.level': 'Level',
  'char.kpi.focus': 'Suggested focus',
  'char.gear': 'Gear',
  'char.gear.count': '{count} pieces',
  'char.gear.empty': 'No gear returned by the API.',
  'char.gear.noEnchant': 'no ench.',
  'char.gear.emptySocket': '{count} empty socket',
  'char.gear.emptySockets': '{count} empty sockets',
  'char.gear.tier': 'tier',
  'char.stats': 'Stats',
  'char.stats.empty': 'Stats unavailable for this character.',
  'char.issues': 'To fix',
  'char.issues.hint': 'free gains, before any farming',
  'char.issues.none': 'Nothing to report: enchants and gems are up to date.',
  'char.issues.weakSlots': 'Lagging slots: {slots}',
  'char.raids': 'Raid progress',
  'char.professions': 'Professions',
  'char.note': 'Note',
  'char.note.hint': 'exported to the addon',
  'char.note.placeholder': 'e.g. reroll main if 4pc tier, otherwise keep as M+ alt',
  'char.partialSync': 'Partial sync — {details}',

  'stat.stamina': 'Stamina',
  'stat.health': 'Health',
  'stat.crit': 'Critical strike',
  'stat.haste': 'Haste',
  'stat.mastery': 'Mastery',
  'stat.versatility': 'Versatility',
  'stat.armor': 'Armor',
  'stat.dodge': 'Dodge',
  'stat.parry': 'Parry',
  'stat.block': 'Block',
  'stat.strength': 'Strength',
  'stat.agility': 'Agility',
  'stat.intellect': 'Intellect',

  'role.TANK': 'Tank',
  'role.HEALER': 'Healer',
  'role.DAMAGE': 'DPS',
  'faction.ALLIANCE': 'Alliance',
  'faction.HORDE': 'Horde',
  'faction.NEUTRAL': 'Neutral',

  'slot.HEAD': 'Head',
  'slot.NECK': 'Neck',
  'slot.SHOULDER': 'Shoulder',
  'slot.BACK': 'Back',
  'slot.CHEST': 'Chest',
  'slot.SHIRT': 'Shirt',
  'slot.TABARD': 'Tabard',
  'slot.WRIST': 'Wrist',
  'slot.HANDS': 'Hands',
  'slot.WAIST': 'Waist',
  'slot.LEGS': 'Legs',
  'slot.FEET': 'Feet',
  'slot.FINGER_1': 'Ring 1',
  'slot.FINGER_2': 'Ring 2',
  'slot.TRINKET_1': 'Trinket 1',
  'slot.TRINKET_2': 'Trinket 2',
  'slot.MAIN_HAND': 'Main hand',
  'slot.OFF_HAND': 'Off hand',

  'slotGroup.HEAD': 'Head',
  'slotGroup.NECK': 'Neck',
  'slotGroup.SHOULDER': 'Shoulder',
  'slotGroup.BACK': 'Back',
  'slotGroup.CHEST': 'Chest',
  'slotGroup.WRIST': 'Wrist',
  'slotGroup.HANDS': 'Hands',
  'slotGroup.WAIST': 'Waist',
  'slotGroup.LEGS': 'Legs',
  'slotGroup.FEET': 'Feet',
  'slotGroup.FINGER': 'Rings',
  'slotGroup.TRINKET': 'Trinkets',
  'slotGroup.WEAPON': 'Weapon',
  'slotGroup.OFFHAND': 'Off hand',
  'slotGroup.SHIRT': 'Shirt',
  'slotGroup.TABARD': 'Tabard',
  'slotGroup.OTHER': 'Other',

  'dropt.title': 'Droptimizer',
  'dropt.hint': 'which content to farm first on {name}',
  'dropt.placeholder.url': 'https://www.raidbots.com/simbot/report/…',
  'dropt.placeholder.json': "Paste the report's data.json content here…",
  'dropt.import': 'Import',
  'dropt.importing': 'Importing…',
  'dropt.imported': 'Droptimizer imported.',
  'dropt.mode.link': 'Link',
  'dropt.mode.json': 'JSON',
  'dropt.mode.hint':
    'Useful if the report expired on Raidbots: download its data.json and paste it here.',
  'dropt.empty':
    'No droptimizer imported. Run a Droptimizer sim on raidbots.com for this character (one per content: heroic raid, mythic raid, dungeons…), then paste the report link above. The content ranking will show up here.',
  'dropt.focus.first': 'Focus this first',
  'dropt.focus.rank': 'Priority {rank}',
  'dropt.focus.upgrades': '{count} upgrade{s}',
  'dropt.focus.best': 'best: {item}',
  'dropt.focus.top3': 'top 3 avg.',
  'dropt.focus.peak': 'peak +{value}%',
  'dropt.gainDps': '+{value} dps',
  'dropt.view.bySlot': 'Best per slot',
  'dropt.view.all': 'All items',
  'dropt.bySlot.title': 'Best piece per slot',
  'dropt.bySlot.hint': 'across every report',
  'dropt.bySlot.empty': 'No upgrade found in the imported reports.',
  'dropt.source.unknown': 'Unknown source',
  'dropt.report.baseline': '{dps} baseline dps',
  'dropt.report.style': 'unknown style',
  'dropt.report.targets': '{count} target(s)',
  'dropt.report.imported': 'imported on {date}',
  'dropt.report.delete': 'Delete',
  'dropt.report.tagHint': 'Content tag: groups several reports under one priority.',
  'dropt.report.expand': 'Show all {count} items',
  'dropt.report.collapse': 'Collapse',

  'export.title': 'Export to the addon',
  'export.hint': '{count} characters will be written',
  'export.step1':
    'Close World of Warcraft (or at least plan a /reload after the export: the game only reads addon files on load).',
  'export.step2':
    'Click Export now: the app copies the RerollHelper addon into your Interface/AddOns folder and writes every character there.',
  'export.step3':
    'In game, enable the addon in the list, then type /rh (or /reroll) to open the summary.',
  'export.run': 'Export now',
  'export.preview': 'Preview file',
  'export.saveAs': 'Save as…',
  'export.saveAsHint': 'Writes the same file elsewhere, to copy it by hand to another machine.',
  'export.openFolder': 'Open folder',
  'export.needPath': 'Set the World of Warcraft folder in Settings first.',
  'export.success': 'Export done: {count} characters written to the addon.',
  'export.failed': 'Export failed.',
  'export.last': 'Last export: {path}',
  'export.noAddonSource':
    ' — the addon files were not found next to the application, only the data was written.',
  'export.auto.ok': 'Addon updated ({count} characters).',
  'export.auto.failed': 'Automatic export failed: {error}',
  'export.contents': 'What the addon receives',
  'export.contents.hint': 'per character',
  'export.contents.identity':
    'Identity: name, realm, class, spec, role, faction, guild, level.',
  'export.contents.progress':
    'Progress: equipped and max ilvl, Mythic+ score, tier pieces, raids.',
  'export.contents.focus':
    'Content to focus: ranking of the imported droptimizers, with the average gain of the three best items.',
  'export.contents.bySlot': 'Best piece per slot, with the dungeon or boss that drops it.',
  'export.contents.fixes': 'Fixes: missing enchants, empty sockets, lagging slots.',
  'export.contents.note': 'Your free-form note written on the character sheet.',
  'export.previewTitle': 'Preview',

  'settings.auth': 'Battle.net connection',
  'settings.auth.hint': 'once only, then every character comes in on its own',
  'settings.auth.step1':
    'Open develop.battle.net/access/clients and click Create Client (sign in with your Battle.net account).',
  'settings.auth.step2':
    'Enter any name and, under Redirect URLs, paste exactly: {uri}',
  'settings.auth.step3':
    'Copy the generated Client ID and Client Secret into the fields below, then click Sign in.',
  'settings.clientId': 'Client ID',
  'settings.clientSecret': 'Client Secret',
  'settings.clientSecret.desc':
    'Stored encrypted on this machine (Windows DPAPI) and sent to Blizzard only.',
  'settings.port': 'Redirect port',
  'settings.port.desc':
    'Change it only if port {port} is already taken. Remember to update the Redirect URL on develop.battle.net.',
  'settings.login': 'Sign in with Battle.net',
  'settings.login.hint': 'Authorization opens in your browser, just like on Raider.IO.',
  'settings.logout': 'Sign out',
  'settings.connected': 'Connected',
  'settings.sessionUntil': 'session valid until {date}',
  'settings.opening': 'Authorization opened in the browser…',
  'oauth.page.failed': 'Sign-in failed',
  'oauth.page.ok': 'Connected!',
  'oauth.page.okBody': 'You can close this tab and go back to WoW Reroll Hub.',
  'settings.loggedIn': 'Signed in as {battletag}.',
  'settings.loggedOut': 'Signed out.',
  'settings.account': 'Account and sync',
  'settings.region': 'Region',
  'settings.locale': 'Data language',
  'settings.locale.desc':
    'Language of item, boss and realm names returned by Blizzard. Independent from the interface language: keep it on your WoW client language if you want the same names as in game.',
  'settings.refreshNames': 'Refresh names',
  'settings.refreshNames.desc':
    'Asks Blizzard again for the names of already imported items. Runs automatically when you change the data language.',
  'settings.refreshing': 'Refreshing…',
  'reports.refreshed': 'Labels updated on {count} report{s}.',
  'reports.refreshFailed': 'Could not refresh the report labels.',
  'settings.language': 'Application language',
  'settings.language.desc': 'Also applies to the addon on the next export.',
  'settings.minLevel': 'Minimum level',
  'settings.minLevel.desc':
    'Characters below this level are skipped: it avoids syncing 40 bank alts.',
  'settings.wow': 'World of Warcraft folder',
  'settings.wow.path': 'Path',
  'settings.wow.detect': 'Detect',
  'settings.wow.detecting': 'Searching…',
  'settings.wow.browse': 'Browse…',
  'settings.wow.found': 'Installations found',
  'settings.wow.notFound':
    'No installation detected automatically — enter the path by hand (the folder containing _retail_).',
  'settings.wow.flavor': 'Game version',
  'settings.autoExport': 'Automatic export',
  'settings.autoExport.desc': 'Rewrites the addon data after every sync.',
  'settings.journal': 'Loot index',
  'settings.journal.desc':
    "Maps each simulated item to the dungeon or boss that drops it, using Blizzard's adventure journal. Built automatically on the first droptimizer import.",
  'settings.journal.rebuild': 'Rebuild index',
  'settings.journal.building': 'Building…',
  'settings.journal.status': '{count} items indexed, built on {date}',
  'settings.journal.empty': 'Index not built.',
  'settings.journal.done': 'Loot index rebuilt: {count} items.',

  'sync.account': 'Reading the Battle.net account…',
  'sync.done': '{count} characters synced.',
  'sync.failedSome': ' {count} failed: {names}',
  'sync.failed': 'Sync failed.',

  'err.credentialsMissing':
    'Battle.net Client ID and Client Secret required. Set them in Settings (created at https://develop.battle.net/access/clients).',
  'err.portInUse':
    'Port {port} is already in use. Change the redirect port in Settings (and on develop.battle.net).',
  'err.oauthDenied': 'Battle.net denied the authorization: {error}',
  'err.oauthState': 'Invalid OAuth state, attempt rejected.',
  'err.oauthNoCode': 'No code returned by Battle.net.',
  'err.oauthTimeout': 'Timed out: no authorization received within 5 minutes.',
  'err.tokenExchange':
    'Code exchange refused ({status}). Check that "{uri}" is registered as a Redirect URI on develop.battle.net. {body}',
  'err.authExpired': 'Battle.net session expired, sign in again.',
  'err.network': 'Network unavailable: {message}',
  'err.apiDown': 'Blizzard API unavailable ({status}) on {path}',
  'err.api': 'API error {status} on {path}',
  'err.notFound': 'Resource not found: {path}',
  'err.syncRunning': 'A sync is already running.',
  'err.noAccounts':
    'No WoW account returned by Battle.net. Check that the authorized account owns a WoW license.',
  'err.noCharacters': 'No character above level {level}.',
  'err.profileUnavailable':
    'Profile unavailable (character never logged in since the update?)',
  'err.unknownCharacter': 'Unknown character, run a full sync.',
  'err.badReportLink':
    'Raidbots link not recognized. Expected: https://www.raidbots.com/simbot/report/XXXX or the id alone.',
  'err.reportNotFound':
    'Report {id} not found. Raidbots reports expire (30 days on a free account) — rerun the Droptimizer.',
  'err.raidbots': 'Raidbots answered {status}.',
  'err.badJson': "The pasted content is not valid JSON (expected: the report's data.json).",
  'err.noSimKey': 'Unexpected JSON: the "sim" key is missing.',
  'err.noBaseline': 'Could not determine the baseline DPS in this report.',
  'err.notDroptimizer':
    'This report has no profileset: it is probably not a Droptimizer (Top Gear and Quick Sim are not supported).',
  'err.noWowPath': 'No WoW folder configured. Go to Settings > World of Warcraft folder.',
  'err.notWowRoot':
    '"{path}" does not look like a WoW installation (no _retail_ / _classic_ folder found).',
  'err.addonsMissing':
    'Folder not found: {path}. Launch WoW at least once with this version.',
  'err.addonsDenied':
    'Access denied to the AddOns folder. Close WoW or run the application as administrator.',
  'err.notWowFolder':
    'This folder holds no WoW installation. Pick the folder containing _retail_.',
  'err.badPath': 'Invalid path: no WoW version folder found.',
  'err.urlRefused': 'URL refused.',
  'err.unknown': 'Unknown error.',

  'note.unresolvedItems': '{count} item(s) with no recognized id, shown with their raw name.',
  'note.unknownSources':
    '{count} item(s) with no known source: rebuild the loot index in Settings if the content is recent.',

  'issue.enchant': '{slot}: no enchant',
  'issue.socket': '{slot}: {count} empty socket',
  'issue.sockets': '{slot}: {count} empty sockets',
  'issue.tier': 'Incomplete tier set ({count}/4 pieces)',
  'issue.unclassified': 'Unclassified'
}

const DICTS: Record<Lang, Dict> = { fr, en }

export type Translate = (key: string, params?: Record<string, string | number>) => string

export function translator(lang: Lang): Translate {
  const dict = DICTS[lang] ?? fr
  return (key, params) => {
    let text = dict[key] ?? fr[key] ?? key
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.split(`{${name}}`).join(String(value))
      }
    }
    // {s} marque un pluriel simple : présent seulement si un paramètre "count"
    // supérieur à 1 accompagne la clé.
    const count = Number(params?.count)
    text = text.split('{s}').join(count > 1 ? 's' : '')
    return text
  }
}

/**
 * Locale de formatage des nombres, alignée sur la langue de l'interface :
 * un séparateur de milliers français au milieu d'une interface anglaise
 * jurerait.
 */
export function numberLocale(lang: Lang): string {
  return lang === 'en' ? 'en-GB' : 'fr-FR'
}

/** Langue par défaut déduite de la locale système, français sinon. */
export function defaultLang(systemLocale: string): Lang {
  return systemLocale.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}
