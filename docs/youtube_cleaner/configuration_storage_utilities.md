# 設定、儲存與核心工具

## Responsibility

- 擁有設定狀態、預設值、Tampermonkey storage 讀寫、規則開關/優先級、黑白名單正則編譯、統計、日誌、數字/時間解析與繁簡轉換工具。
- 當未來工作涉及「設定值不生效」、「匯入後狀態錯誤」、「觀看數/時間解析錯誤」、「debug log」、「過濾統計」或共用工具行為時，從這裡開始。

## Scope

- 代表範圍：`src/core/config.ts`、`src/core/utils.ts`、`src/core/logger.ts`、`src/core/stats.ts`、`src/core/types.ts`、`src/core/constants.ts`。
- Public surface：`ConfigManager.get/set/toggleRule()`、`resetConfigManagerForTests()`、`Utils` 解析/轉換工具、`FilterStats` session 統計、`Logger`。
- 相關測試：`test/config-manager-test.ts`、`test/logic-test.ts` 中的解析與狀態重置覆蓋。

## Dependencies & Impact

- 設定預設值依賴規則資料與 UI 的預設區塊黑名單；這是少數 core 會讀 data/ui 靜態資料的地方。
- 過濾引擎、CSS 注入、互動增強、Adblock 防護與 UI 都讀取 `ConfigManager`；設定 key 或型別變動會跨全專案影響。
- 黑白名單正則編譯依賴繁簡轉換工具；變動會影響關鍵字、頻道、會員與區塊黑名單匹配。

## Key Flows

- 載入設定：建立 singleton → 建立 defaults → 從 `GM_getValue` 合併已儲存值 → 合併規則開關/優先級 → 編譯 runtime-only regex list。
- 更新設定：`set()` 更新 state → 寫入 `GM_setValue` → 如果是名單 key，立即刷新對應 compiled list。
- 精確匹配：名單項目前綴 `=` 會產生完整匹配 regex；否則產生包含匹配 regex。
- 統計與日誌：過濾流程記錄 reason 到 session 統計；debug mode 控制 Logger 輸出。

## Change Entry Points & Routes

- 新增設定 key：先改 `ConfigState` 與 defaults，再檢查 UI、SettingsIO、測試與匯出格式。
- 新增規則開關：必須與規則目錄、規則顯示名稱、必要 CSS 或過濾邏輯同步。
- 改名單或 regex 行為：同時檢查 `SettingsIO` 型別驗證、ListManager 輸入規則、FilterEngine 白名單/黑名單使用點。
- 改解析工具：跑覆蓋觀看數、直播人數、時間、時長、繁簡轉換或頻道清洗的相關測試。

## Known Risks

- `ConfigManager` 是 singleton；測試必須用 reset helper 避免跨測試污染。
- `compiled*` 欄位是 runtime cache，不應匯出到使用者設定備份。
- storage key 使用大寫設定名轉 snake_case；特殊規則 map 使用 `ruleEnables` 與 `rulePriorities`，不可任意改名。
- 規則 key 漏同步時，UI 可能顯示不出名稱，預設開關可能不存在，或過濾流程讀到 undefined。

## Do Not Do

- 不要在 feature 模組直接呼叫 `GM_getValue` / `GM_setValue` 繞過 `ConfigManager`。
- 不要把 DOM 查詢或 YouTube selector 放進 core 工具。
- 不要把 compiled regex cache 當成可持久化設定。
