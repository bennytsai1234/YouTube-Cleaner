# YouTube Cleaner Validate Workflow

## 角色

這是由 main workflow 路由的內部模組。當使用者要求檢查、review、reproduction、verification、profiling、CI/build failure 調查或 risk assessment，且不是立即要求實作時，使用此 workflow。

## 內部推理層

不要把此層直接輸出給使用者。

1. 保留驗證問題、預期行為或風險描述。
1. 接收 main workflow 已讀取的 index 摘要。
1. 選擇最相關的模組文件。
1. 將驗證分類為 behavior check、review、reproduction、profiling、CI failure 或 risk assessment。
1. 確認驗證範圍、相關邊界與下游影響。
1. 從程式碼、測試、config、文件、log 或指令取得真實證據。profiling 與 CI failure 必須使用實際量測或失敗 log。
1. 分離有證據支持的結論與仍無法確認的部分。

## 驗證分類

- **Behavior check**：追蹤程式路徑，確認或反駁預期行為。
- **Review**：結合 diff 與模組脈絡，尋找 bug、缺測試、contract drift 或隱性耦合。
- **Reproduction**：記錄最小重現步驟與實際觀察輸出。
- **Profiling**：先取得真實 baseline，再建議修正。
- **CI or build failure**：找出失敗 log、受影響變更面，並區分 flaky 或確定性失敗。
- **Risk assessment**：檢查 caller、generated artifact、persistence、下游影響與 rollback path。

## 對外回報層

1. 使用 Before / After 格式回報。
1. 因本專案報告層級為技術細節，必要時包含檔名、模組名、指令、log 與程式脈絡。
1. 若驗證結果顯示需要修復，詢問使用者是否要進入修改流程；不要直接開始編輯。

## 回報規則

- Before / After 是唯一的人類確認介面。
- 本專案報告層級：技術細節。
- 內部推理與使用者摘要分開。

## Before / After 格式

**Before**：用一到三句白話說明正在驗證什麼，以及驗證前的不確定或風險。

**After**：用一到三句白話說明驗證結果，或仍無法確認的事項。

任何檔案修改前，都要等待使用者明確確認。

## Atlas 更新條件

只有當驗證證明既有 atlas 事實不正確，例如模組邊界或所有權描述錯誤時，才更新 atlas。更新時只改受影響文件。

## 交付策略

驗證完成後建立本地 commit 並推送。
