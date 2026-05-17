# YouTube Cleaner Main Workflow

## 角色

這是本專案日常工作的唯一入口。使用者不需要知道 understand、change、validate workflow 的存在；代理依任務意圖自動路由，必要時可組合多個 workflow。

## 流程

1. 在任何其他操作前，先開啟 `docs/youtube_cleaner_index.md`，同時保留使用者原始需求。
1. 用一句白話確認：本專案是 TypeScript Tampermonkey userscript，用於清理 YouTube 介面中的 Shorts、廣告、低訊號推薦與其他干擾元素。
1. 依任務意圖路由：
   - 理解、說明、調查、可行性問題：使用 understand workflow。
   - 修改、bug fix、feature、optimization、refactor、release、dependency upgrade、migration、config、hotfix、cleanup：使用 change workflow 並選擇對應內部分類。
   - 驗證、review、安全檢查、reproduction、profiling、CI/build failure、risk assessment：使用 validate workflow。
   - 混合意圖：依 understand、validate、change 的順序組合。
1. 進入原始碼前，先從 index 選取相關模組文件。
1. 內部執行相符 workflow。
1. 使用繁體中文回報，除非使用者要求其他語言。
1. 若任務會修改檔案，必須先提供 Before / After gate，並等待明確確認。
1. 交付策略：驗證完成後建立本地 commit 並推送。

## 路由原則

意圖不清時，先從 understand 開始，再判斷是否需要 validate 或 change。沒有 Before / After 確認，不得修改檔案。

組合 workflow 時，將前一階段結論傳給下一階段；除非下一階段需要未取得的脈絡，否則不要重讀 index 或模組文件。

日常維護任務進入 change workflow，並選擇明確內部分類。change workflow 對各類任務有不同驗證要求。

## 回報規則

- Before / After 是唯一的人類確認介面。
- 本專案報告層級：技術細節。
- 需要時提供模組名、檔案路徑、相關指令與精簡程式脈絡，幫助開發者定位與判斷。
- 內部推理與使用者摘要分開。

## Before / After 格式

**Before**：用一到三句白話說明目前狀況，以及問題、缺口、混亂或風險在哪裡。

**After**：用一到三句白話說明操作完成後會變成什麼狀態。

任何檔案修改前，都要等待使用者明確確認。

## 連續工作模式

每個任務完成後，用白話詢問：

```text
還有其他需要處理的事情嗎？
```

如果使用者繼續提出新需求：

- 不要重讀 index。
- 直接依路由判斷接續。
- 保持技術細節回報與 Before / After 機制。

只有使用者表示沒有其他事情時才結束。
