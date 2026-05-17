# Runtime Bootstrap

## 目前責任

- 負責 userscript 的 app 組裝、啟動順序與頂層 runtime wiring。
- 初始化、SPA navigation refresh、防重複啟動或模組啟動順序相關工作，從這裡開始。

## 範圍

- `src/main.ts`
- `src/meta.json`
- `rollup.config.mjs` 中的 input 與 userscript metadata wiring
- 啟動時使用的 Tampermonkey globals：`GM_registerMenuCommand`、`GM_info` 與 OpenCC 載入狀態檢查

## 依賴與影響

- 依賴 `ConfigManager`、`StyleManager`、`AdBlockGuard`、`VideoFilter`、`InteractionEnhancer`、`UIManager` 與 `Logger`。
- 啟動順序會影響 CSS 注入、彈窗清理、DOM 過濾、click interception 與 menu refresh。
- `yt-navigate-finish` 會影響所有帶有頁面狀態或 cache 的模組。

## 關鍵流程

- `App` 以單一 `ConfigManager` 建立各 runtime service。
- `init()` 啟用 logging、套用 CSS、同步 adblock guard、啟動 filtering、啟動 click interception、註冊設定 menu、綁定 `yt-navigate-finish`、處理目前頁面並掃描訂閱。
- `refresh()` 在設定變更後重新同步 guard、reset hidden state、重套 CSS、重掃頁面並重掃訂閱。
- `window.ytPurifierInitialized` 防止重複初始化。

## 變更入口

- 啟動、refresh、navigation 行為：先看 `src/main.ts`。
- userscript metadata 或 generated header：看 `src/meta.json` 與 `rollup.config.mjs`。
- 需要 browser-like 驗證時，檢查 `test/e2e/*`。

## 變更路線

- 啟動順序變更通常要同步檢查受影響 feature module 與測試。
- 新增 runtime service 時，要在 `App` constructor wiring，決定 refresh 行為，並為可觀察行為補測試。
- metadata 變更需同步 package version 與 release consistency check。

## 已知風險

- YouTube 是 SPA；漏掉 `yt-navigate-finish` refresh 會造成 stale cache 或 hidden marker 殘留。
- 啟動順序不當可能造成 CSS 閃爍、彈窗清理失效或在 `document.body` 未就緒前掃描。
- 根目錄 userscript bundle 是 downstream output；source 變更後若未 build 可能漂移。

## 參考備註

- 無。

## 不要做

- 不要繞過 `ConfigManager` 建立獨立設定狀態。
- 一般 source 變更不要直接修改 `youtube-homepage-cleaner.user.js`。
- 不要在啟動流程加入長時間 polling，而不先評估既有 observer/throttle 模式。
