# Runtime Bootstrap

## 目前狀態

- `src/main.ts` 是 userscript 的 composition root，負責建立核心服務、套用 CSS、啟動 observer、註冊 Tampermonkey 選單與處理 YouTube SPA navigation。
- `src/meta.json` 定義 userscript metadata、`@match`、`@exclude`、`@require opencc-js`、GM grants、`downloadURL` 與 `updateURL`。
- `rollup.config.mjs` 以 `src/main.ts` 為入口，輸出根目錄 `youtube-homepage-cleaner.user.js` 的 IIFE userscript，並由 `rollup-plugin-userscript-metablock` 注入 metadata。

## 範圍

- 主要檔案：`src/main.ts`、`src/meta.json`、`rollup.config.mjs`、`youtube-homepage-cleaner.user.js`。
- 相關命令：`npm run build`、`npm run dev`、`npm run check:release`。
- 入口事件：`DOMContentLoaded`、`yt-navigate-finish`、`GM_registerMenuCommand`。

## 上游依賴

- `ConfigManager` 提供 runtime 設定與 `DEBUG_MODE`。
- `StyleManager`、`AdBlockGuard`、`VideoFilter`、`InteractionEnhancer`、`UIManager` 是啟動時組裝的下游服務。
- Tampermonkey 提供 `GM_info`、`GM_registerMenuCommand` 與 userscript 執行環境。
- YouTube SPA 觸發 `yt-navigate-finish`，讓腳本重新 patch、清快取與掃描。

## 下游影響

- 初始化順序會影響 CSS-first 隱藏是否及時、adblock patch 是否早於 YouTube popup、filter cache 是否在 SPA navigation 後失效。
- `src/meta.json` 或 `rollup.config.mjs` 變更會影響安裝腳本、release consistency、README 安裝連結與根目錄輸出檔。
- 防重複初始化旗標 `window.ytPurifierInitialized` 失效會造成多重 observer 或 click handler。

## 關鍵流程

- `new App()` 建立所有 runtime 模組並注入同一個 `ConfigManager`。
- `App.init()` 依序設定 log、套用 style、同步 adblock guard、啟動 video filter、啟動 interaction enhancer、註冊設定選單。
- `yt-navigate-finish` 後重新 `patchConfig()`、`clearCache()`、`processPage()`、`checkAndClean()` 並背景掃描訂閱。
- script 在 `document-start` 執行，但若 DOM 尚未 ready，會延後到 `DOMContentLoaded` 初始化。

## 常見變更入口

- 調整啟動順序：先看 `src/main.ts` 的 `App.init()`。
- 新增長生命週期模組：先在 `App` constructor 注入 `ConfigManager`，再決定是否需要 `refresh()`。
- 更動 userscript 權限或外部 CDN：先改 `src/meta.json`，再跑 `npm run build` 與 `npm run check:release`。
- 發布輸出不一致：先看 `rollup.config.mjs`、`scripts/check-release-consistency.js`、根目錄 `youtube-homepage-cleaner.user.js`。

## 已知風險

- `yt-navigate-finish` 是 YouTube 內部 SPA 事件，若 YouTube 行為改變，重新掃描可能不觸發。
- `OpenCC` 由 metadata `@require` 載入；CDN 失效時功能會降級，但啟動流程仍需容忍 `OpenCC` 未定義。
- 直接修改 `youtube-homepage-cleaner.user.js` 會被下一次 build 覆蓋，且可能破壞 release consistency。

## 不要做

- 不要把業務規則塞進 `src/main.ts`；保持它作為組合根。
- 不要直接維護根目錄 generated userscript；修改 `src/` 或 metadata 後重新 build。
- 不要新增需要持久化狀態的模組但跳過 `ConfigManager`，否則匯出匯入與測試 mock 會分裂。
