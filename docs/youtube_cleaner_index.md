# YouTube Cleaner Atlas Index

YouTube Cleaner 是一個 TypeScript Tampermonkey 使用者腳本，在瀏覽器端隱藏 YouTube 干擾元素、套用可設定過濾規則，並改善點擊與反廣告封鎖體驗。日常工作從 atlas 入口技能進入：入口會先讀這份 index、挑選相關模組文件，並自行攜帶調查與變更紀律；本文件只保存導覽地圖。

- 修改或驗證前，先用這份 index 定位相關模組，再進入程式碼。
- 模組細節放在各模組文件中；index 保持高層導覽。
- 重新執行 Codebase Atlas 代表完整重掃目前 repo 並重建 atlas。日常理解、修改、驗證或審查不需要重跑初始化。

工作語言：繁體中文 · 交付：commit and push · 報告：plain

## Project Operating Constraints

以下規則繼承自現有專案指引，所有工作都必須遵守：

- 使用者面向輸出與產生的 atlas 文件使用繁體中文；commit 訊息使用英文並遵循 Conventional Commits。
- 專案維護方向是持續優化現有功能，不預先規劃大型新功能。優先順序是修正既有功能失效或誤過濾、改善效能與長時間穩定性、補強測試與文件、再做小幅使用體驗改善。
- 新功能須同時明確改善現有體驗、不顯著增加維護成本、不依賴不穩定或高風險的 YouTube 內部 API，且預設關閉或能由使用者清楚控制。
- TypeScript 使用 strict 模式；所有新代碼必須能通過 `npm run typecheck`，並遵守 ESLint 設定。
- CSS-First：能用 CSS 隱藏的元素先用 CSS，只有需要解析內容、白名單、觀看數、時長或狀態時才進入 JavaScript 過濾流程。
- 所有 YouTube DOM selector 集中在 `src/data/selectors.ts`；不要在業務模組散落硬編 selector。
- 新增或移除過濾規則時，規則定義、設定型別與規則顯示名稱必須同步；必要時同步 CSS 規則、過濾引擎與測試。
- 不要直接修改 `youtube-homepage-cleaner.user.js`；它是 Rollup 建置輸出，源碼修改從 `src/` 開始。
- `npm run verify` 是主要完整驗證入口，包含 typecheck、lint、unit、build、release consistency。小範圍變更可先跑目標測試，但交付前需按風險補足驗證。
- selector 變更至少要跑 selector 語法與來源檢查；設定匯出/匯入、設定管理、互動增強、過濾規則變更需更新或執行對應測試。
- 發布前需通過版本與 URL 一致性檢查，確保 package、lockfile、metadata、README badge 與 userscript metadata 同步。

## Architecture Decisions

跨模組決策記錄於此；模組層級決策放在各模組文件的 Known Risks 或 Do Not Do。

| 決策 | 選項 | 影響模組 | 理由 |
|------|------|----------|------|
| （尚無） | | | |

## Module List

- [執行入口與打包發布](youtube_cleaner/runtime_bootstrap_packaging.md)
- [設定、儲存與核心工具](youtube_cleaner/configuration_storage_utilities.md)
- [規則目錄、Selector 與靜態資料](youtube_cleaner/rule_catalog_selectors.md)
- [過濾裁決與 DOM 可見性流程](youtube_cleaner/filtering_dom_pipeline.md)
- [頁面防護、CSS 注入與互動增強](youtube_cleaner/page_guards_interactions.md)
- [使用者選單、名單管理與設定匯入匯出](youtube_cleaner/user_interface_settings.md)
- [測試、品質檢查與發布工具](youtube_cleaner/testing_release_tooling.md)

## Module Summaries

### 執行入口與打包發布

擁有 userscript 啟動序列、Tampermonkey metadata、Rollup 打包設定與建置輸出邊界。當任務涉及初始化順序、瀏覽器事件、userscript metadata、OpenCC 載入、版本資訊或打包輸出時，從這裡開始。

### 設定、儲存與核心工具

擁有設定 singleton、Tampermonkey storage key 轉換、runtime 編譯列表、日誌、統計、數字/時間解析與繁簡轉換工具。當任務涉及設定預設值、設定持久化、正則編譯、統計或共用解析行為時，從這裡開始。

### 規則目錄、Selector 與靜態資料

擁有過濾規則定義、規則強弱與白名單範圍、YouTube DOM selector、各語系過濾 pattern、規則名稱與預設區塊黑名單。YouTube DOM 改版、規則增減、selector 修復、語系過濾模式變更都應先從這裡定位。

### 過濾裁決與 DOM 可見性流程

擁有 MutationObserver 掃描、批次處理、影片資料懶讀、過濾裁決、白名單裁決、訂閱保護、自訂文字規則，以及隱藏/還原 DOM 狀態。當任務涉及影片是否該被隱藏、誤過濾、漏過濾、效能批次或訂閱保護時，從這裡開始。

### 頁面防護、CSS 注入與互動增強

擁有 CSS-First 隱藏規則、基礎 CSS 注入、反 Adblock 彈窗處理、YouTube config patch、背景新分頁與通知新分頁點擊邏輯。當任務涉及零閃爍隱藏、廣告/彈窗防護、點擊行為或 YouTube SPA 上的互動衝突時，從這裡開始。

### 使用者選單、名單管理與設定匯入匯出

擁有 Tampermonkey 選單、原生 prompt/alert 渲染、黑白名單 CRUD、精確匹配輸入、語系切換、設定 JSON 匯出/匯入與型別驗證。當任務涉及使用者設定流程、選單文字、名單操作或備份還原時，從這裡開始。

### 測試、品質檢查與發布工具

擁有 npm 指令、JSDOM 測試環境、單元測試 runner、release consistency 檢查、README/meta 版本同步與文件化開發流程。當任務涉及驗證策略、測試新增、發布流程或工具鏈升級時，從這裡開始。
