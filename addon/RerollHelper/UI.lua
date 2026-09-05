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

local frame, listChild, detail, rows, sortButtons, contentButtons
local bodyRows, itemRows = {}, {}
local FALLBACK_ICON = 134400

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
	frame:SetResizable(true)
	if frame.SetResizeBounds then
		frame:SetResizeBounds(720, 420)
	elseif frame.SetMinResize then
		frame:SetMinResize(720, 420)
	end
	frame:EnableMouse(true)
	frame:RegisterForDrag("LeftButton")
	frame:SetScript("OnDragStart", frame.StartMoving)
	frame:SetScript("OnDragStop", function(self)
		self:StopMovingOrSizing()

		local point, _, relativePoint, x, y = self:GetPoint()
		RH.db.point = { point, nil, relativePoint, x, y }
	end)

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

	local listPanel = CreateFrame("Frame", nil, frame, "BackdropTemplate")
	listPanel:SetPoint("TOPLEFT", 12, -52)
	listPanel:SetPoint("BOTTOMLEFT", 12, 14)
	listPanel:SetWidth(LIST_WIDTH)
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

	detail.tabPanel = CreateFrame("Frame", nil, detailPanel)
	detail.tabPanel:SetPoint("TOPLEFT", 14, -82)
	detail.tabPanel:SetPoint("TOPRIGHT", -14, -82)
	detail.tabPanel:SetHeight(22)
	contentButtons = {}

	local bodyScroll = CreateFrame("ScrollFrame", "RerollHelperDetailScroll", detailPanel, "UIPanelScrollFrameTemplate")
	bodyScroll:SetPoint("TOPLEFT", 12, -110)
	bodyScroll:SetPoint("BOTTOMRIGHT", -28, 10)

	local bodyChild = CreateFrame("Frame", nil, bodyScroll)
	bodyChild:SetSize(WIDTH - LIST_WIDTH - 70, 10)
	bodyScroll:SetScrollChild(bodyChild)

	detail.bodyChild = bodyChild
	detail.bodyWidth = WIDTH - LIST_WIDTH - 70

	detail.empty = bodyChild:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
	detail.empty:SetPoint("TOPLEFT")
	detail.empty:SetWidth(detail.bodyWidth)
	detail.empty:SetJustifyH("LEFT")
	detail.empty:Hide()

	local grip = CreateFrame("Button", nil, frame)
	grip:SetSize(16, 16)
	grip:SetPoint("BOTTOMRIGHT", -4, 4)
	grip:SetNormalTexture("Interface\\ChatFrame\\UI-ChatIM-SizeGrabber-Up")
	grip:SetHighlightTexture("Interface\\ChatFrame\\UI-ChatIM-SizeGrabber-Highlight")
	grip:SetPushedTexture("Interface\\ChatFrame\\UI-ChatIM-SizeGrabber-Down")
	grip:SetScript("OnMouseDown", function()
		frame:StartSizing("BOTTOMRIGHT")
	end)
	grip:SetScript("OnMouseUp", function()
		frame:StopMovingOrSizing()
		RH.db.width = math.floor(frame:GetWidth())
		RH.db.height = math.floor(frame:GetHeight())
		RH:Refresh()
	end)

	frame:SetScript("OnSizeChanged", function(self)
		local available = bodyScroll:GetWidth()
		if available and available > 40 then
			bodyChild:SetWidth(available)
			detail.bodyWidth = available
		end
	end)

	frame:Hide()
end

local function RenderList()
	local characters = RH:GetSortedCharacters(RH.db.sort)
	local best = RH:GetBestIlvl()

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

local function ItemIcon(itemId)
	if not itemId or itemId == 0 then
		return FALLBACK_ICON
	end
	local icon = C_Item and C_Item.GetItemIconByID and C_Item.GetItemIconByID(itemId)
	if not icon and GetItemIcon then
		icon = GetItemIcon(itemId)
	end
	return icon or FALLBACK_ICON
end

local function ItemRowEnter(self)
	if not self.itemId or self.itemId == 0 then
		return
	end
	GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
	if self.itemLink then
		GameTooltip:SetHyperlink(self.itemLink)
	else
		GameTooltip:SetItemByID(self.itemId)
	end
	GameTooltip:Show()
end

local function ItemRowLeave()
	GameTooltip:Hide()
end

local function CreateBodyRow(index)
	local row = CreateFrame("Button", nil, detail.bodyChild)

	row.icon = row:CreateTexture(nil, "ARTWORK")
	row.icon:SetPoint("TOPLEFT", 0, -1)
	row.icon:SetSize(20, 20)
	row.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)

	row.text = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
	row.text:SetJustifyH("LEFT")
	row.text:SetJustifyV("TOP")

	row.right = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
	row.right:SetPoint("TOPRIGHT", 0, -3)
	row.right:SetJustifyH("RIGHT")

	row.sub = row:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
	row.sub:SetJustifyH("LEFT")

	row:SetScript("OnEnter", ItemRowEnter)
	row:SetScript("OnLeave", ItemRowLeave)

	bodyRows[index] = row
	return row
