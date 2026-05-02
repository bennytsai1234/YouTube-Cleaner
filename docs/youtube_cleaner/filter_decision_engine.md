# Filter Decision Engine

## 目前狀態

- `src/features/filter-engine.ts` 是過濾裁決中心，依序處理 text rules、section blacklist、影片型元素判斷、關鍵字、頻道、強規則、低觀看數、時長與 playlist。
- `src/features/custom-rules.ts` 將 `RULE_DEFINITIONS.textRules` 套用到元素文字。
- `src/features/filter-types.ts` 定義 `FilterDetail` 與 `WhitelistReason`。

## 範圍

- 主要檔案：`src/features/filter-engine.ts`、`src/features/custom-rules.ts`、`src/features/filter-types.ts`。
- 邊界檔案：`src/data/rules.ts`、`src/features/video-data.ts`、`src/features/subscription-manager.ts`、`src/core/config.ts`。
- 相關測試：`test/filter-engine-test.ts`、`test/filter-test.ts`、`test/logic-test.ts`、`test/e2e/keyword.spec.ts`、`test/e2e/whitelist.spec.ts`、`test/e2e/low-views.spec.ts`。

## 上游依賴

- `ConfigManager` 提供規則開關、優先級、黑白名單、門檻、duration 範圍與 region convert 設定。
- `LazyVideoData` 提供已解析的影片資料。
- `getWhitelistScope()` 與 `isStrongRule()` 來自 `src/data/rules.ts`。
- `SubscriptionManager` 提供訂閱頻道保護。

## 下游影響

- `VideoFilter.processElement()` 依賴 `findFilterDetail()` 與 `applyWhitelistDecision()` 決定標記或隱藏。
- `dom-visibility.hideElement()` 使用 `FilterDetail.reason` 記錄統計與 debug log。
- UI rule toggles 和 priority 設定會直接改變裁決結果。

## 關鍵流程

- `findFilterDetail(element, allowPageContent)` 在允許內容頁面直接不過濾，避免 playlist/library/subscription/channel 頁誤傷。
- Text rule 與 section blacklist 先於影片型資料抽取執行。
- 對影片容器建立 `LazyVideoData` 後，依序判斷 keyword、channel、strong rule、view、duration、playlist。
- `applyWhitelistDecision()` 只讓符合 scope 且非 strong rule 的結果被白名單豁免；訂閱保護目前只豁免 low view 類規則。

## 常見變更入口

- 過濾順序需要調整：看 `findFilterDetail()` return chain。
- 白名單行為不符合預期：看 `applyWhitelistDecision()`、`getWhitelistScope()`、`RULE_PRIORITIES`。
- 新增裁決 reason：同步 `FilterDetail` 使用端、統計顯示、rule names、測試與 e2e。
- 低觀看數或時長規則變更：看 `getFilterView()`、`getFilterDuration()` 與 `ConfigManager` 門檻設定。

## 已知風險

- 裁決順序會影響使用者看到的 reason，也會影響白名單是否有機會介入。
- `allowPageContent` 是防誤傷核心；繞過它會讓播放清單、訂閱、頻道頁出現大面積隱藏。
- 強規則與 `members` scope 的例外邏輯容易互相混淆，改動時必須補測試。

## 不要做

- 不要在這裡新增直接 DOM 隱藏；裁決只回傳 `FilterDetail`。
- 不要讓訂閱保護豁免 keyword、channel blacklist 或 members 內容，除非 product 規則明確改變。
- 不要新增 reason 但不更新 rule catalog、UI 名稱與測試。
