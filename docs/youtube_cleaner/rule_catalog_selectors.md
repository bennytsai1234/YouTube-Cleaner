# Rule Catalog And Selectors

## 目前責任

- 負責 filter rule id、預設開關、priority、whitelist scope、本地化 rule name、預設區塊黑名單與 YouTube DOM selector。
- 新增規則、selector drift、rule toggle 或 selector health failure，從這裡開始。

## 範圍

- `src/data/rules.ts`
- `src/data/selectors.ts`
- `src/data/rule-names.ts`
- `src/data/default-section-blacklist.ts`
- `src/data/i18n-filter-patterns.ts`
- `test/selectors-test.ts` 與 `test/e2e/youtube-selectors.spec.ts`

## 依賴與影響

- `FilterEngine`、`VideoFilter`、`LazyVideoData`、`StyleManager` 與 `InteractionEnhancer` 消費 selector 與 rule metadata。
- `ConfigManager` 從此模組建立 `RULE_ENABLES` 與 `RULE_PRIORITIES`。
- UI rule label 透過 i18n 模組依賴 `RULE_NAMES`。

## 關鍵流程

- `RULE_DEFINITIONS` 描述每個 rule 的 id、預設開關、預設 priority、whitelist scope 與 textRules。
- selector 常數分組管理 video container、section container、metadata、badge、clickable surface 與 link candidate。
- `allContainers` 與 `videoContainersStr` 支援掃描與 CSS generation。
- Playwright selector health check 驗證公開 YouTube DOM 仍能命中必要 selector。

## 變更入口

- 新過濾規則：`src/data/rules.ts`。
- YouTube DOM 變更：`src/data/selectors.ts`。
- 規則顯示名稱：`src/data/rule-names.ts`。
- 區塊標題黑名單：`src/data/default-section-blacklist.ts`。

## 變更路線

- Selector 變更：更新 selector 常數 -> 檢查 `video-data`、`video-filter`、`style-manager`、`interaction` 消費面 -> 可用時跑 `npm run test:e2e:selectors`。
- Rule 變更：更新 `RULE_DEFINITIONS` -> 必要時更新 `RuleEnables` -> 更新 display names -> 更新 priority/enablement 測試。
- Text pattern 變更需檢查 localization patterns 與 region conversion。

## 已知風險

- YouTube DOM 與 A/B test 變動頻繁，selector fallback 要保持韌性。
- CSS `:has()` 規則強大但可能受瀏覽器支援與 selector 成本影響。
- Rule id 漂移會破壞 persisted `RULE_ENABLES`、UI label 與測試。

## 參考備註

- 無。

## 不要做

- 不要把應集中管理的 YouTube selector 分散到 feature module。
- 不要新增 rule id 卻沒有決定 priority 與 whitelist scope。
- DOM-facing selector 編輯後，不要跳過 selector 測試。
