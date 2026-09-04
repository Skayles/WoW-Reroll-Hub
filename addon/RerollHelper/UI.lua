--[[
  Reroll Helper — interface

  Fenêtre en deux colonnes : la liste de tous les persos du compte à gauche,
  le détail du perso sélectionné à droite (focus conseillé, objets prioritaires,
  correctifs). Aucune donnée n'est lue depuis le jeu : tout vient de l'export.
]]

local ADDON_NAME, RH = ...

local WIDTH, HEIGHT = 860, 560
local LIST_WIDTH = 300
local ROW_HEIGHT = 38

local COLOR_DIM = "|cff97a1b0"
local COLOR_FAINT = "|cff6b7484"
local COLOR_ACCENT = "|cff5ac8fa"
local COLOR_GREEN = "|cff6fcf8a"
local COLOR_ORANGE = "|cfff0a35e"
local R = "|r"

local frame, listChild, detail, rows, sortButtons

-- ---------------------------------------------------------------------------
-- Construction
-- ---------------------------------------------------------------------------

local function StyleBackdrop(target, r, g, b, a)
	target:SetBackdrop({
		bgFile = "Interface\\Buttons\\WHITE8X8",
		edgeFile = "Interface\\Buttons\\WHITE8X8",
		edgeSize = 1,
	})
	target:SetBackdropColor(r, g, b, a or 1)
	target:SetBackdropBorderColor(0.15, 0.18, 0.23, 1)
end

local function CreateSortButton(parent, key, label, offsetX)
	local button = CreateFrame("Button", nil, parent, "BackdropTemplate")
	button:SetSize(66, 20)
	button:SetPoint("TOPLEFT", offsetX, -6)
	StyleBackdrop(button, 0.11, 0.13, 0.17, 1)

	button.text = button:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
	button.text:SetPoint("CENTER")
	button.text:SetText(label)

	button.key = key
	button:SetScript("OnClick", function()
		RH.db.sort = key
		RH:Refresh()
	end)

	return button
end

local function CreateRow(parent, index)
	local row = CreateFrame("Button", nil, parent, "BackdropTemplate")
	row:SetSize(LIST_WIDTH - 26, ROW_HEIGHT)
	row:SetPoint("TOPLEFT", 0, -(index - 1) * (ROW_HEIGHT + 2))
	StyleBackdrop(row, 0.10, 0.12, 0.16, 0.85)

	row.stripe = row:CreateTexture(nil, "ARTWORK")
	row.stripe:SetPoint("TOPLEFT", 2, -2)
	row.stripe:SetPoint("BOTTOMLEFT", 2, 2)
	row.stripe:SetWidth(3)
	row.stripe:SetColorTexture(1, 1, 1, 1)

	row.name = row:CreateFontString(nil, "OVERLAY", "GameFontNormal")
	row.name:SetPoint("TOPLEFT", 12, -5)
	row.name:SetJustifyH("LEFT")

	row.sub = row:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
	row.sub:SetPoint("TOPLEFT", 12, -20)
	row.sub:SetJustifyH("LEFT")

	row.ilvl = row:CreateFontString(nil, "OVERLAY", "GameFontNormal")
	row.ilvl:SetPoint("TOPRIGHT", -8, -5)

	row.extra = row:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
	row.extra:SetPoint("TOPRIGHT", -8, -20)

	row:SetScript("OnEnter", function(self)
		if not self.selected then
			self:SetBackdropColor(0.14, 0.17, 0.22, 1)
		end
	end)
	row:SetScript("OnLeave", function(self)
		self:SetBackdropColor(self.selected and 0.16 or 0.10, self.selected and 0.20 or 0.12, self.selected and 0.26 or 0.16, self.selected and 1 or 0.85)
	end)
	row:SetScript("OnClick", function(self)
		if self.characterId then
			RH.db.selected = self.characterId
			RH:Refresh()
		end
	end)

	return row
end

