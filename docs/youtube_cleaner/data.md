# 靜態資料層（data）

## 當前職責

集中管理所有純資料定義：CSS 選擇器、過濾規則、規則名稱、黑名單與語系比對模式。這個模組沒有副作用，只定義資料結構。當你需要新增或修改 CSS 選擇器、調整過濾規則的優先級、修改規則顯示名稱或語系偵測模式時，從這裡開始。

## 範圍

- `src/data/selectors.ts`：SELECTORS，所有 CSS 選擇器集中管理 ← 最常修改的檔案
- `src/data/rules.ts`：RULE_DEFINITIONS，規則定義、優先級與白名單策略
- `src/data/rule-names.ts`：RULE_NAMES，各語系規則顯示名稱
- `src/data/default-section-blacklist.ts`：預設區塊標題黑名單
- `src/data/i18n-filter-patterns.ts`：FILTER_PATTERNS，各語系偵測正則表達式

## 依賴與影響

- 上游：僅依賴 `core/types.ts`（型別定義）
- 下游：被 `features/` 中的所有模組使用
- `features/filter-engine.ts` 是主要消費者，讀取 rules 和 selectors
- `ui/i18n.ts` 讀取 i18n-filter-patterns
- `ui/menu.ts` 讀取 rule-names

## 關鍵流程

1. selectors 定義所有 CSS 選擇器，由 style-manager 和 dom-visibility 使用
2. rules 定義過濾規則的優先級和白名單策略，由 filter-engine 裁決
3. rule-names 提供多語系規則名稱，由 UI 選單使用
4. i18n-filter-patterns 提供語系偵測正則，由 i18n 模組使用

## 變更入口點

- YouTube 改版導致元素失效：從 `selectors.ts` 開始
- 新增過濾規則：同時修改 `rules.ts`、`config.ts`（core）、`rule-names.ts` 三處
- 調整規則優先級：從 `rules.ts` 的優先級欄位開始
- 新增語系支援：從 `i18n-filter-patterns.ts` 開始

## 變更路徑

- 規則同步三聯：`data/rules.ts` ↔ `core/config.ts`（RuleEnables）↔ `data/rule-names.ts`
- Selector 修改後必須跑 E2E 測試驗證真實 YouTube DOM 可命中
- 新增規則需同時補測試（`test/filter-test.ts` 或 `test/filter-engine-test.ts`）

## 已知風險

- CSS 選擇器與 YouTube DOM 結構緊密耦合，YouTube 改版時可能失效
- 規則三聯同步是人工作業，容易遺漏導致不一致
- i18n-filter-patterns 的正則表達式需要涵蓋多語系變體

## 參考筆記

無（獨立模式）

## 禁止事項

- 不要在 data 層引入副作用（DOM 操作、GM API 呼叫、網路請求）
- 不要在此模組中實作過濾邏輯（應在 features 模組）
- 不要將 CSS 選擇器散落到業務模組中
