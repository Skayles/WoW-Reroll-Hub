local _, RH = ...

local translations = {}

translations.en = {
	title = "Reroll Helper",
	loaded = "%d characters loaded (export from %s). Type /rh.",

	noData = "No data exported yet. Open WoW Reroll Hub, sync your account, then click \"Export now\".",
	badSchema = "Incompatible data format (file v%d, addon v%d). Update the application and the addon together.",
	stale = "Data is %d days old — consider resyncing.",
	staleShort = "(outdated data)",
	summary = "%d characters · exported %s",
	never = "never",

	sortIlvl = "Ilvl",
	sortMplus = "M+",
	sortFocus = "Focus",
	sortName = "Name",

	pickCharacter = "Select a character on the left.",
	focusHeader = "Content to focus",
	focusNone = "No droptimizer imported for this character in the application.",
	focusPeak = "peak %s · %d items",
	gainDps = "+%s dps",
	bySlotHeader = "Best piece per slot",
	contentRAID = "Raid",
	contentRAID_NORMAL = "Normal raid",
	contentRAID_HEROIC = "Heroic raid",
	contentRAID_MYTHIC = "Mythic raid",
	contentMYTHIC_PLUS = "Mythic+",
	contentBONUS_ROLL = "Bonus rolls",
	contentOTHER = "Other",
	tabTotal = "Total",
	bySlotMore = "%d candidates",
	sourceUnknown = "unknown source",
	issuesHeader = "To fix",
	weakHeader = "Lagging slots",
	raidHeader = "Raid progress",
	noteHeader = "Note",

	statusLine = "v%s — %d characters, exported %s.",
	helpHeader = "commands:",
	helpToggle = "  /rh          open or close the window",
	helpStatus = "  /rh status   state of the exported data",
	disclaimer = "Built with AI assistance, under human review. This addon only displays a file written by the WoW Reroll Hub app: it collects nothing and sends nothing.",

	roleTANK = "Tank",
	roleHEALER = "Healer",
	roleDAMAGE = "DPS",

	issueEnchant = "%s: no enchant",
	issueSocket = "%s: %d empty socket(s)",
	issueTier = "Incomplete tier set (%d/4 pieces)",

	slotHEAD = "Head",
	slotNECK = "Neck",
	slotSHOULDER = "Shoulder",
	slotBACK = "Back",
	slotCHEST = "Chest",
	slotSHIRT = "Shirt",
	slotTABARD = "Tabard",
	slotWRIST = "Wrist",
	slotHANDS = "Hands",
	slotWAIST = "Waist",
	slotLEGS = "Legs",
	slotFEET = "Feet",
	slotFINGER_1 = "Ring 1",
	slotFINGER_2 = "Ring 2",
	slotTRINKET_1 = "Trinket 1",
	slotTRINKET_2 = "Trinket 2",
	slotMAIN_HAND = "Main hand",
	slotOFF_HAND = "Off hand",

	groupHEAD = "Head",
	groupNECK = "Neck",
	groupSHOULDER = "Shoulder",
	groupBACK = "Back",
	groupCHEST = "Chest",
	groupWRIST = "Wrist",
	groupHANDS = "Hands",
	groupWAIST = "Waist",
	groupLEGS = "Legs",
	groupFEET = "Feet",
	groupFINGER = "Rings",
	groupTRINKET = "Trinkets",
	groupWEAPON = "Weapon",
	groupOFFHAND = "Off hand",
	groupSHIRT = "Shirt",
	groupTABARD = "Tabard",
	groupOTHER = "Other",
}

