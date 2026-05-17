# Filter Decision Engine

## 目前責任

- 負責 rule evaluation order、filter reason、whitelist decision、strong/weak rule 行為，以及影片資料到 DOM 隱藏決策的橋接。
- 內容被誤隱藏、誤放行，或 rule priority/whitelist 行為錯誤時，從這裡開始。

## 範圍

- `src/features/filter-engine.ts`
- `src/features/custom-rules.ts`
- `src/features/filter-types.ts`
- `src/data/rules.ts`
- `test/filter-engine-test.ts`、`test/filter-test.ts`、`test/logic-test.ts`

## 依賴與影響

- 依賴 `ConfigManager`、`SELECTORS`、`CustomRuleManager`、`SubscriptionManager`、`LazyVideoData` 與 rule metadata helpers。
- 下游由 `VideoFilter.processElement()` 根據 `FilterDetail` 與 `WhitelistReason` 隱藏或保留 DOM container。
- Subscription protection 只保護特定 weak low-view 規則。

## 關鍵流程

- `findFilterDetail()` 在允許內容的頁面提早返回，然後檢查 text rule、section filter，再依固定順序評估 video rule。
- 目前 rule order：keyword、channel、strong rule、low views、duration、playlist。
- `applyWhitelistDecision()` 處理 subscription protection、members whitelist、strong rule bypass prevention 與 channel/keyword whitelist。
- `checkWhitelist()` 使用 compiled regex，並保留 raw-list fallback。

## 變更入口

- Rule order、whitelist semantics、filter reason：`src/features/filter-engine.ts`。
- Text-rule matching：`src/features/custom-rules.ts`。
- Reason/whitelist type：`src/features/filter-types.ts`。

## 變更路線

- 新行為規則：rule metadata -> config enablement -> filter-engine evaluator -> 必要時新增 LazyVideoData field -> UI labels -> unit tests。
- Whitelist 行為變更必須檢查 strong/weak priority、members-only exception、subscription protection 與 list import/export。
- Rule order 變更應更新 precedence 測試。

## 已知風險

- Rule order 是使用者可觀察行為；同一影片可能命中多條規則，但第一個 reason 會決定 log 與 stats。
- Strong rule 會刻意繞過一般白名單；改動會影響產品過濾模型。
- Members-only 有 members whitelist 特殊通道，不應意外併入一般 channel whitelist。

## 參考備註

- 無。

## 不要做

- 不要在此模組直接加入 DOM extraction；應放在 `LazyVideoData`。
- 不要未經明確產品決策就讓 subscription protection 放行所有 weak rule。
- 不要改 strong-rule semantics 卻不更新文件、測試與 UI 預期。
