# data-definitions — 資料定義層

## 職責

定義所有靜態資料結構：過濾規則、DOM 選擇器、預設黑名單、多語系過濾模式、規則名稱翻譯。此模組是純資料層，無執行時期邏輯——所有函式都是純資料轉換（build、get、filter）。

## 範圍

- `src/data/rules.ts` — RuleDefinition 陣列（RULE_DEFINITIONS），定義每個過濾規則的 id、defaultEnabled、defaultPriority（strong/weak）、whitelistScope（none/channel_or_keyword/members）、textRules（RegExp 或字串陣列）。提供 buildDefaultRuleEnables()、buildDefaultRulePriorities()、getTextRuleDefinitions()、getRuleDefinition()、getWhitelistScope()、isStrongRule() 等輔助函式。
- `src/data/selectors.ts` — SELECTORS 物件，集中管理所有 YouTube DOM 選擇器常數：VIDEO_CONTAINERS、SECTION_CONTAINERS、METADATA（TEXT、TITLE_LINKS、DURATION、CHANNEL、TITLE）、SHELF_TITLE、BADGES（MEMBERS、AD、SHORTS、MIX）、INTERACTION_EXCLUDE、CLICKABLE、PREVIEW_PLAYER、LINK_CANDIDATES，以及組合後的 allContainers / videoContainersStr。
- `src/data/default-section-blacklist.ts` — DEFAULT_SECTION_BLACKLIST，跨語系的預設區段標題黑名單。
- `src/data/i18n-filter-patterns.ts` — FILTER_PATTERNS，各語系的觀看數/時間解析正則模式。
- `src/data/rule-names.ts` — RULE_NAMES，各語系的規則名稱翻譯。

## 依賴與影響

- **上游**：無（純資料，不依賴任何模組）。
- **下游**：
  - feature-engine：CustomRuleManager 使用 getTextRuleDefinitions() 建立文字規則匹配器；FilterEngine 使用 getWhitelistScope()、isStrongRule() 判斷過濾行為；VideoFilter 使用 SELECTORS；SubscriptionManager 間接無直接依賴。
  - user-interface：I18N 使用 FILTER_PATTERNS 和 RULE_NAMES。
  - core-foundation：ConfigManager.defaults 中使用 buildDefaultRuleEnables() 和 buildDefaultRulePriorities() 建立預設值。

## 關鍵流程

- **規則定義 → 預設設定**：RULE_DEFINITIONS → buildDefaultRuleEnables() 產生 Record<string, boolean> → ConfigManager.defaults.RULE_ENABLES；buildDefaultRulePriorities() 產生 Record<string, RulePriority> → ConfigManager.defaults.RULE_PRIORITIES。
- **文字規則匹配**：getTextRuleDefinitions() 過濾出有 textRules 的 RuleDefinition → CustomRuleManager 將其轉為 RuleDefinition[] 用於執行時期文字匹配。
- **選擇器使用**：所有模組透過 `SELECTORS.xxx` 引用選擇器，而非硬編碼字串。VIDEO_CONTAINERS + SECTION_CONTAINERS 組合成 allContainers 用於 MutationObserver 與整頁掃描。

## 變更入口與路徑

- **YouTube DOM 改版（選擇器失效）**：修改 `src/data/selectors.ts` 中對應選擇器 → 檢查 feature-engine（VideoFilter.validateSelectors、VideoData 屬性提取）與 style-manager（CSS 規則）是否需要同步調整。
- **新增過濾規則**：在 RULE_DEFINITIONS 陣列中加入新 RuleDefinition → 確保 ConfigState.RuleEnables 中有對應鍵（config.ts）→ 若為 CSS 強規則，在 style-manager.ts 中加入對應 CSS。
- **調整規則優先級/白名單範圍**：修改 RULE_DEFINITIONS 中對應規則的 defaultPriority 或 whitelistScope。
- **新增語系過濾模式**：修改 i18n-filter-patterns.ts 加入新語系的模式。

## 已知風險

- **選擇器與 YouTube 內部結構耦合**：SELECTORS 中的選擇器直接對應 YouTube DOM 結構，YouTube 改版時可能失效。VideoFilter.validateSelectors() 在 DEBUG_MODE 下會進行健康檢查，但僅限於 METADATA.CHANNEL。
- **預設黑名單語系覆蓋**：default-section-blacklist.ts 包含跨語系項目，特定語系使用者可能需要手動調整。
- **規則 id 一致性**：RULE_DEFINITIONS 中的 id 必須與 ConfigState.RuleEnables 的鍵完全一致，否則執行時期會出錯。此一致性無編譯期檢查。

## 禁止事項

- 不要在此模組中加入執行時期邏輯或 DOM 操作。
- 不要在選擇器中硬編碼特定語系的文字（使用 I18N.t() 或 I18N.filterPatterns 替代）。
- 新增規則時，不要忘記在 ConfigState.RuleEnables 中加入對應的鍵。
- 不要刪除或重新命名現有規則 id——這會導致使用者已儲存的設定遺失。