translations.fr = {
	title = "Reroll Helper",
	loaded = "%d personnages chargés (export du %s). Tape /rh.",

	noData = "Aucune donnée exportée. Ouvre WoW Reroll Hub, synchronise ton compte puis clique sur « Exporter maintenant ».",
	badSchema = "Format de données incompatible (fichier v%d, addon v%d). Mets à jour l'application et l'addon ensemble.",
	stale = "Données vieilles de %d jours — pense à resynchroniser.",
	staleShort = "(données anciennes)",
	summary = "%d personnages · export du %s",
	never = "jamais",

	sortIlvl = "Ilvl",
	sortMplus = "M+",
	sortFocus = "Focus",
	sortName = "Nom",

	pickCharacter = "Sélectionne un personnage à gauche.",
	focusHeader = "Contenu à focus",
	focusNone = "Aucun droptimizer importé pour ce perso dans l'application.",
	focusPeak = "pic %s · %d objets",
	gainDps = "+%s dps",
	bySlotHeader = "Meilleure pièce par slot",
	contentRAID = "Raid",
	contentRAID_NORMAL = "Raid normal",
	contentRAID_HEROIC = "Raid héroïque",
	contentRAID_MYTHIC = "Raid mythique",
	contentMYTHIC_PLUS = "Mythique+",
	contentBONUS_ROLL = "Bonus rolls",
	contentOTHER = "Autre",
	tabTotal = "Total",
	bySlotMore = "%d candidats",
	sourceUnknown = "source inconnue",
	issuesHeader = "À corriger",
	weakHeader = "Slots en retard",
	raidHeader = "Progression raid",
	noteHeader = "Note",

	statusLine = "v%s — %d personnages, export du %s.",
	helpHeader = "commandes :",
	helpToggle = "  /rh          ouvre ou ferme la fenêtre",
	helpStatus = "  /rh status   état des données exportées",
	disclaimer = "Réalisé avec l'aide de l'IA, sous relecture humaine. Cet addon se contente d'afficher un fichier écrit par l'application WoW Reroll Hub : il ne collecte rien et n'envoie rien.",

	roleTANK = "Tank",
	roleHEALER = "Soigneur",
	roleDAMAGE = "DPS",

	issueEnchant = "%s : pas d'enchantement",
	issueSocket = "%s : %d châsse(s) vide(s)",
	issueTier = "Set de tier incomplet (%d/4 pièces)",

	slotHEAD = "Tête",
	slotNECK = "Cou",
	slotSHOULDER = "Épaules",
	slotBACK = "Dos",
	slotCHEST = "Torse",
	slotSHIRT = "Chemise",
	slotTABARD = "Tabard",
	slotWRIST = "Poignets",
	slotHANDS = "Mains",
	slotWAIST = "Taille",
	slotLEGS = "Jambes",
	slotFEET = "Pieds",
	slotFINGER_1 = "Anneau 1",
	slotFINGER_2 = "Anneau 2",
	slotTRINKET_1 = "Bijou 1",
	slotTRINKET_2 = "Bijou 2",
	slotMAIN_HAND = "Main droite",
	slotOFF_HAND = "Main gauche",

	groupHEAD = "Tête",
	groupNECK = "Cou",
	groupSHOULDER = "Épaules",
	groupBACK = "Dos",
	groupCHEST = "Torse",
	groupWRIST = "Poignets",
	groupHANDS = "Mains",
	groupWAIST = "Taille",
	groupLEGS = "Jambes",
	groupFEET = "Pieds",
	groupFINGER = "Anneaux",
	groupTRINKET = "Bijoux",
	groupWEAPON = "Arme",
	groupOFFHAND = "Main gauche",
	groupSHIRT = "Chemise",
	groupTABARD = "Tabard",
	groupOTHER = "Autre",
}

local function resolve()
	local exported = _G.RerollHelperData and _G.RerollHelperData.lang
	if exported and translations[exported] then
		return translations[exported]
	end

	if GetLocale() == "frFR" then
		return translations.fr
	end
	return translations.en
end

local fallback = {
	__index = function(_, key)
		return translations.en[key] or key
	end,
}

function RH:LoadLocale()
	self.L = setmetatable(resolve(), fallback)
	return self.L
end

function RH:FormatGain(value)
	if not value or value == 0 then
		return nil
	end
	local rounded = math.floor(value + 0.5)
	local text = BreakUpLargeNumbers and BreakUpLargeNumbers(rounded) or tostring(rounded)
	return self.L.gainDps:format(text)
end

function RH:ContentName(category, difficulty)
	if not category or category == "" then
		return "?"
	end
	if category == "RAID" and difficulty and difficulty ~= "" then
		return self.L["contentRAID_" .. difficulty]
	end
	return self.L["content" .. category]
end

function RH:SlotName(slot)
	if not slot or slot == "" then
		return "?"
	end
	return self.L["slot" .. slot]
end

function RH:GroupName(group)
	if not group or group == "" then
		return "?"
	end
	return self.L["group" .. group]
end

function RH:IssueText(issue)
	if issue.type == "enchant" then
		return self.L.issueEnchant:format(self:SlotName(issue.slot))
	elseif issue.type == "socket" then
		return self.L.issueSocket:format(self:SlotName(issue.slot), issue.count or 1)
	elseif issue.type == "tier" then
		return self.L.issueTier:format(issue.count or 0)
	end
	return ""
end
