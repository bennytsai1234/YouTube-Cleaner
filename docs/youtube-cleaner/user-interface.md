# user-interface — 使用者介面層

## 職責

管理所有使用者互動介面、設定匯出/匯入、多語系國際化，以及靜態 CSS 樣式資源。此模組是使用者與腳本之間的唯一溝通橋樑。

## 範圍

- `src/ui/menu.ts` — **UIManager**：選單編排器。管理五層選單結構（主選單 → 內容過濾/名單管理/UX 設定/系統設定），處理設定切換（toggle）、數值輸入（promptNumber）、時長設定（promptDuration）、名單管理委派（ListManager）、設定匯出/匯入委派（SettingsIO）、語言切換、統計顯示、設定重置。
- `src/ui/menu-renderer.ts` — **MenuRenderer**：基於 `prompt()` 的純文字選單渲染。將 MenuItem[] 轉為編號清單，處理使用者輸入與回上頁。
- `src/ui/menu-types.ts` — **MenuItem** 介面（label/action/show）與 **MenuContext** 型別。
- `src/ui/list-manager.ts` — **ListManager**：黑白名單管理。addItem（支援逗號分隔批次新增、精確匹配前綴 `=`）、removeItem（支援編號或文字刪除）、clearList、restoreDefaults（依當前語系過濾預設值）。
- `src/ui/settings-io.ts` — **SettingsIO**：JSON 設定匯出（排除 compiled* 鍵，含版本與時間戳）與匯入（型別正規化驗證：RULE_ENABLES、RULE_PRIORITIES、Array、boolean、number、LOW_VIEW_THRESHOLD/DURATION_MIN/DURATION_MAX/GRACE_PERIOD_HOURS 範圍檢查）。
- `src/ui/i18n.ts` — **I18N**：多語系支援模組。語言偵測（YouTube HL 參數 → document.documentElement.lang → navigator.language）、手動切換（GM_setValue）、字串查詢（t() 含 {0} 佔位替換）、規則名稱翻譯（getRuleName()）。支援 zh-TW/zh-CN/en/ja。
- `src/ui/i18n-strings.ts` — **I18N_STRINGS**：各語系的所有 UI 字串定義。
- `src/styles/youtube-cleaner.css` — 基礎靜態 CSS 樣式，由 StyleManager 在初始化時注入頁面。

## 依賴與影響

- **上游**：
  - core-foundation（ConfigManager、FilterStats）
  - data-definitions（DEFAULT_SECTION_BLACKLIST、FILTER_PATTERNS、RULE_NAMES — 由 I18N 與 ListManager 使用）
- **下游**：
  - feature-engine（StyleManager 使用 I18N.t() 產生語系化 CSS；VideoData 使用 I18N.filterPatterns）
  - app-entry（main.ts 實例化 UIManager 並註冊 GM_registerMenuCommand）

## 關鍵流程

- **選單導航**：GM_registerMenuCommand → UIManager.showMainMenu() → MenuRenderer.render() → prompt() 顯示選單 → 使用者輸入數字 → 執行對應 action（可能是子選單或設定操作）→ onRefresh() 回呼觸發 App.refresh()。
- **設定切換**：toggle(key) → config.get() 取得目前值 → config.set(key, !value) → onRefresh()。
- **設定匯出**：SettingsIO.exportSettings() → 遍歷 config.state 排除 compiled* → 附加 version/timestamp/language → JSON.stringify → GM_setClipboard 或 prompt 顯示。
- **設定匯入**：SettingsIO.importSettings() → prompt 取得 JSON → JSON.parse → 逐鍵驗證型別與範圍 → config.set() → onRefresh()。
- **語言切換**：I18N.lang = newLang → GM_setValue → onRefresh() → 所有 t() 呼叫使用新語言。

## 變更入口與路徑

- **新增選單項目**：在對應選單方法（showFilterMenu/showListMenu/showUXMenu/showSystemMenu）中加入新 MenuItem → 若為開關型，確保 config.ts 中有對應設定鍵。
- **新增語系**：在 i18n.ts 的 SupportedLang 中加入新語系 → 在 availableLanguages 中加入顯示名稱 → 在 i18n-strings.ts 中加入該語系的所有字串 → 在 data-definitions 的 i18n-filter-patterns.ts 與 rule-names.ts 中加入對應模式。
- **修改 UI 文字**：修改 i18n-strings.ts 中對應語系的字串。注意繁中/簡中/英文/日文四語系需同步。
- **設定匯入格式變更**：修改 settings-io.ts 的 normalizeImportedValue() 與相關驗證邏輯。

## 已知風險

- **prompt() 使用者體驗**：所有選單使用瀏覽器原生 prompt()，在部分瀏覽器上可能有樣式不一致或被封鎖的風險。無-rich 介面。
- **設定匯入容錯**：SettingsIO.importSettings() 驗證較嚴格（型別+範圍），但若 JSON 結構完全錯誤會直接 alert 錯誤訊息，無法部分匯入。
- **I18N 覆蓋率**：若某語系缺少某 key 的翻譯，t() 會 fallback 到英文，但若英文也缺少則直接回傳 key 本身，使用者會看到原始 key 字串。
- **GM_setClipboard 相容性**：部分舊版 Tampermonkey 可能不支援 GM_setClipboard，exportSettings() 有 fallback 到 prompt。

## 禁止事項

- 不要在此模組中加入 DOM 操作或 YouTube 頁面邏輯——那是 feature-engine 的職責。
- 不要在 i18n-strings.ts 之外硬編碼 UI 文字——所有使用者可見文字應透過 I18N.t()。
- 不要在此模組中直接操作 config state 的 compiled* 鍵——那些由 ConfigManager 自動管理。
- 選單結構不要超過三層深度（主選單 → 子選單 → 操作）以維持可用性。
