# Menu Settings IO

## 目前狀態

- `src/ui/menu.ts` 以 Tampermonkey `GM_registerMenuCommand` 入口提供四大類選單：內容過濾、名單、體驗、系統。
- `MenuRenderer` 使用 `prompt()` 呈現選項，`ListManager` 管理黑白名單 CRUD，`SettingsIO` 管理 JSON 匯出匯入。
- UI 透過 `I18N.t()` 顯示多語文案，設定變更後會呼叫 `onRefresh()` 讓 runtime 重新套用。

## 範圍

- 主要檔案：`src/ui/menu.ts`、`src/ui/menu-renderer.ts`、`src/ui/menu-types.ts`、`src/ui/list-manager.ts`、`src/ui/settings-io.ts`。
- 邊界檔案：`src/ui/i18n.ts`、`src/ui/i18n-strings.ts`、`src/core/config.ts`、`src/core/stats.ts`、`src/main.ts`。
- 相關測試：`test/settings-io-test.ts`、`test/config-manager-test.ts`、`test/e2e/settings-menu.spec.ts`、`test/e2e/settings-io.spec.ts`。

## 上游依賴

- `ConfigManager` 提供所有設定值、defaults、`toggleRule()` 與 `set()`。
- `FilterStats` 提供 session 統計。
- `I18N` 提供 UI 文案、語言列表與 rule names。
- Tampermonkey APIs：`GM_info`、`GM_setClipboard`，以及 browser `prompt`、`alert`、`confirm`。

## 下游影響

- 使用者可見設定流程與設定持久化。
- `onRefresh()` 會觸發 `App.refresh()`，重新 sync adblock guard、reset filter、套用 CSS 與掃描訂閱。
- 匯出匯入格式影響跨裝置備份與舊版相容性。

## 關鍵流程

- `UIManager.showMainMenu()` 進入四大類選單。
- `showRuleMenu()` 依 `RULE_ENABLES` 分頁顯示所有規則開關。
- `manage(key)` 對指定 list 設定提供 add/remove/clear/restore。
- `SettingsIO.exportSettings()` 排除 `compiled*` cache，輸出 version、timestamp、settings、language。
- `SettingsIO.importSettings()` 驗證 JSON shape、設定 key、list item type、rule maps 與語言。

## 常見變更入口

- 新增設定選項：更新 `menu.ts` 對應分類、`i18n-strings.ts`、`ConfigState` 與測試。
- 新增 list 類設定：確認 `ListManager` 是否允許 CRUD、`ConfigManager` 是否編譯 RegExp、`SettingsIO` 是否驗證。
- 匯入設定失敗或污染：看 `SettingsIO.normalizeImportedValue()`。
- rule menu 顯示不完整：看 `RuleEnables`、`RULE_DEFINITIONS` 與 `I18N.getRuleName()`。

## 已知風險

- Prompt UI 容量有限，規則太多需要分頁；文案過長會影響可用性。
- 匯入 JSON 是使用者資料入口，必須拒絕明顯錯誤型別。
- `resetSettings()` 逐 key 呼叫 `config.set()`，新設定 defaults 若有 runtime-only 欄位需避免誤存。

## 不要做

- 不要把未驗證的 import JSON 直接 assign 到 `config.state`。
- 不要把 `compiled*` runtime cache 匯出。
- 不要新增 UI 文案但跳過 i18n key 與 fallback 檢查。
