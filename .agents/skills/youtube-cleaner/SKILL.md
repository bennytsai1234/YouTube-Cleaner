---
name: youtube-cleaner
description: "Codebase Atlas entrypoint for YouTube Cleaner — reads the atlas index and routes before acting."
---

# YouTube Cleaner Codebase Atlas

這是本專案的 Codebase Atlas 入口與路由器。每次在此專案中工作時都依照下列步驟執行。

## 入口（先讀 index，再路由）

1. 保留使用者的原始需求。
1. 在進行任何其他操作前，先開啟 `../../../docs/youtube_cleaner_index.md`。
1. 用一句白話確認這個專案的功能：**YouTube Cleaner 是一個 Tampermonkey 使用者腳本，在瀏覽器端攔截、隱藏與美化 YouTube 的干擾元素，提供純淨的觀看體驗。**
1. 依意圖路由：
   - 使用者想要「知道」某事——解釋、定位、可行性、所有權、行為檢查、審查、重現、分析、CI 失敗、風險評估 → 遵循 `../../../docs/youtube_cleaner_investigate_workflow.md`。
   - 使用者想要「改變」某事——任何程式碼編輯 → 遵循 `../../../docs/youtube_cleaner_change_workflow.md`。
   - 混合或不明確 → 從調查開始，再決定是否需要變更。
1. 組合時，將結論向前傳遞；除非下一步需要尚未收集的脈絡，否則不要重複讀取 index 或模組文件。
1. 任何會修改檔案的操作，都必須先提供 Before / After 並等待使用者明確確認後才編輯。
1. 依此交付策略完成：commit 並 push。
1. 任務完成後，用白話詢問是否還有其他需要處理的事項。若使用者繼續，直接路由下一個請求，不要重讀 index。

## 報告

- Before / After 是唯一的人機確認介面。
- 報告層級：白話
  - 白話：不向使用者提及模組名稱、檔案路徑或程式碼片段。

## 禁止事項

- 除非使用者明確要求完整重建，否則不要重新執行 Codebase Atlas 初始化。
- 不要跳過 atlas index 的讀取。
- 不要在使用者確認 Before / After 前編輯檔案。