local function BuildFrame()
	frame = CreateFrame("Frame", "RerollHelperFrame", UIParent, "BackdropTemplate")
	frame:SetSize(WIDTH, HEIGHT)
	frame:SetFrameStrata("HIGH")
	frame:SetToplevel(true)
	StyleBackdrop(frame, 0.055, 0.067, 0.086, 0.97)

	frame:SetMovable(true)
	frame:EnableMouse(true)
	frame:RegisterForDrag("LeftButton")
	frame:SetScript("OnDragStart", frame.StartMoving)
	frame:SetScript("OnDragStop", function(self)
		self:StopMovingOrSizing()
		-- On mémorise la position pour la restaurer à la prochaine ouverture.
		local point, _, relativePoint, x, y = self:GetPoint()
		RH.db.point = { point, nil, relativePoint, x, y }
	end)

	-- Fermeture à Échap, comportement attendu de toute fenêtre d'addon.
	tinsert(UISpecialFrames, "RerollHelperFrame")

	local title = frame:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
	title:SetPoint("TOPLEFT", 14, -12)
	title:SetText(COLOR_ACCENT .. RH.L.title .. R)

	frame.subtitle = frame:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
	frame.subtitle:SetPoint("TOPLEFT", 16, -32)
	frame.subtitle:SetJustifyH("LEFT")

	local close = CreateFrame("Button", nil, frame, "UIPanelCloseButton")
	close:SetPoint("TOPRIGHT", 0, -2)
	close:SetScript("OnClick", function()
		frame:Hide()
	end)

	-- Colonne gauche : tri + liste défilante.
	local listPanel = CreateFrame("Frame", nil, frame, "BackdropTemplate")
	listPanel:SetPoint("TOPLEFT", 12, -52)
	listPanel:SetSize(LIST_WIDTH, HEIGHT - 66)
	StyleBackdrop(listPanel, 0.08, 0.10, 0.13, 1)

	local L = RH.L
	sortButtons = {
		CreateSortButton(listPanel, "ilvl", L.sortIlvl, 6),
		CreateSortButton(listPanel, "mplus", L.sortMplus, 74),
		CreateSortButton(listPanel, "focus", L.sortFocus, 142),
		CreateSortButton(listPanel, "name", L.sortName, 210),
	}

	local scroll = CreateFrame("ScrollFrame", "RerollHelperScroll", listPanel, "UIPanelScrollFrameTemplate")
	scroll:SetPoint("TOPLEFT", 6, -32)
	scroll:SetPoint("BOTTOMRIGHT", -26, 6)

	listChild = CreateFrame("Frame", nil, scroll)
	listChild:SetSize(LIST_WIDTH - 26, 10)
	scroll:SetScrollChild(listChild)

	rows = {}

	-- Colonne droite : détail du perso sélectionné.
	local detailPanel = CreateFrame("Frame", nil, frame, "BackdropTemplate")
	detailPanel:SetPoint("TOPLEFT", listPanel, "TOPRIGHT", 12, 0)
	detailPanel:SetPoint("BOTTOMRIGHT", -12, 14)
	StyleBackdrop(detailPanel, 0.08, 0.10, 0.13, 1)

	detail = {}

	detail.name = detailPanel:CreateFontString(nil, "OVERLAY", "GameFontNormalHuge")
	detail.name:SetPoint("TOPLEFT", 14, -14)
	detail.name:SetJustifyH("LEFT")

	detail.meta = detailPanel:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
	detail.meta:SetPoint("TOPLEFT", 16, -40)
	detail.meta:SetJustifyH("LEFT")

	detail.kpi = detailPanel:CreateFontString(nil, "OVERLAY", "GameFontNormal")
	detail.kpi:SetPoint("TOPLEFT", 16, -60)
	detail.kpi:SetJustifyH("LEFT")

	local bodyScroll = CreateFrame("ScrollFrame", "RerollHelperDetailScroll", detailPanel, "UIPanelScrollFrameTemplate")
	bodyScroll:SetPoint("TOPLEFT", 12, -86)
	bodyScroll:SetPoint("BOTTOMRIGHT", -28, 10)

	local bodyChild = CreateFrame("Frame", nil, bodyScroll)
	bodyChild:SetSize(WIDTH - LIST_WIDTH - 70, 10)
	bodyScroll:SetScrollChild(bodyChild)

	detail.body = bodyChild:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
	detail.body:SetPoint("TOPLEFT")
	detail.body:SetWidth(WIDTH - LIST_WIDTH - 70)
	detail.body:SetJustifyH("LEFT")
	detail.body:SetJustifyV("TOP")
	detail.body:SetSpacing(3)
	detail.bodyChild = bodyChild

	frame:Hide()
end

-- ---------------------------------------------------------------------------
-- Rendu
-- ---------------------------------------------------------------------------

