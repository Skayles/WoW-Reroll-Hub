--[[
  Reroll Helper — noyau

  L'addon ne collecte rien lui-même : il se contente de lire la table
  RerollHelperData écrite par l'application WoW Reroll Hub dans
  Data/Export.lua. C'est ce qui permet d'avoir tous ses persos sous les yeux
  sans s'être connecté sur chacun.
]]

local ADDON_NAME, RH = ...
_G.RerollHelper = RH

RH.SCHEMA = 1
RH.VERSION = C_AddOns and C_AddOns.GetAddOnMetadata(ADDON_NAME, "Version") or "0.1.0"

-- ---------------------------------------------------------------------------
-- Accès aux données exportées
-- ---------------------------------------------------------------------------

--- Renvoie la table exportée, ou nil si l'export n'a jamais été fait.
function RH:GetExport()
	local data = _G.RerollHelperData
	if type(data) ~= "table" or type(data.characters) ~= "table" then
		return nil
	end
	return data
end

--- Message d'état affiché quand les données sont absentes ou périmées.
function RH:GetDataStatus()
	local data = self:GetExport()
	if not data then
		return "missing", "Aucune donnée exportée. Ouvre WoW Reroll Hub, synchronise ton compte puis clique sur « Exporter maintenant »."
	end

	if (data.schema or 0) ~= self.SCHEMA then
		return "schema",
			("Format de données incompatible (fichier v%d, addon v%d). Mets à jour l'application et l'addon ensemble.")
				:format(data.schema or 0, self.SCHEMA)
	end

	local age = time() - (data.generatedAt or 0)
	if age > 7 * 24 * 3600 then
		return "stale", ("Données vieilles de %d jours — pense à resynchroniser."):format(math.floor(age / 86400))
	end

	return "ok", nil
end

-- ---------------------------------------------------------------------------
-- Helpers d'affichage
-- ---------------------------------------------------------------------------

--- Couleur de classe à partir du classId Blizzard, avec repli neutre.
function RH:ClassColor(classId)
	local info = classId and C_CreatureInfo and C_CreatureInfo.GetClassInfo(classId)
	local color = info and RAID_CLASS_COLORS[info.classFile]
	if color then
		return color.r, color.g, color.b
	end
	return 0.78, 0.80, 0.84
end

function RH:ClassHex(classId)
	local r, g, b = self:ClassColor(classId)
	return ("|cff%02x%02x%02x"):format(r * 255, g * 255, b * 255)
end

--- Colore un ilvl selon son écart au meilleur ilvl du compte.
function RH:IlvlColor(ilvl, best)
	if not best or best <= 0 then
		return 1, 1, 1
	end
	local ratio = ilvl / best
	if ratio >= 0.99 then
		return 0.44, 0.81, 0.54 -- vert : au niveau du main
	elseif ratio >= 0.94 then
		return 0.94, 0.78, 0.45 -- ambre : rattrapable
	end
	return 0.85, 0.42, 0.42 -- rouge : gros retard
end

local ROLE_LABELS = { TANK = "Tank", HEALER = "Soigneur", DAMAGE = "DPS" }

function RH:RoleLabel(role)
	return ROLE_LABELS[role or ""] or ""
end

function RH:FormatPercent(value)
	if not value or value <= 0 then
		return "—"
	end
	return ("+%.2f%%"):format(value)
end

function RH:FormatDate(timestamp)
	if not timestamp or timestamp == 0 then
		return "jamais"
	end
	return date("%d/%m/%Y %H:%M", timestamp)
end

-- ---------------------------------------------------------------------------
-- Tri et sélection
-- ---------------------------------------------------------------------------

local SORTERS = {
	ilvl = function(a, b)
		return (a.ilvl or 0) > (b.ilvl or 0)
	end,
	mplus = function(a, b)
		return (a.mplus or 0) > (b.mplus or 0)
	end,
	name = function(a, b)
		return (a.name or "") < (b.name or "")
	end,
	focus = function(a, b)
		local ga = a.focus and a.focus.top3AvgPct or -1
		local gb = b.focus and b.focus.top3AvgPct or -1
		return ga > gb
	end,
}

--- Liste des persos triée selon le mode courant.
function RH:GetSortedCharacters(sortKey)
	local data = self:GetExport()
	if not data then
		return {}
	end

	local list = {}
	for _, character in ipairs(data.characters) do
		list[#list + 1] = character
	end

	local sorter = SORTERS[sortKey or "ilvl"] or SORTERS.ilvl
	-- Départage systématique par nom : sans ça, l'ordre de deux persos à ilvl
	-- égal change à chaque tri et la liste "saute" visuellement.
	table.sort(list, function(a, b)
		if sorter(a, b) then
			return true
		elseif sorter(b, a) then
			return false
		end
		return (a.name or "") < (b.name or "")
	end)

	return list
end

function RH:GetBestIlvl()
	local best = 0
	for _, character in ipairs(self:GetSortedCharacters("ilvl")) do
		if (character.ilvl or 0) > best then
			best = character.ilvl
		end
	end
	return best
end

-- ---------------------------------------------------------------------------
-- Persistance locale (position de fenêtre, dernier tri)
-- ---------------------------------------------------------------------------

local DEFAULTS = {
	sort = "ilvl",
	selected = nil,
	point = { "CENTER", nil, "CENTER", 0, 0 },
	minimap = { hide = false },
}

local function ApplyDefaults(target, defaults)
	for key, value in pairs(defaults) do
		if target[key] == nil then
			if type(value) == "table" then
				target[key] = CopyTable(value)
			else
				target[key] = value
			end
		end
	end
end

-- ---------------------------------------------------------------------------
-- Chargement
-- ---------------------------------------------------------------------------

local loader = CreateFrame("Frame")
loader:RegisterEvent("ADDON_LOADED")
loader:SetScript("OnEvent", function(_, _, loadedAddon)
	if loadedAddon ~= ADDON_NAME then
		return
	end

	RerollHelperDB = RerollHelperDB or {}
	ApplyDefaults(RerollHelperDB, DEFAULTS)
	RH.db = RerollHelperDB

	local status, message = RH:GetDataStatus()
	local data = RH:GetExport()
	local count = data and #data.characters or 0

	if status == "ok" then
		print(("|cff5ac8faReroll Helper|r : %d personnages chargés (export du %s). Tape /rh."):format(
			count,
			RH:FormatDate(data.generatedAt)
		))
	else
		print("|cff5ac8faReroll Helper|r : " .. (message or "données indisponibles."))
	end

	loader:UnregisterEvent("ADDON_LOADED")
end)

-- ---------------------------------------------------------------------------
-- Commandes
-- ---------------------------------------------------------------------------

SLASH_REROLLHELPER1 = "/rh"
SLASH_REROLLHELPER2 = "/reroll"
SLASH_REROLLHELPER3 = "/rerollhelper"

SlashCmdList["REROLLHELPER"] = function(input)
	local command = (input or ""):lower():match("^%s*(%S*)")

	if command == "status" then
		local _, message = RH:GetDataStatus()
		local data = RH:GetExport()
		print(("|cff5ac8faReroll Helper|r v%s — %d personnages, export du %s."):format(
			RH.VERSION,
			data and #data.characters or 0,
			RH:FormatDate(data and data.generatedAt)
		))
		if message then
			print("|cffffcc00" .. message .. "|r")
		end
		return
	end

	if command == "help" then
		print("|cff5ac8faReroll Helper|r — commandes :")
		print("  /rh          ouvre ou ferme la fenêtre")
		print("  /rh status   état des données exportées")
		return
	end

	RH:Toggle()
end