end

local function BuildDetailLines(character)
	local L = RH.L
	local lines = {}

	local function header(value)
		lines[#lines + 1] = { kind = "header", text = value }
	end
	local function text(value, color)
		lines[#lines + 1] = { kind = "text", text = value, color = color }
	end
	local function blank()
		lines[#lines + 1] = { kind = "blank" }
	end

	header(L.focusHeader)
	if character.contents and #character.contents > 0 then
		for index, content in ipairs(character.contents) do
			local prefix = index == 1 and (COLOR_GREEN .. "> " .. R) or "   "
			local avgGain = RH:FormatGain(content.top3AvgGain)
			text(("%s%s  %s%s%s%s  %s%s%s"):format(
				prefix,
				RH:ContentName(content.category, content.difficulty),
				COLOR_GREEN,
				RH:FormatPercent(content.top3AvgPct),
				avgGain and (" (" .. avgGain .. ")") or "",
				R,
				COLOR_FAINT,
				L.focusPeak:format(RH:FormatPercent(content.bestGainPct), content.upgradeCount or 0),
				R
			))
		end
	else
		text(L.focusNone, COLOR_FAINT)
	end
	blank()

	local slots = RH:GetSlotsForTab(character, RH.db.contentTab)
	if slots and #slots > 0 then
		header(L.bySlotHeader)
		for _, slot in ipairs(slots) do
			local extra = ""
			if slot.candidates and slot.candidates > #slot.items then
				extra = ("  %s%s%s"):format(COLOR_FAINT, L.bySlotMore:format(slot.candidates), R)
			end
			text(("%s%s%s%s"):format(COLOR_DIM, RH:GroupName(slot.slot), R, extra))

			for _, item in ipairs(slot.items or {}) do
				local source
				if item.boss and item.boss ~= "" then
					source = item.instance ~= "" and (item.boss .. " - " .. item.instance) or item.boss
				elseif item.instance and item.instance ~= "" then
					source = item.instance
				else
					source = L.sourceUnknown
				end

				if RH.db.contentTab == "TOTAL" then
					source = source .. "  |  " .. RH:ContentName(item.category, item.difficulty)
				end

				local gain = RH:FormatGain(item.gain)
				lines[#lines + 1] = {
					kind = "item",
					itemId = item.itemId,
					itemLink = RH:ItemLink(item),
					ilvl = item.ilvl,
					name = item.name or "?",
					source = source,
					right = ("%s%s%s"):format(COLOR_GREEN, RH:FormatPercent(item.gainPct), R),
					rightSub = gain and (COLOR_FAINT .. gain .. R) or nil,
				}
			end
		end
		blank()
	end

	if character.issues and #character.issues > 0 then
		header(L.issuesHeader)
		for _, issue in ipairs(character.issues) do
			text("  " .. RH:IssueText(issue), COLOR_ORANGE)
		end
		blank()
	end

	if character.weakSlots and #character.weakSlots > 0 then
		header(L.weakHeader)
		local parts = {}
		for _, weak in ipairs(character.weakSlots) do
			parts[#parts + 1] = ("%s (%d)"):format(RH:SlotName(weak.slot), weak.ilvl or 0)
		end
		text("  " .. table.concat(parts, ", "), COLOR_DIM)
		blank()
	end

	if character.raids and #character.raids > 0 then
		header(L.raidHeader)
		for _, raid in ipairs(character.raids) do
			text(("  %s - %s : %d/%d"):format(
				raid.raid or "?",
				raid.difficulty or "?",
				raid.killed or 0,
				raid.total or 0
			), COLOR_DIM)
		end
		blank()
	end

	if character.note and character.note ~= "" then
		header(L.noteHeader)
		text("  " .. character.note, COLOR_DIM)
	end

	return lines
end

local function LayoutBody(lines)
	local L = RH.L
	wipe(itemRows)
	local offset = 0
	local width = detail.bodyChild:GetWidth()
	if not width or width < 120 then
		width = detail.bodyWidth
	end

	for index, line in ipairs(lines) do
		local row = bodyRows[index] or CreateBodyRow(index)
		row.itemId = nil
		row.itemLink = nil
		row.icon:Hide()
		row.sub:Hide()
		row.right:SetText("")
		row:EnableMouse(false)

		local height
		if line.kind == "blank" then
			row.text:SetText("")
			height = 8
		elseif line.kind == "header" then
			row.text:ClearAllPoints()
			row.text:SetPoint("TOPLEFT", 0, -5)
			row.text:SetWidth(width)
			row.text:SetText(COLOR_ACCENT .. line.text .. R)
			height = 23
		elseif line.kind == "item" then
			row.icon:Show()
			row.icon:SetTexture(ItemIcon(line.itemId))

			row.text:ClearAllPoints()
			row.text:SetPoint("TOPLEFT", 26, -2)
			row.text:SetWidth(width - 26 - 95)
			row.text:SetText(
				line.ilvl and line.ilvl > 0
					and ("%s  %s%s%s"):format(line.name, COLOR_FAINT, L.ilvlShort:format(line.ilvl), R)
					or line.name
			)

			row.sub:Show()
			row.sub:ClearAllPoints()
			row.sub:SetPoint("TOPLEFT", 26, -16)
			row.sub:SetWidth(width - 26 - 95)
			row.sub:SetText(COLOR_FAINT .. line.source .. R)

			row.right:SetText(line.rightSub and (line.right .. "\n" .. line.rightSub) or line.right)

			row.itemId = line.itemId
			row.itemLink = line.itemLink
			row:EnableMouse(true)
			itemRows[#itemRows + 1] = row
			height = 33
		else
			row.text:ClearAllPoints()
			row.text:SetPoint("TOPLEFT", 0, 0)
			row.text:SetWidth(width)
			row.text:SetText((line.color or "") .. line.text .. ((line.color and R) or ""))
			height = math.max(row.text:GetStringHeight() + 3, 15)
		end

		row:SetHeight(height)
		row:ClearAllPoints()
		row:SetPoint("TOPLEFT", detail.bodyChild, "TOPLEFT", 0, -offset)
		row:SetPoint("TOPRIGHT", detail.bodyChild, "TOPRIGHT", 0, -offset)
		row:Show()
		offset = offset + height
	end

	for index = #lines + 1, #bodyRows do
		bodyRows[index]:Hide()
	end

	detail.bodyChild:SetHeight(math.max(offset, 40))
end

local function CreateContentButton(index)
	local button = CreateFrame("Button", nil, detail.tabPanel, "BackdropTemplate")
	button:SetHeight(20)
	StyleBackdrop(button, 0.11, 0.13, 0.17, 1)

	button.text = button:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
	button.text:SetPoint("CENTER")

	button:SetScript("OnClick", function(self)
		RH.db.contentTab = self.tabKey
		RH:Refresh()
	end)

	contentButtons[index] = button
	return button
end

local function RenderContentTabs(character)
	local tabs = { { key = "TOTAL", label = RH.L.tabTotal } }
	for _, content in ipairs(character and character.contents or {}) do
		tabs[#tabs + 1] = {
			key = RH:ContentTabKey(content.category, content.difficulty),
			label = RH:ContentName(content.category, content.difficulty),
		}
	end

	local known = false
	for _, tab in ipairs(tabs) do
		if tab.key == RH.db.contentTab then
			known = true
			break
		end
	end
	if not known then
		RH.db.contentTab = "TOTAL"
	end

	local offset = 0
	for index, tab in ipairs(tabs) do
		local button = contentButtons[index] or CreateContentButton(index)
		button.tabKey = tab.key
		button.text:SetText(tab.label)

		local width = button.text:GetStringWidth() + 18
		button:SetWidth(width)
		button:ClearAllPoints()
		button:SetPoint("TOPLEFT", offset, 0)
		offset = offset + width + 4

		local active = tab.key == RH.db.contentTab
		button:SetBackdropBorderColor(active and 0.35 or 0.15, active and 0.78 or 0.18, active and 0.98 or 0.23, 1)
		button:SetBackdropColor(active and 0.16 or 0.09, active and 0.20 or 0.11, active and 0.26 or 0.14, 1)
		button:Show()
	end

	for index = #tabs + 1, #contentButtons do
		contentButtons[index]:Hide()
	end
end

local function RenderDetail()
	local character = RH.db.selected and FindCharacter(RH.db.selected) or nil
	RenderContentTabs(character)

	if not character then
		detail.name:SetText("")
		detail.meta:SetText("")
		detail.kpi:SetText("")
		for _, row in ipairs(bodyRows) do
			row:Hide()
		end
		wipe(itemRows)
		detail.empty:SetText(COLOR_FAINT .. RH.L.pickCharacter .. R)
		detail.empty:Show()
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

	detail.empty:Hide()
	LayoutBody(BuildDetailLines(character))
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

local itemWatcher = CreateFrame("Frame")
itemWatcher:RegisterEvent("GET_ITEM_INFO_RECEIVED")
itemWatcher:SetScript("OnEvent", function(_, _, itemId)
	for _, row in ipairs(itemRows) do
		if row.itemId == itemId then
			row.icon:SetTexture(ItemIcon(itemId))
		end
	end
end)

function RH:Toggle()
	if not frame then
		BuildFrame()
	end

	if frame:IsShown() then
		frame:Hide()
		return
	end

	if self.db and self.db.width and self.db.height then
		frame:SetSize(self.db.width, self.db.height)
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
