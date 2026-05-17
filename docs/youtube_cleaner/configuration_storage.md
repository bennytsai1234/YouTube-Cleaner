# Configuration And Storage

## 目前責任

- 負責型別化設定、預設值、持久化 key、runtime compiled regex cache 與測試 reset helper。
- 新增設定、改預設值、匯入匯出相容性或儲存值 bug，從這裡開始。

## 範圍

- `src/core/config.ts`
- storage-facing 使用者：`src/ui/settings-io.ts`、`src/ui/list-manager.ts`
- `test/config-manager-test.ts` 與 settings import/export 測試

## 依賴與影響

- 依賴 `Utils.generateCnRegex`、`I18N.defaultSectionBlacklist`、`buildDefaultRuleEnables()` 與 `buildDefaultRulePriorities()`。
- 影響所有讀取 `ConfigManager.get()` 的 feature module。
- 一般 config key 會轉成 snake_case 寫入 GM storage；rule enables 與 priorities 使用特殊 key。

## 關鍵流程

- constructor 建立 singleton、建立 defaults，然後用 `_load()` 載入已儲存值。
- list 設定會 clone 並編譯為 regex array 供 runtime 快速比對。
- `set()` 寫入持久化值，並在 list 設定變更時刷新對應 compiled list。
- `toggleRule()` 更新 `RULE_ENABLES` 並持久化。

## 變更入口

- 新 config key：更新 `ConfigState` 與 defaults。
- list 類設定：同步 `ListConfigKey`、`LIST_COMPILE_TARGETS` 與 import/export validation。
- UI 可調設定：同步 `src/ui/menu.ts`、i18n strings 與測試。

## 變更路線

- 新 rule setting：`src/data/rules.ts` -> `RuleEnables` -> UI rule names -> tests。
- 新 persisted list：`ConfigState` -> defaults -> compiled regex -> `SettingsIO` validation -> list UI tests。
- release 相關 config 變更也要檢查 README、CHANGELOG 與 release consistency scripts。

## 已知風險

- 新增 default 但沒有同步 import/export validation，會讓備份不完整或匯入時靜默丟值。
- compiled regex 是 runtime-only，不能匯出到設定備份。
- singleton 對 runtime 有用，但測試需使用 `resetConfigManagerForTests()`。

## 參考備註

- 無。

## 不要做

- 不要持久化 compiled regex cache。
- 不要在 `ConfigState` 之外引入未型別化的任意 config key。
- 不要把 secrets 或環境專屬值寫入 Tampermonkey 設定。
