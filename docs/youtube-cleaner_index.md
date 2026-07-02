# YouTube Cleaner Atlas 索引

本專案的導航地圖。日常工作透過 atlas 入口技能（adapter）進入，它會讀取此索引、選取相關模組，並自帶 change/investigate 紀律——此索引只負責地圖，不負責流程。

- 使用此索引在檢視程式碼前先定位相關模組；細節請見各模組文件。
- Codebase Atlas 僅執行一次來建立此地圖。僅在明確要求 rebuild/refresh/rescan 時才重新執行——這會是一次完整掃描，從當前 repo 現狀重建此索引。

工作語言：繁體中文（台灣用語） · 交付：no commit · 回報：technical

## 專案運作約束

從現有專案指引繼承的規則，所有工作必須遵循：

- **語言**：文件與程式碼註解使用繁體中文（台灣用語）；Commit 訊息使用英文 Conventional Commits。
- **維護模式**：本專案為維護導向（持續優化現有功能，不預先規劃大型新功能）。變更應優先考慮穩定性與低維護成本。
- **新功能門檻**：新功能須明確改善現有使用體驗、不顯著增加維護成本、不依賴不穩定的 YouTube 內部 API、預設關閉或能被使用者清楚控制。
- **Commit 慣例**：使用 Conventional Commits（`feat:` / `fix:` / `refactor:` / `perf:` / `docs:` / `test:` / `chore:` / `ci:` / `release:`）。
- **驗證流程**：PR 前執行 `npm run verify`（含 typecheck、lint、unit test、build、release check）。
- **TypeScript**：strict 模式，`src/**/*.ts` + `test/**/*.ts`。
- **打包**：Rollup + IIFE 輸出為單一 `youtube-homepage-cleaner.user.js`，透過 Tampermonkey 分發。
- **測試**：使用 tsx 直接執行 TypeScript 測試（`test/` 目錄），無測試框架；依賴 jsdom 模擬瀏覽器環境。
- **Git**：不自動 commit，由使用者審查後手動 commit。

## 架構決策

開發過程中記錄的跨模組決策。模組層級的決策記錄在各模組的已知風險或禁止事項中。

| 標題 | 選擇 | 影響模組 | 理由 |
|------|------|----------|------|
|（尚無記錄）| | | |

## 模組列表

- [core-foundation](youtube-cleaner/core-foundation.md) — 核心基礎層
- [data-definitions](youtube-cleaner/data-definitions.md) — 資料定義層
- [feature-engine](youtube-cleaner/feature-engine.md) — 功能引擎層
- [user-interface](youtube-cleaner/user-interface.md) — 使用者介面層

## 模組摘要

### core-foundation — 核心基礎層

擁有：`src/core/`（config.ts、types.ts、utils.ts、stats.ts、logger.ts、constants.ts）

此模組是整座專案的基礎層。它提供設定管理（ConfigManager 單例，包裝 GM_getValue/GM_setValue）、YouTube 全域型別宣告、通用工具函式（parseNumeric、parseDuration、debounce、throttle、cleanChannelName）、過濾統計（FilterStats）、除錯日誌（Logger），以及頻道名稱清洗規則。

**何時從這裡開始：**
- 需要新增、修改或理解設定鍵（ConfigState / RuleEnables）時。
- 需要新增通用工具函式或修改 parse 邏輯時。
- 設定儲存/讀取行為異常時。
- 需要理解 YouTube 內部型別（yt.config_ / ytcfg.data_）時。

### data-definitions — 資料定義層

擁有：`src/data/`（rules.ts、selectors.ts、default-section-blacklist.ts、i18n-filter-patterns.ts、rule-names.ts）

此模組定義所有靜態資料：過濾規則定義（RuleDefinition 陣列，含 id、預設啟用狀態、優先級、白名單範圍、文字規則）、DOM 選擇器（SELECTORS 物件，含影片容器、區段容器、metadata、徽章）、預設區段黑名單、多語系過濾正則模式，以及規則名稱翻譯。

**何時從這裡開始：**
- YouTube 改版導致 DOM 結構變更，需要更新 CSS 選擇器時。
- 需要新增或修改過濾規則定義時。
- 需要調整多語系過濾關鍵字時。
- 需要新增預設黑名單項目時。

### feature-engine — 功能引擎層

擁有：`src/features/`（video-filter.ts、filter-engine.ts、filter-types.ts、video-data.ts、dom-visibility.ts、custom-rules.ts、subscription-manager.ts、adblock-guard.ts、style-manager.ts、interaction.ts）

此模組是專案的核心功能層，實作所有執行時期行為：

- **VideoFilter**：MutationObserver 驅動的影片過濾編排器，管理批次處理、閒時回呼、選擇器健康檢查。
- **FilterEngine**：核心過濾邏輯，整合文字規則、區段過濾、強規則（Shorts/廣告/合輯/會員）、弱規則（觀看數/時長/關鍵字/頻道）、白名單判斷。
- **VideoData / LazyVideoData**：DOM 資料惰性提取（標題、頻道、觀看數、時長、Short/會員標記）。
- **DOM Visibility**：隱藏/顯示/還原 DOM 元素，含 FilterStats 記錄。
- **CustomRuleManager**：基於 RuleDefinition 的文字規則匹配引擎。
- **SubscriptionManager**：自動掃描側邊欄與訂閱頁面提取使用者訂閱頻道清單。
- **AdBlockGuard**：透過 patch YouTube 內部 config + MutationObserver 自動拆除反 Adblock 彈窗。
- **StyleManager**：動態 CSS 規則注入（隱藏廣告、Shorts、Premium 橫幅等），含字型修復。
- **InteractionEnhancer**：點擊攔截，將影片點擊改為背景新分頁開啟，支援通知中心。

**何時從這裡開始：**
- 過濾邏輯異常（漏過濾、誤過濾）時。
- 需要新增過濾類型（如新的強規則或弱規則）時。
- Adblock 彈窗處理失效時。
- 點擊行為需要調整時。
- DOM 隱藏/還原機制需要修改時。
- 訂閱掃描邏輯需要更新時。

### user-interface — 使用者介面層

擁有：`src/ui/`（menu.ts、menu-renderer.ts、menu-types.ts、list-manager.ts、settings-io.ts、i18n.ts、i18n-strings.ts）+ `src/styles/`（youtube-cleaner.css）

此模組管理所有使用者互動介面與國際化：

- **UIManager**：選單編排器，管理主選單、過濾選單、名單選單、UX 選單、系統選單的導航與狀態切換。
- **MenuRenderer**：基於 `prompt()` 的純文字選單渲染器。
- **ListManager**：黑白名單的增刪清空還原操作。
- **SettingsIO**：JSON 設定匯出/匯入，含版本驗證與型別正規化。
- **I18N**：多語系支援（繁中/簡中/英文/日文），自動語言偵測，字串查詢，過濾模式本地化。
- **CSS**：基礎靜態樣式（`youtube-cleaner.css`），由 StyleManager 動態注入。

**何時從這裡開始：**
- 選單結構或項目需要調整時。
- 需要新增/修改 UI 文字時（i18n-strings.ts）。
- 設定匯出/匯入邏輯異常時。
- 需要新增語系支援時。
- 黑白名單管理行為需要修改時。
