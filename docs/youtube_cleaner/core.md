# 核心基礎設施（core）

## 當前職責

提供所有其他模組共用的基礎設施：設定管理、日誌、過濾統計、型別定義與通用工具函式。這個模組不依賴任何其他業務模組，是整個專案的最底層。當你需要讀寫使用者設定、輸出除錯日誌、解析影片時長或轉換繁簡中文時，從這裡開始。

## 範圍

- `src/core/config.ts`：ConfigManager，單例模式，負責 Tampermonkey GM 儲存的讀寫與正則表達式預編譯
- `src/core/constants.ts`：CLEANING_RULES，頻道名稱清洗常數
- `src/core/logger.ts`：Logger，統一日誌輸出
- `src/core/stats.ts`：FilterStats，過濾統計（Session 級別）
- `src/core/types.ts`：YtConfig，YouTube 內部物件型別聲明
- `src/core/utils.ts`：工具函式（數字解析、時間計算、繁簡轉換）

## 依賴與影響

- 無上游依賴（不依賴其他 src/ 模組）
- 被所有 data、features、ui 模組使用
- 對 Tampermonkey GM API（GM_getValue、GM_setValue）有外部依賴
- 修改這裡的型別或工具函式會影響整個專案

## 關鍵流程

1. ConfigManager 在 App 啟動時初始化，從 GM 儲存讀取設定並預編譯正則
2. Logger 在 App.init() 第一階段設定，後續所有模組透過 Logger 輸出
3. FilterStats 在每次過濾操作後更新，Session 內累積計數

## 變更入口點

- 新增設定項：從 `config.ts` 的 ConfigManager 開始
- 修改 YouTube 內部型別：從 `types.ts` 的 YtConfig 開始
- 新增工具函式：從 `utils.ts` 開始

## 變更路徑

- `config.ts` 與 `ui/settings-io.ts` 雙向依賴（設定匯出/匯入）
- `types.ts` 與 `features/adblock-guard.ts` 型別同步
- 工具函式修改後需檢查所有呼叫者

## 已知風險

- ConfigManager 依賴 Tampermonkey GM API，在 Node.js 測試環境中需要 polyfill
- CLEANING_RULES 的頻道名稱清洗邏輯與 YouTube 實際顯示名稱可能不同步
- Session 級別的 FilterStats 在頁面重整後會遺失

## 參考筆記

無（獨立模式）

## 禁止事項

- 不要在 core 中引入對 features 或 ui 模組的依賴
- 不要在此模組中直接操作 DOM
- 不要在此模組中定義業務規則邏輯（應放在 data 模組）
