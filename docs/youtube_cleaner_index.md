# YouTube Cleaner Module Index

## 目的與使用原則

- 這份 Atlas 是後續修改前的導覽層；先用它定位模組，再進入程式碼。
- 本文件維持高層次摘要；模組細節放在 `docs/youtube_cleaner/` 內。
- Codebase Atlas 通常只在開發環境就緒後初始化一次。
- 後續 bug fix、feature、optimization 請使用本 repo 產出的工作流文件，不要重新執行 Codebase Atlas。
- 只有使用者明確要求 rebuild、refresh、regenerate 或 rescan 時，才重新執行 Codebase Atlas；這代表要完整重掃目前 codebase，並依現況重建 index 與模組文件。
- 本次模式為 standalone：目前 repo 是唯一來源，沒有外部參考材料。

## 工作流入口

- Bug 修復：[`youtube_cleaner_bug_workflow.md`](youtube_cleaner_bug_workflow.md)
- 新功能：[`youtube_cleaner_feature_workflow.md`](youtube_cleaner_feature_workflow.md)
- 最佳化：[`youtube_cleaner_optimization_workflow.md`](youtube_cleaner_optimization_workflow.md)

## 模組列表

- [`runtime_bootstrap.md`](youtube_cleaner/runtime_bootstrap.md)
- [`configuration_storage.md`](youtube_cleaner/configuration_storage.md)
- [`rule_catalog_selectors.md`](youtube_cleaner/rule_catalog_selectors.md)
- [`i18n_localization.md`](youtube_cleaner/i18n_localization.md)
- [`video_data_extraction.md`](youtube_cleaner/video_data_extraction.md)
- [`filter_decision_engine.md`](youtube_cleaner/filter_decision_engine.md)
- [`dom_scanning_visibility.md`](youtube_cleaner/dom_scanning_visibility.md)
- [`subscription_protection.md`](youtube_cleaner/subscription_protection.md)
- [`css_adblock_guard.md`](youtube_cleaner/css_adblock_guard.md)
- [`interaction_enhancement.md`](youtube_cleaner/interaction_enhancement.md)
- [`menu_settings_io.md`](youtube_cleaner/menu_settings_io.md)
- [`testing_release_tooling.md`](youtube_cleaner/testing_release_tooling.md)

## 模組摘要

### Runtime Bootstrap

`src/main.ts` 是 composition root，組裝 `ConfigManager`、`StyleManager`、`AdBlockGuard`、`VideoFilter`、`InteractionEnhancer` 與 `UIManager`。`src/meta.json`、`rollup.config.mjs` 與根目錄 `youtube-homepage-cleaner.user.js` 共同定義 userscript 的 metadata、打包入口與發布輸出。

### Configuration Storage

`src/core/config.ts` 管理 Tampermonkey `GM_getValue` / `GM_setValue` 狀態、預設值、規則開關、規則優先級與 runtime RegExp cache。任何新增設定 key 都會影響 UI、匯出匯入、測試與 release consistency。

### Rule Catalog Selectors

`src/data/rules.ts` 與 `src/data/selectors.ts` 是過濾規則與 YouTube DOM selector 的主要來源。YouTube DOM 改版、規則新增、強弱規則調整或 selector 健康檢查失敗時，通常先從這個模組定位。

### I18n Localization

`src/ui/i18n.ts`、`src/ui/i18n-strings.ts` 與 `src/data/*i18n*` 類資料提供 UI 文案、語系偵測、規則名稱、區塊黑名單與多語過濾正則。涉及繁中、簡中、英文、日文文案或偵測語意時，需要同步檢查此模組。

### Video Data Extraction

`src/features/video-data.ts` 與 `src/core/utils.ts` 負責從 YouTube DOM 卡片懶惰抽取 title、channel、url、views、duration、time ago、Shorts、members 與 playlist 狀態。觀看數、時間、繁簡轉換、頻道名清洗或 metadata selector 變更會先影響這裡。

### Filter Decision Engine

`src/features/filter-engine.ts` 與 `src/features/custom-rules.ts` 負責把規則、設定、影片資料、白名單範圍與訂閱保護合併成「是否隱藏」的裁決。過濾誤判、白名單失效、強弱規則互動與觸發原因記錄主要落在這個模組。

### DOM Scanning Visibility

`src/features/video-filter.ts` 管理 `MutationObserver`、批次處理、SPA navigation 後重新掃描與 selector health check；`src/features/dom-visibility.ts` 負責標記、隱藏、還原 DOM 狀態。效能、長時間使用穩定性與頁面重掃風險集中在這裡。

### Subscription Protection

`src/features/subscription-manager.ts` 掃描 YouTube 側邊欄或訂閱頁，維護 `SUBSCRIBED_CHANNELS` cache，並供 `FilterEngine.applyWhitelistDecision()` 豁免低觀看數規則。變更這裡會影響訂閱保護的準確度、儲存量與誤放行風險。

### CSS AdBlock Guard

`src/features/style-manager.ts`、`src/styles/youtube-cleaner.css` 與 `src/features/adblock-guard.ts` 覆蓋 CSS-first 隱藏、基礎 anti-adblock CSS、YouTube config patch 與彈窗清理。這是降低閃爍、避免 overlay 阻斷播放與維持輕量的主要層。

### Interaction Enhancement

`src/features/interaction.ts` 以 click capture 攔截 YouTube 影片、通知與導覽連結，依設定改為新分頁開啟。此模組高度依賴 `SELECTORS.LINK_CANDIDATES`、`CLICKABLE` 與 `INTERACTION_EXCLUDE`。

### Menu Settings IO

`src/ui/menu.ts`、`menu-renderer.ts`、`list-manager.ts`、`settings-io.ts` 與 `menu-types.ts` 提供 Tampermonkey prompt/alert 選單、名單 CRUD、語言切換、統計顯示與設定 JSON 匯出匯入。使用者可見設定流程與備份相容性集中在這裡。

### Testing Release Tooling

`package.json` scripts、`test/`、`playwright.config.ts`、`scripts/check-release-consistency.js` 與 `scripts/update-readme.js` 定義本 repo 的驗證、E2E、版本同步與發布前檢查。跨模組改動應回到這裡選擇合適測試。
