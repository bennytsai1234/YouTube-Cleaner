# YouTube Cleaner Change Workflow

## 角色

這是由 main workflow 路由的內部模組。所有會修改程式碼或文件的任務都使用此 workflow，包含 bug、feature、optimization、refactor、release、dependency、migration、config、hotfix 與 cleanup。

## 內部推理層

不要把此層直接輸出給使用者。

1. 保留使用者原始需求。
1. 接收 main workflow 已讀取的 index 摘要。
1. 選擇最相關的模組文件，以及可能受影響的邊界模組。
1. 將任務分類為且僅分類為：bug、feature、optimization、refactor、release、dependency、migration、config、hotfix 或 cleanup。
1. 在提出 Before / After 前校準範圍：預期觸碰檔案、下游影響、generated artifacts、測試、rollback path 與不確定面。
1. 若變更超過三個檔案或跨越一個以上模組，編輯前先在 `docs/changes/<YYYY-MM-DD>-<slug>.md` 寫一份簡短工程計畫。這份計畫不是使用者確認介面的替代品。
1. 檢查是否觸發 Decision Gate。若觸發，先使用 Decision Gate，再使用一般 Before / After。

## 內部分類

- **Bug**：驗證重現已消失、相關測試通過，並考慮最近的 integration 或 E2E 路徑。
- **Feature**：盡量驗證 happy path 與至少一個 failure path；執行 typecheck 與相關測試。
- **Optimization**：保持行為不變；若是效能任務，取得前後指標。
- **Refactor**：確認公開行為不變；測試範圍需覆蓋受影響模組。
- **Release**：確認版本 manifest、README badge、userscript metadata、generated output 與 changelog/release notes。
- **Dependency**：確認 install 或 lockfile 更新、build、呼叫方測試與 breaking change notes。
- **Migration**：確認 forward path、rollback 或不可逆記錄，且必須升級到 Decision Gate。
- **Config**：確認 config 可載入且依賴路徑會回應新值；不可提交 secrets。
- **Hotfix**：使用最小變更面；驗證立即重現消失，必要時記錄 follow-up。
- **Cleanup**：確認 build/tests 通過且沒有殘留引用。

## 對外回報層

1. 若觸發 Decision Gate，先呈現 Decision Gate。
1. 使用 Before / After 與使用者確認。
1. 等待明確確認後才修改檔案。
1. 實作變更。
1. 依任務分類執行最小驗證，可使用 `npm run typecheck`、`npm run lint`、`npm test`、`npm run build`、`npm run check:release`、`npm run test:e2e:selectors` 或 `npm run verify`。
1. 回報變更內容與驗證結果。
1. 交付策略：驗證完成後建立本地 commit 並推送。

## 回報規則

- Before / After 是唯一的人類確認介面。
- 本專案報告層級：技術細節。
- 需要時包含檔名、模組名、指令與相關程式脈絡。
- 驗證狀態必須回報：通過、失敗或跳過。

## Before / After 格式

**Before**：用一到三句白話說明目前狀況，以及問題、缺口或風險。

**After**：用一到三句白話說明變更完成後會變成什麼狀態。

任何檔案修改前，都要等待使用者明確確認。

## Decision Gate

當變更會改變模組邊界、外部或公開介面、有多種取捨明顯的作法、包含不可逆操作，或任務分類為 migration 時，使用此格式：

```markdown
## Decision: <一句話標題>

### Context
為什麼需要這個決策。

### Options
A. <選項 A> - <優點 / 成本>
B. <選項 B> - <優點 / 成本>

### Impact
哪些區域會受影響，以及如何受影響。

### Recommendation
建議哪個選項，以及原因。
```

跨模組決策記錄到 index 的 Architecture Decisions；模組內決策記錄到受影響模組的 Known Risks 或 Do Not Do。

## Atlas 更新條件

只有當變更真正改變模組邊界、所有權、外部 API 或已記錄的 repository 事實時，才更新 atlas。一般 bug fix 與小功能不需要更新 atlas。更新時只改受影響文件。

## 交付策略

驗證完成後建立本地 commit 並推送。
