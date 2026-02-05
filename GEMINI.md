# Gemini CLI 開發規範 (Development Protocol)

本檔案定義了 AI Agent 在此專案中的核心操作規範與安全工作流。

---

## 🔁 核心工作流 (The Workflow)

你必須嚴格遵循以下步驟處理每一次變更，確保代碼安全與邏輯完整：

### 第一階段：實作與安全備份 (Implementation & Safety)
1. **需求理解**: 修改前必須明確區分修復 (Fix)、新功能 (Feat) 或重構 (Refactor)。
2. **代碼修改規範 [CRITICAL]**:
   - **禁止使用 `write_file` 覆寫現有源碼**: 為防止代碼截斷遺失，僅允許使用 `replace` 工具進行局部修改。
   - **模組化結構**: 保持 `src/` 下的結構，禁止直接修改構建產物 `youtube-homepage-cleaner.user.js`。
3. **自動本地備份 [CRITICAL]**: 每次完成單個檔案的修改後，**必須自動執行**：
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
| **代碼編輯 (replace) 失敗** | **嚴禁**改用 `write_file`。正確做法：1. 先用 `read_file` 獲取精確縮排與空格。2. 將變更拆分為更小的原子化替換。 |
| **PowerShell 語法錯誤** | Windows 下不支援 `&&`。**必須**改用 `;` 作為指令分隔符。 |
| **代碼遺失/截斷** | 立即執行 `git checkout <file>` 恢復至上一次自動備份的穩定版本。 |

---

## 🚀 發布規範 (Release)

- **Commit Message**: 統一使用英文。
- **版本控制**: 遵循 SemVer 語法。發布主版本 (v2.0.0) 前必須完成全功能手動測試驗證。