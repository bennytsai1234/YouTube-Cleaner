# Configuration Storage

## 目前狀態

- `src/core/config.ts` 定義 `ConfigState`、`RuleEnables`、預設設定、GM storage key 轉換、設定載入、寫入與 runtime RegExp cache。
- `ConfigManager` 以 module-level singleton 維持同一份設定狀態，測試可用 `resetConfigManagerForTests()` 重置。
- 黑白名單、區塊黑名單與 members whitelist 會被編譯為 `compiled*` RegExp 欄位，但這些 runtime cache 不應匯出到備份 JSON。

## 範圍

- 主要檔案：`src/core/config.ts`。
- 邊界檔案：`src/data/rules.ts`、`src/ui/settings-io.ts`、`src/ui/menu.ts`、`src/ui/list-manager.ts`、`test/config-manager-test.ts`、`test/settings-io-test.ts`。
- Storage API：`GM_getValue`、`GM_setValue`。

## 上游依賴

- `buildDefaultRuleEnables()` 與 `buildDefaultRulePriorities()` 來自 `src/data/rules.ts`。
- `I18N.defaultSectionBlacklist` 提供預設區塊黑名單。
- `Utils.generateCnRegex()`、`Utils.escapeRegex()` 負責名單 RegExp 編譯與繁簡互通。
- Tampermonkey GM storage 是持久化來源。

## 下游影響

- `VideoFilter`、`FilterEngine`、`StyleManager`、`AdBlockGuard`、`InteractionEnhancer`、`UIManager` 都直接讀取 `ConfigManager`。
- 新增或改名設定 key 會影響 storage key、選單顯示、設定匯入匯出、測試 fixture 與 release 行為。
- `RULE_ENABLES` 與 `RULE_PRIORITIES` 的 shape 若與 `rules.ts` 不一致，可能造成規則開關不顯示或強弱判斷失效。

## 關鍵流程

- constructor 第一次建立 defaults 後呼叫 `_load()`；後續 `new ConfigManager()` 回傳同一 instance。
- `_load()` 針對 `RULE_ENABLES` / `RULE_PRIORITIES` 使用 camelCase storage key，其餘設定使用 `toStorageKey()` 轉成 snake_case。
- `set()` 寫入 GM storage 後，若 key 是名單類設定，立即 refresh 對應 `compiled*` cache。
- `_compileList()` 支援 `=exact` 模式，並在 OpenCC 可用時建立繁簡互通 RegExp。

## 常見變更入口

- 新增設定：更新 `ConfigState`、`defaults`、必要 UI、`SettingsIO` 測試與相關 e2e。
- 新增規則開關：先改 `src/data/rules.ts`，再確認 `RuleEnables` interface 與 UI rule menu。
- 修正匯入資料污染：看 `src/ui/settings-io.ts` 是否跳過 `compiled*` 並驗證型別。
- 調整預設區塊黑名單：看 `src/data/default-section-blacklist.ts` 與 `I18N.defaultSectionBlacklist`。

## 已知風險

- `ConfigManager` singleton 讓測試需要明確 reset；漏掉 reset 可能讓測試互相污染。
- `compiled*` cache 是 runtime-only，但也存在於 `ConfigState`，修改匯出邏輯時容易誤包含。
- `toStorageKey()` 的轉換格式會影響既有使用者資料；改動需要 migration 設計。

## 不要做

- 不要新增設定但只存在 UI 或只存在 defaults；必須讓型別、儲存、匯出匯入與測試一致。
- 不要將 compiled RegExp 寫入備份 JSON。
- 不要改 storage key 命名而不提供向後相容策略。
