# Interaction Enhancement

## 目前狀態

- `src/features/interaction.ts` 在 capture phase 監聽 document click，依設定讓影片、Shorts、playlist、通知與部分導覽連結改以新分頁開啟。
- `OPEN_IN_NEW_TAB` 控制一般影片與導覽，`OPEN_NOTIFICATIONS_IN_NEW_TAB` 控制通知面板。
- 此模組避免干擾按鈕、選單、訂閱、播放控制列等互動元素。

## 範圍

- 主要檔案：`src/features/interaction.ts`。
- 邊界檔案：`src/data/selectors.ts`、`src/core/config.ts`、`src/main.ts`。
- 相關測試：`test/interaction-test.ts`、`test/e2e/settings-menu.spec.ts`、通知與 link 行為 e2e。

## 上游依賴

- `ConfigManager` 的 `OPEN_IN_NEW_TAB`、`OPEN_NOTIFICATIONS_IN_NEW_TAB`。
- `SELECTORS.LINK_CANDIDATES`、`CLICKABLE`、`PREVIEW_PLAYER`、`INTERACTION_EXCLUDE`。
- Browser click event、modifier keys、`window.open()` 與 URL parsing。
- YouTube link DOM 與 SPA routing 行為。

## 下游影響

- 使用者瀏覽體驗與 YouTube 原生 SPA navigation。
- 被隱藏元素的 click 會被略過，避免使用者點到已過濾內容。
- Selector 變更會同時影響資料抽取與 interaction link selection。

## 關鍵流程

- 若 click target 在 `[data-yp-hidden]` 內，直接返回。
- 通知新分頁邏輯優先，處理 `ytd-notification-renderer`、comment video thumbnail 與 multi-page menu sections。
- 一般新分頁邏輯只處理左鍵、無 modifier key、非排除互動元素。
- `findPrimaryLink()` 依 link candidates 找主要 watch、shorts 或 playlist link，最後驗證 hostname 是 YouTube。

## 常見變更入口

- 新版 YouTube 卡片點擊無效：先更新 `SELECTORS.CLICKABLE` 與 `LINK_CANDIDATES`。
- 按鈕被誤攔截：更新 `SELECTORS.INTERACTION_EXCLUDE`。
- 通知影片沒有新分頁：看 notification panel selector 與 link closest 條件。
- 頻道連結或 guide link 行為異常：看 `channelLink` 與 `ytd-guide-entry-renderer` 分支。

## 已知風險

- Capture phase 使用 `stopImmediatePropagation()`，selector 過寬會阻斷 YouTube 原生操作。
- `window.open()` 可能受瀏覽器 popup policy 或 Tampermonkey 環境影響。
- YouTube SPA link 結構常變，link candidates 需和 selector e2e 一起維護。

## 不要做

- 不要在不檢查 modifier keys 的情況下攔截所有 click。
- 不要讓 click handler 處理已排除的 menu、button、player control 或 subscribe UI。
- 不要把非 YouTube hostname 直接丟給 `window.open()`。