local function RenderList()
	local characters = RH:GetSortedCharacters(RH.db.sort)
	local best = RH:GetBestIlvl()

	-- Aucun perso sélectionné (premier lancement, ou perso disparu de l'export).
	local selectedExists = false
	for _, character in ipairs(characters) do
		if character.id == RH.db.selected then
			selectedExists = true
			break
		end
	end
	if not selectedExists then
		RH.db.selected = characters[1] and characters[1].id or nil
	end

	for index, character in ipairs(characters) do
		local row = rows[index]
		if not row then
			row = CreateRow(listChild, index)
			rows[index] = row
		end

		row.characterId = character.id
		row.selected = character.id == RH.db.selected

		row.stripe:SetVertexColor(RH:ClassColor(character.classId))
		row.name:SetText(RH:ClassHex(character.classId) .. (character.name or "?") .. R)
		row.sub:SetText(COLOR_FAINT .. (character.realm or "") .. " · " .. (character.spec or character.className or "") .. R)

		local ir, ig, ib = RH:IlvlColor(character.ilvl or 0, best)
		row.ilvl:SetText(("|cff%02x%02x%02x%d|r"):format(ir * 255, ig * 255, ib * 255, character.ilvl or 0))

		if character.focus then
			row.extra:SetText(COLOR_GREEN .. RH:FormatPercent(character.focus.top3AvgPct) .. R)
		elseif (character.mplus or 0) > 0 then
			row.extra:SetText(COLOR_FAINT .. character.mplus .. " M+" .. R)
		else
			row.extra:SetText("")
		end

		row:SetBackdropColor(row.selected and 0.16 or 0.10, row.selected and 0.20 or 0.12, row.selected and 0.26 or 0.16, row.selected and 1 or 0.85)
		row:SetBackdropBorderColor(row.selected and 0.35 or 0.15, row.selected and 0.78 or 0.18, row.selected and 0.98 or 0.23, 1)
		row:Show()
	end

	for index = #characters + 1, #rows do
		rows[index]:Hide()
	end

	listChild:SetHeight(math.max(#characters * (ROW_HEIGHT + 2), 10))

	for _, button in ipairs(sortButtons) do
		local active = button.key == RH.db.sort
		button:SetBackdropBorderColor(active and 0.35 or 0.15, active and 0.78 or 0.18, active and 0.98 or 0.23, 1)
	end
end

local function FindCharacter(id)
	for _, character in ipairs(RH:GetSortedCharacters(RH.db.sort)) do
		if character.id == id then
			return character
		end
	end
	return nil
end

local function BuildDetailText(character)
	local L = RH.L
	local lines = {}
	local function add(text)
		lines[#lines + 1] = text or ""
	end

	-- Contenu à focus : c'est l'information qui motive tout l'addon.
	add(COLOR_ACCENT .. L.focusHeader .. R)
	if character.contents and #character.contents > 0 then
		for index, content in ipairs(character.contents) do
			local prefix = index == 1 and (COLOR_GREEN .. "→ " .. R) or "   "
			add(("%s%s  %s%s%s  %s%s%s"):format(
				prefix,
				content.tag or "?",
				COLOR_GREEN,
				RH:FormatPercent(content.top3AvgPct),
				R,
				COLOR_FAINT,
				L.focusPeak:format(RH:FormatPercent(content.bestGainPct), content.upgradeCount or 0),
				R
			))
		end
	else
		add(COLOR_FAINT .. L.focusNone .. R)
	end
	add("")

	-- Meilleure pièce par emplacement : une ligne de slot, puis ses objets avec
	-- le boss qui les fait tomber. C'est la vue directement actionnable en jeu.
	if character.bySlot and #character.bySlot > 0 then
		add(COLOR_ACCENT .. L.bySlotHeader .. R)
		for _, slot in ipairs(character.bySlot) do
			local extra = ""
			if slot.candidates and slot.candidates > #slot.items then
				extra = ("  %s%s%s"):format(COLOR_FAINT, L.bySlotMore:format(slot.candidates), R)
			end
			add(("  %s%s%s%s"):format(COLOR_DIM, RH:GroupName(slot.slot), R, extra))

			for _, item in ipairs(slot.items or {}) do
				local source
				if item.boss and item.boss ~= "" then
					source = item.instance ~= "" and (item.boss .. " — " .. item.instance) or item.boss
				elseif item.instance and item.instance ~= "" then
					source = item.instance
				else
					source = L.sourceUnknown
				end

				add(("      %s  %s%s%s"):format(
					item.name or "?",
					COLOR_GREEN,
					RH:FormatPercent(item.gainPct),
					R
				))
				add(("         %s%s%s"):format(COLOR_FAINT, source, R))
			end
		end
		add("")
	end

	if character.issues and #character.issues > 0 then
		add(COLOR_ACCENT .. L.issuesHeader .. R)
		for _, issue in ipairs(character.issues) do
			add(COLOR_ORANGE .. "  • " .. RH:IssueText(issue) .. R)
		end
		add("")
	end

	if character.weakSlots and #character.weakSlots > 0 then
		add(COLOR_ACCENT .. L.weakHeader .. R)
		local parts = {}
		for _, weak in ipairs(character.weakSlots) do
			parts[#parts + 1] = ("%s (%d)"):format(RH:SlotName(weak.slot), weak.ilvl or 0)
		end
		add(COLOR_DIM .. "  " .. table.concat(parts, ", ") .. R)
		add("")
	end

	if character.raids and #character.raids > 0 then
		add(COLOR_ACCENT .. L.raidHeader .. R)
		for _, raid in ipairs(character.raids) do
			add(("  %s%s — %s : %d/%d%s"):format(
				COLOR_DIM,
				raid.raid or "?",
				raid.difficulty or "?",
				raid.killed or 0,
				raid.total or 0,
				R
			))
		end
		add("")
	end

	if character.note and character.note ~= "" then
		add(COLOR_ACCENT .. L.noteHeader .. R)
		add(COLOR_DIM .. "  " .. character.note .. R)
	end

	return table.concat(lines, "\n")
end

local function RenderDetail()
	local character = RH.db.selected and FindCharacter(RH.db.selected) or nil

	if not character then
		detail.name:SetText("")
		detail.meta:SetText("")
		detail.kpi:SetText("")
		detail.body:SetText(COLOR_FAINT .. RH.L.pickCharacter .. R)
		detail.bodyChild:SetHeight(40)
		return
	end

	detail.name:SetText(RH:ClassHex(character.classId) .. (character.name or "?") .. R)

	local metaParts = {}
	tinsert(metaParts, character.realm or "")
	if character.spec and character.spec ~= "" then
		tinsert(metaParts, character.spec .. " " .. (character.className or ""))
	elseif character.className then
		tinsert(metaParts, character.className)
	end
	local role = RH:RoleLabel(character.role)
	if role ~= "" then
		tinsert(metaParts, role)
	end
	if character.guild and character.guild ~= "" then
		tinsert(metaParts, "<" .. character.guild .. ">")
	end
	detail.meta:SetText(COLOR_FAINT .. table.concat(metaParts, " · ") .. R)

	detail.kpi:SetText(("%silvl%s %d  %s(max %d)%s      %sM+%s %s      %sTier%s %d/4      %sNiv.%s %d"):format(
		COLOR_FAINT, R, character.ilvl or 0,
		COLOR_FAINT, character.ilvlMax or 0, R,
		COLOR_FAINT, R, (character.mplus or 0) > 0 and tostring(character.mplus) or "—",
		COLOR_FAINT, R, character.tierPieces or 0,
		COLOR_FAINT, R, character.level or 0
	))

	local text = BuildDetailText(character)
	detail.body:SetText(text)
	-- La hauteur du contenu doit suivre le texte, sinon le défilement est bloqué.
	detail.bodyChild:SetHeight(math.max(detail.body:GetStringHeight() + 10, 40))
end

function RH:Refresh()
	if not frame then
		return
	end

	local data = self:GetExport()
	local status, message = self:GetDataStatus()

	if status == "ok" or status == "stale" then
		frame.subtitle:SetText(("%s%s%s%s"):format(
			COLOR_FAINT,
			self.L.summary:format(#data.characters, self:FormatDate(data.generatedAt)),
			status == "stale" and ("  " .. COLOR_ORANGE .. self.L.staleShort) or "",
			R
		))
	else
		frame.subtitle:SetText(COLOR_ORANGE .. (message or "") .. R)
	end

	RenderList()
	RenderDetail()
end

function RH:Toggle()
	if not frame then
		BuildFrame()
	end

	if frame:IsShown() then
		frame:Hide()
		return
	end

	local point = self.db and self.db.point
	frame:ClearAllPoints()
	if point then
		frame:SetPoint(point[1], UIParent, point[3], point[4], point[5])
	else
		frame:SetPoint("CENTER")
	end

	self:Refresh()
	frame:Show()
end
