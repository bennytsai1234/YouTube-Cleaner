# Gemini CLI 開發規範 (Development Protocol)

本檔案定義了 AI Agent 在此專案中的核心操作規範與安全工作流。

---

## 🔁 核心工作流 (The Workflow)

你必須嚴格遵循以下步驟處理每一次變更，確保代碼安全與邏輯完整：

### 第一階段：實作與安全備份 (Implementation & Safety)
1. **需求理解**: 修改前必須明確區分修復 (Fix)、新功能 (Feat) 或重構 (Refactor)。
2. **代碼修改規範 [CRITICAL]**:
   - **嚴禁對任何 Git 追蹤檔案使用 `write_file`**: 不論是源碼還是文件 (含 `GEMINI.md`)，修改時**僅允許**使用 `replace` 工具。嚴禁因「變更面積大」或「重構」而下意識尋求捷徑使用覆寫，這會導致不可預測的代碼截斷與遺失。
   - **模組化結構**: 保持 `src/` 下的結構，禁止直接修改構建產物 `youtube-homepage-cleaner.user.js`。
3. **立即自動備份 [CRITICAL]**: 每次完成單個檔案的修改後，AI Agent **必須在同一個 Turn 內立即執行** 備份指令，嚴禁等到下一輪對話或使用者回應後才備份：
   `git add <file> ; git commit -m "backup: update <file>"` (Windows 環境必須使用 `;` 分隔)。

### 第二階段：文檔同步 (Documentation Sync)
每次修改後，必須更新對應文檔：
- **新功能**: 更新 `README.md` 功能列表、`CHANGELOG.md` 及版本號。
- **修復**: 在 `CHANGELOG.md` 記錄修復內容與原因。
- **發布**: 確保 `package.json` 與 `src/meta.json` 版本號同步。

### 第三階段：驗證與交付 (Verification)
1. **自動測試**: 執行 `npm test` 確保核心邏輯無壞損。
2. **手動構建**: 執行 `npm run build` 生成最終腳本。
3. **正式提交**: 使用 Conventional Commits 格式 (`feat:`, `fix:`, `refactor:`)。

---

## 🔧 疑難排解 (Troubleshooting)

| 問題場景 | 解決方案 |
| :--- | :--- |
| **代碼編輯 (replace) 失敗** | **嚴禁**改用 `write_file`。正確做法：<br>1. **精準錨點**：僅替換變動的 1-3 行，並包含前後一行作為唯一識別錨點。<br>2. **禁止盲試**：失敗後必須重新 `read_file` 檢查不可見字元 (如行尾空格)。<br>3. **分段執行**：將大變更拆分為多個小的 `replace` 呼叫。 |
| **PowerShell 語法錯誤** | Windows 下不支援 `&&`。**必須**改用 `;` 作為指令分隔符。 |
| **代碼遺失/截斷** | 立即執行 `git checkout <file>` 恢復至上一次自動備份的穩定版本。 |

---

## 🚀 發布規範 (Release)

- **Commit Message**: 統一使用英文。
- **版本控制**: 遵循 SemVer 語法。發布主版本 (v2.0.0) 前必須完成全功能手動測試驗證。