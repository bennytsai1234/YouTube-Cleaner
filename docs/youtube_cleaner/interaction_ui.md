# Interaction And UI

## 目前責任

- 負責 click interception、新分頁行為、通知 link 行為、原生 Tampermonkey menu flow、名單管理、統計顯示、語言選擇與設定匯入匯出。
- 使用者控制、menu bug、backup/restore 或影片開啟互動問題，從這裡開始。

## 範圍

- `src/features/interaction.ts`
- `src/ui/menu.ts`
- `src/ui/menu-renderer.ts`
- `src/ui/menu-types.ts`
- `src/ui/list-manager.ts`
- `src/ui/settings-io.ts`
- `test/interaction-test.ts`、`test/settings-io-test.ts` 與 E2E settings specs

## 依賴與影響

- 依賴 `ConfigManager`、`SELECTORS`、`FilterStats` 與 `I18N`。
- UI 變更通常需要同步 localized strings 與 config defaults。
- Click interception 會影響 YouTube navigation、notification menu、playlist link 與 channel link。

## 關鍵流程

- `InteractionEnhancer.init()` capture click event，略過 excluded controls，並依設定在新分頁開啟目標 YouTube link。
- `UIManager` 提供四組 menu：內容過濾、名單、體驗、系統。
- `MenuRenderer` 使用 native prompt menu 與 optional back action。
- `ListManager` 處理 comma-separated additions、精確 channel/member whitelist mode、indexed removals、clear 與 restore defaults。
- `SettingsIO` 匯出不含 compiled cache 的乾淨 JSON，匯入時只接受已知 config key 並做型別驗證。

## 變更入口

- 新分頁或 click routing：`src/features/interaction.ts`。
- 新增或重排 menu controls：`src/ui/menu.ts`。
- backup/import schema：`src/ui/settings-io.ts`。
- list editing semantics：`src/ui/list-manager.ts`。

## 變更路線

- 新 setting UI：config default -> menu control -> localized strings -> settings import/export tests -> refresh behavior。
- Click behavior：更新 link selection/exclusion selectors -> 跑 interaction tests 與相關 E2E。
- Backup schema：更新 validation 並確認 compiled cache 不會匯出。

## 已知風險

- `INTERACTION_EXCLUDE` 不完整時，click capture 可能破壞 YouTube 原生控制。
- Prompt-based UI 簡單但不適合複雜流程，menu flow 應保持短。
- Import 只接受已知 config key；若 key rename，舊備份可能被靜默丟值，除非加入 migration。

## 參考備註

- 無。

## 不要做

- 一般設定工作不要注入 React、Vue 或 page-styled UI。
- 不要匯出 runtime-only compiled regex cache。
- 不要攔截使用者預期由 YouTube 處理的 modifier-click 或 button/control click。
