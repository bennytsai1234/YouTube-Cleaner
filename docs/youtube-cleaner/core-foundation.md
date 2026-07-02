# core-foundation — 核心基礎層

## 職責

提供所有模組共用的基礎設施：設定管理、型別定義、通用工具函式、統計記錄、除錯日誌。此模組是專案的平台層，任何模組都可能依賴它，但反過來不會。

## 範圍

- `src/core/config.ts` — ConfigManager（單例，包裝 GM_getValue/GM_setValue），提供型別安全的設定讀寫、正則編譯、清單型設定與 compiled regex 之間的自動同步。
- `src/core/types.ts` — YouTube 內部全域型別（YtConfig，含 openPopupConfig 與 EXPERIMENT_FLAGS），以及 Window 擴充宣告。
- `src/core/utils.ts` — 通用工具：parseNumeric（觀看數解析，支援 K/M/B/萬/億）、parseDuration（時長解析 HH:MM:SS）、parseTimeAgo（相對時間解析）、parseLiveViewers（直播觀眾人數）、cleanChannelName（頻道名稱噪音清洗）、debounce、throttle、OpenCC 繁簡轉換快取。
- `src/core/stats.ts` — FilterStats（過濾統計，記錄每次隱藏的 reason 與計數，支援 getSummary 回報）。
- `src/core/logger.ts` — Logger（條件式 console.log/warn，統一前綴 [Purifier]）。
- `src/core/constants.ts` — CLEANING_RULES（頻道名稱前綴/後綴噪音詞彙，跨語系）。

## 依賴與影響

- **上游**：無（此模組不依賴專案內其他模組）。外部依賴 Tampermonkey GM API（GM_getValue、GM_setValue）與可選的 OpenCC 全域變數。
- **下游**：所有其他模組（data-definitions、feature-engine、user-interface）都依賴 core-foundation 的 ConfigManager、Utils、Logger、FilterStats 和型別。

## 關鍵流程

- **設定生命週期**：ConfigManager 初始化時從 GM storage 讀取所有設定鍵，將清單型設定（KEYWORD_BLACKLIST 等）自動編譯為 RegExp[]，存入 compiled* 鍵。每次 set() 時自動重新編譯對應的 compiled 鍵。get() 直接從記憶體內 state 回傳，無 I/O。
- **觀看數解析**：Utils.parseNumeric 先檢查是否為相對時間（避免「3 小時前」被誤判為 3 次觀看），再匹配數字+單位模式。
- **統計累積**：FilterStats.record(reason) 同時更新全時期計數與 session 計數。

## 變更入口與路徑

- **新增設定鍵**：修改 `ConfigState` 介面（config.ts）→ 在 `defaults` 物件中加入預設值 → 若為清單型，加入 `LIST_COMPILE_TARGETS` 映射 → 更新 test/config-manager-test.ts。
- **修改 parse 邏輯**：直接修改 utils.ts 中對應函式 → 更新 test/logic-test.ts 中對應測試案例。
- **新增工具函式**：加入 utils.ts 的 Utils 物件 → 若有單元測試價值，加入 test/logic-test.ts。
- **YouTube 內部 API 變更**：修改 types.ts 中的 YtConfig 介面 → 檢查 adblock-guard.ts 中的 patchConfig() 是否需要同步更新。

## 已知風險

- **GM API 依賴**：ConfigManager 的 get/set 直接呼叫 GM_getValue/GM_setValue，在測試環境中需要 mock（test/helpers/browser-env.ts 提供）。
- **OpenCC 全域變數**：Utils 中的繁簡轉換依賴外部載入的 `window.OpenCC`，若未載入則轉換靜默失敗。
- **ConfigManager 單例**：resetConfigManagerForTests() 提供測試隔離，但生產程式碼中共享同一個實例，需注意狀態污染。

## 禁止事項

- 不要在此模組中加入任何 DOM 操作或 YouTube 頁面相關邏輯——那是 feature-engine 的職責。
- 不要在此模組中加入 UI 相關邏輯——那是 user-interface 的職責。
- ConfigState 中不要直接儲存 RegExp 物件——使用 compiled* 鍵，由 ConfigManager 自動管理編譯。
- 不要在 Utils 中加入與特定過濾規則相關的邏輯——保持工具函式的通用性。
