# YouTube Cleaner Atlas Index

## 目的與使用方式

- 修改或驗證前，先用這份 index 定位相關模組，再進入程式碼。
- 本文件維持高層次導覽；模組細節放在各模組文件中。
- Codebase Atlas 通常只需初始化一次。
- 後續理解、修改、驗證或混合型任務，請使用下方 main workflow，不要重新執行 Codebase Atlas。
- 只有使用者明確要求 rebuild、refresh、regenerate 或 rescan 時，才重新完整掃描並重建 atlas。

## 初始決策

- Atlas 模式：standalone。
- 工作語言：繁體中文，因為 README、開發指南、roadmap 與維護文件主要使用繁體中文。
- 參考模板：無。此 atlas 只根據本 repository 建立。
- 交付策略：驗證完成後建立本地 commit 並推送。
- 報告層級：技術細節。對使用者回報時，可包含檔名、模組名與相關程式脈絡。
- 工作入口：通用 docs adapter、Claude Code adapter、Codex adapter。

已生成入口：

- 通用 adapter：[youtube_cleaner_adapter.md](youtube_cleaner_adapter.md)
- Claude Code adapter：[../.claude/skills/youtube-cleaner-atlas.md](../.claude/skills/youtube-cleaner-atlas.md)
- Codex adapter：[../.agents/skills/youtube-cleaner/SKILL.md](../.agents/skills/youtube-cleaner/SKILL.md)

## 專案操作限制

以下規則繼承自既有專案文件，所有工作流程都必須遵守：

- 原始碼變更從 `src/` 開始；一般情況不要直接修改根目錄的建置輸出 `youtube-homepage-cleaner.user.js`。
- 本專案是 TypeScript Tampermonkey userscript，透過 Rollup 打包為單一 IIFE bundle。
- 遵守 `DEVELOPMENT.md` 的 CSS-first 原則：能用 CSS 隱藏的內容，先使用 CSS，再考慮 JavaScript DOM 解析。
- YouTube selector 必須集中維護在 `src/data/selectors.ts`。
- 規則 id、預設開關、優先級、白名單範圍、UI 顯示名稱與測試必須保持同步。
- 核心 runtime 依賴維持最小；OpenCC 由 userscript/CDN 載入，且不可用時必須 graceful degradation。
- 設定 UI 使用 Tampermonkey 原生 API（`GM_registerMenuCommand`、`prompt`、`alert`），不要為一般設定工作注入 React/Vue UI。
- Release 工作必須保持 `package.json`、`package-lock.json`、`src/meta.json`、README badge 與 `youtube-homepage-cleaner.user.js` 版本一致。
- 主要完整驗證入口是 `npm run verify`；小範圍變更可先跑目標測試，但 release 與大範圍重構應跑完整驗證。
- E2E 主要覆蓋穩定的公開 YouTube 頁面與 selector health；`playwright/.auth/` 的登入狀態不可提交。
- Roadmap 目前是維護導向：優先穩定性、效能、selector 韌性、測試與文件；避免明顯增加維護成本的功能。
- 正式 commit 使用 Conventional Commits。`GEMINI.md` 中 Gemini 專用的逐檔 backup commit 規則，不作為所有平台的通用強制規則。

## 架構決策

跨模組決策記錄於此。模組內決策記錄於各模組的 Known Risks 或 Do Not Do 區段。

| 日期 | 決策 | 範圍 | 備註 |
| --- | --- | --- | --- |
|  |  |  |  |

## 工作流程文件

- Main workflow：[youtube_cleaner_main_workflow.md](youtube_cleaner_main_workflow.md)
- Understand workflow：[youtube_cleaner_understand_workflow.md](youtube_cleaner_understand_workflow.md)
- Change workflow：[youtube_cleaner_change_workflow.md](youtube_cleaner_change_workflow.md)
- Validate workflow：[youtube_cleaner_validate_workflow.md](youtube_cleaner_validate_workflow.md)

## 模組列表

- [Runtime Bootstrap](youtube_cleaner/runtime_bootstrap.md)
- [Configuration And Storage](youtube_cleaner/configuration_storage.md)
- [Rule Catalog And Selectors](youtube_cleaner/rule_catalog_selectors.md)
- [Filter Decision Engine](youtube_cleaner/filter_decision_engine.md)
- [DOM Scanning And Visibility](youtube_cleaner/dom_scanning_visibility.md)
- [Video Data Extraction](youtube_cleaner/video_data_extraction.md)
- [Subscription Protection](youtube_cleaner/subscription_protection.md)
- [CSS And Adblock Guard](youtube_cleaner/css_adblock_guard.md)
- [Interaction And UI](youtube_cleaner/interaction_ui.md)
- [I18n And Localization](youtube_cleaner/i18n_localization.md)
- [Testing And Release Tooling](youtube_cleaner/testing_release_tooling.md)

## 模組摘要

- Runtime Bootstrap 負責 app 組裝、啟動順序、Tampermonkey menu 註冊、SPA navigation refresh 與防重複初始化。腳本沒有啟動、YouTube navigation 後沒有重新掃描或啟動順序有疑慮時，從這裡開始。
- Configuration And Storage 負責預設設定、GM storage key、型別化設定狀態、runtime regex cache 與 reset 行為。新增設定、變更預設值、匯入設定或排查儲存值時，從這裡開始。
- Rule Catalog And Selectors 負責規則定義、優先級、白名單範圍、selector、區塊標題與規則名稱。新增過濾規則、YouTube DOM selector 漂移或 selector health 失敗時，從這裡開始。
- Filter Decision Engine 負責規則判斷順序、白名單裁決、強弱規則語意，以及從影片資料到過濾原因的決策。影片被誤隱藏或誤放行時，從這裡開始。
- DOM Scanning And Visibility 負責 MutationObserver 排程、頁面放行規則、元素處理、hidden-state marker、cache clearing 與 style restoration。效能、SPA 轉場、重複處理或 stale hidden state 問題從這裡開始。
- Video Data Extraction 負責從 YouTube DOM 卡片懶惰抽取 title、channel、url、views、time、duration、members、playlist 與 Shorts 狀態。metadata parsing、觀看數門檻、時長或 playlist 偵測錯誤時，從這裡開始。
- Subscription Protection 負責訂閱頻道探索、快取、observer lifecycle 與低觀看數規則的訂閱保護。已訂閱頻道仍被低觀看數過濾時，從這裡開始。
- CSS And Adblock Guard 負責靜態 CSS 注入、CSS-first 隱藏、font fix、anti-adblock config patch、popup detection、backdrop cleanup 與恢復播放。零閃爍隱藏、廣告封鎖彈窗或 CSS 規則問題從這裡開始。
- Interaction And UI 負責 click interception、新分頁行為、原生 menu flow、名單管理、統計顯示、語言切換與設定匯入匯出。Tampermonkey menu、背景開啟或備份還原問題從這裡開始。
- I18n And Localization 負責支援語言、UI strings、本地化 filter pattern、規則顯示名稱與預設區塊黑名單。翻譯或語系敏感過濾問題從這裡開始。
- Testing And Release Tooling 負責 npm scripts、Rollup output、TypeScript/ESLint config、Playwright tests、release consistency scripts 與 GitHub Actions。CI、release、dependency upgrade 或驗證策略從這裡開始。
