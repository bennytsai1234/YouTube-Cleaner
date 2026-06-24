# 過濾裁決與 DOM 可見性流程

## Responsibility

- 擁有 YouTube DOM 掃描、批次處理、影片資料懶讀、過濾裁決、白名單裁決、訂閱保護、自訂文字規則，以及 DOM 隱藏/還原狀態。
- 當未來工作涉及影片被隱藏或未被隱藏、誤判、漏判、低觀看數、時長、關鍵字、頻道、會員影片、推薦合輯、訂閱保護或 MutationObserver 效能時，從這裡開始。

## Scope

- 代表範圍：`src/features/video-filter.ts`、`src/features/filter-engine.ts`、`src/features/video-data.ts`、`src/features/dom-visibility.ts`、`src/features/custom-rules.ts`、`src/features/subscription-manager.ts`、`src/features/filter-types.ts`。
- Public surface：`VideoFilter.start/stop/processPage/processElement/clearCache/reset/scanSubscriptions()`、`FilterEngine.findFilterDetail/applyWhitelistDecision()`、`LazyVideoData` getters。
- 相關測試：`test/filter-test.ts`、`test/filter-engine-test.ts`、`test/logic-test.ts`。

## Dependencies & Impact

- 依賴設定與規則目錄取得開關、優先級、白名單範圍與 selector；依賴 I18N pattern 和 Utils 解析 metadata。
- DOM 可見性會寫入 `data-yp-*` 標記並改 inline style；互動增強會避開被隱藏元素。
- 訂閱保護會寫入設定中的訂閱頻道快取；它只應豁免低觀看數類規則，不應放行關鍵字或頻道黑名單。

## Key Flows

- MutationObserver：新增節點進入候選集合；大量 mutation 時退回整頁掃描；候選用 `requestIdleCallback` 以批次處理。
- 單元素流程：找外層過濾容器 → 跳過已檢查/已隱藏 → 原生 hidden 直接記錄 → 允許內容頁面跳過 → 找過濾 detail → 套用白名單裁決 → 隱藏或標記已檢查。
- 裁決順序：自訂文字規則 → 區塊黑名單 → 影片元素判斷 → 關鍵字 → 頻道 → 強規則 → 觀看數 → 時長 → 推薦播放清單。
- 影片資料：`LazyVideoData` 只在需要時讀 title/channel/url/views/live viewers/time/duration/badges/playlist，並快取 getter 結果。
- 隱藏/還原：隱藏時保存原 inline style，reset/clear 時還原；這避免 refresh 後留下破壞性 style。

## Change Entry Points & Routes

- 誤過濾/漏過濾：先判斷是 selector 抽不到資料、資料解析錯、規則裁決錯、白名單裁決錯，或 DOM 還原錯。
- 低觀看數、時長、直播觀看數：從 `FilterEngine` 對應方法與 `LazyVideoData` metadata 解析開始。
- 白名單問題：從 `applyWhitelistDecision()`、`checkWhitelist()`、規則 whitelist scope 與 compiled lists 開始。
- 訂閱保護問題：從 `SubscriptionManager.scan/isSubscribed()` 和設定中的 `SUBSCRIBED_CHANNELS` 開始。
- DOM 標記或重掃問題：從 `VideoFilter.clearCache/reset/processMutations()` 與 `dom-visibility` 開始。

## Known Risks

- YouTube 會重用 DOM 節點；若不清除 `data-yp-checked`，SPA 導航後可能漏掃。
- requestIdleCallback 批次有效能優勢，但也會讓非同步測試或重現需要處理排程。
- `innerText` 可能造成 reflow；訂閱掃描刻意使用 textContent。
- 白名單只對部分規則有效；調整強弱規則可能造成使用者以為白名單失效。
- DOM 還原必須保留原始 inline style，否則會破壞 YouTube 原生版面或其他擴充套件樣式。

## Do Not Do

- 不要在沒有 root-cause 證據時直接調整裁決順序；先建立能重現的 DOM fixture 或測試。
- 不要讓訂閱保護豁免所有規則；目前設計只保護低觀看數類規則。
- 不要把需要資料解析的行為改成純 CSS 隱藏，除非確認不需要白名單或內容判斷。
