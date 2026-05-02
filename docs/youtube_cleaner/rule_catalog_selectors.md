# Rule Catalog Selectors

## 目前狀態

- `src/data/rules.ts` 定義規則 ID、預設開關、預設 priority、白名單範圍與文字規則。
- `src/data/selectors.ts` 集中管理 YouTube DOM selector，包括影片容器、區塊容器、metadata、badges、clickable、link candidates 與互動排除。
- 這個模組是 YouTube DOM 改版時最常被修改的資料層。

## 範圍

- 主要檔案：`src/data/rules.ts`、`src/data/selectors.ts`。
- 相關資料：`src/data/rule-names.ts`、`src/data/i18n-filter-patterns.ts`、`src/data/default-section-blacklist.ts`。
- 相關測試：`test/selectors-test.ts`、`test/e2e/youtube-selectors.spec.ts`、多個 filter/unit tests。

## 上游依賴

- YouTube 實際 DOM tag、class、aria-label、link pattern 與 shelf 結構。
- `ConfigManager` 讀取 `RULE_ENABLES`、`RULE_PRIORITIES` 與 default section blacklist。
- `I18N` 提供語系與 rule names，讓規則在 UI 中可讀。

## 下游影響

- `StyleManager` 用 `RULE_ENABLES` 與 selector map 產生 CSS-first 規則。
- `LazyVideoData` 依賴 metadata selectors 抽取 title、channel、views、duration 與 link。
- `VideoFilter` 依賴 container selectors 找掃描候選與 selector health check。
- `InteractionEnhancer` 依賴 clickable、link candidates 與 exclusion selectors 判斷 click 行為。

## 關鍵流程

- 規則定義從 `RULE_DEFINITIONS` 產生預設開關與預設強弱優先級。
- `getWhitelistScope()` 與 `isStrongRule()` 讓 `FilterEngine` 判斷白名單是否能豁免規則。
- `SELECTORS.allContainers` 與 `SELECTORS.videoContainersStr` 是組合後的 runtime 查詢字串。
- `SELECTORS.METADATA` 同時支援 YouTube 舊版 renderer 與新版 `yt-lockup-view-model` 類結構。

## 常見變更入口

- YouTube selector 失效：先看 `src/data/selectors.ts`，再跑 `npm run test:e2e:selectors` 或相關 e2e。
- 新增 selector-based rule：改 `rules.ts`、`config.ts` 的 `RuleEnables`，再改 `StyleManager` selector map。
- 新增 text rule：改 `rules.ts` 的 `textRules`，同步 `rule-names.ts` 與測試。
- 調整白名單行為：改 `whitelistScope` 或 `defaultPriority` 前，先看 `FilterEngine.applyWhitelistDecision()`。

## 已知風險

- YouTube DOM 高變動，selector 必須保守擴充並有健康檢查。
- `:has()` 規則相容性與效能需注意，尤其在首頁大量節點上。
- 規則 ID 是設定、UI、統計與測試共同引用的 contract；改名等同 migration。

## 不要做

- 不要在 feature 或 UI 檔案中散落新的 YouTube selector；優先集中到 `src/data/selectors.ts`。
- 不要新增規則但不補 `RuleEnables`、rule names 或測試。
- 不要把強規則改成可白名單豁免，除非已明確檢查誤放行與 product intent。
