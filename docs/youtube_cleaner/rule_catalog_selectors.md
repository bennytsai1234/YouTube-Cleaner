# 規則目錄、Selector 與靜態資料

## Responsibility

- 擁有過濾規則目錄、規則預設開關、強/弱優先級、白名單範圍、文字規則、YouTube DOM selector、規則顯示名稱、多語系過濾 pattern 與預設區塊黑名單。
- 當 YouTube DOM 改版、selector 失效、要新增/停用規則、修正規則名稱或調整語系匹配時，從這個模組開始。

## Scope

- 代表範圍：`src/data/rules.ts`、`src/data/selectors.ts`、`src/data/rule-names.ts`、`src/data/i18n-filter-patterns.ts`、`src/data/default-section-blacklist.ts`。
- Public surface：`RULE_DEFINITIONS`、`buildDefaultRuleEnables()`、`buildDefaultRulePriorities()`、`getTextRuleDefinitions()`、`getWhitelistScope()`、`isStrongRule()`、`SELECTORS`。
- 相關測試：`test/selectors-test.ts`、規則與過濾引擎相關的 unit tests。

## Dependencies & Impact

- 設定 defaults 從規則目錄建立 `RULE_ENABLES` 與 `RULE_PRIORITIES`；規則資料變更會影響 UI 切換、過濾裁決與 CSS 注入。
- 過濾流程、影片資料抽取、CSS 注入與互動增強都依賴 `SELECTORS`；selector 變更可能同時改變隱藏、資料抽取與點擊攔截。
- UI 讀取規則名稱與語系資料；新增規則若沒有顯示名稱，使用者選單會回退到 raw key。

## Key Flows

- 規則 catalog：每個 rule 定義 id、預設啟用狀態、可選強弱優先級、白名單範圍與文字比對規則。
- 強弱規則：強規則預設不受一般白名單保護；會員規則有專屬會員白名單路徑；弱規則可被頻道/關鍵字白名單與訂閱保護豁免。
- selector catalog：影片容器、區塊容器、metadata、badge、clickable、link candidates 集中組合，供過濾、資料抽取、CSS 與互動共用。
- 語系資料：I18N filter patterns 與 rule names 讓過濾與 UI 能支援繁中、簡中、英文、日文。

## Change Entry Points & Routes

- 修 selector 失效：先改 `src/data/selectors.ts`，再跑 selector test，最後檢查使用該 selector 的資料抽取、CSS 或互動模組。
- 新增文字型規則：先改 `RULE_DEFINITIONS`，再同步 `RuleEnables`、規則名稱、必要測試與 UI 顯示。
- 新增 CSS 型規則：除了規則定義與設定同步，也要到 CSS 注入模組增加 selector map。
- 調整強弱/白名單策略：同步過濾裁決文件與測試，確認白名單、會員白名單與訂閱保護仍符合預期。

## Known Risks

- YouTube DOM class 與 custom element 名稱常改；selector 要保留新舊版備援。
- `:has()` CSS 規則很強但也容易擴大命中範圍；新增時需確認不會隱藏白名單應放行的內容。
- 規則 id 會跨設定、UI、測試、CSS 與統計 reason 使用；改名是跨模組變更。
- 文字規則與多語系 pattern 可能造成誤判，尤其是區塊標題與會員/合輯提示文字。

## Do Not Do

- 不要在 feature 或 UI 檔案內新增散落 selector；集中到 `SELECTORS`。
- 不要只新增 `RULE_DEFINITIONS` 就結束；設定型別、名稱、CSS/JS 使用點與測試都要同步檢查。
- 不要把需要白名單裁決的內容規則只用 CSS 強制隱藏。
