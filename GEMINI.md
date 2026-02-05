# Gemini CLI 開發規範 (Development Protocol)

本檔案定義了 AI Agent 在此專案中的標準工作流程與操作規範。

---

## 🔁 開發與維護工作流 (The Workflow)

你必須嚴格遵循以下循環來處理每一次的代碼變更：

### 第一階段：實作與修改 (Implementation)
1. **理解需求**: 確認目標是修復 (Fix)、新功能 (Feat) 還是重構 (Refactor)。
2. **代碼修改**:
   - 遵循 `ES6+` 標準與下方的[程式碼風格](#-程式碼風格-code-style)。
   - 保持 `src/` 目錄的模組化結構。
   - **禁止**直接修改 `youtube-homepage-cleaner.user.js` (這是 Build 產物)。
   - **嚴禁使用 `write_file` 覆寫現有源碼檔**: 為了防止因 AI 記憶或傳輸導致的代碼截斷/遺失，修改現有檔案時**僅允許**使用 `replace` 工具進行局部替換。
3. **自動本地備份 (Automatic Git Backup) [CRITICAL]**: AI Agent **必須自動**執行備份。每次完成單個檔案的實質性修改後，Agent 應立即執行 `git add <file> ; git commit -m "backup: update <file>"` (Windows 使用 `;`) 進行本地存檔，無需使用者提醒。這能防止後續操作意外造成代碼丟失。

### 第二階段：文檔同步 (Documentation Sync) 🚨 **CRITICAL**
每次修改代碼後，**必須**檢查並更新對應文檔：

| 修改類型 | 必須更新的文檔 | 操作說明 |
| :--- | :--- | :--- |
| **✨ 新功能 (Feat)** | `README.md` | 更新功能列表、截圖或設定說明 |
| | `CHANGELOG.md` | 在 `[Unreleased]` 或新版本號下新增條目 |
| | `package.json` | 若準備發布，提升 version (SemVer) |
| **🐛 修復 (Fix)** | `CHANGELOG.md` | 在 `Fixed` 區塊記錄修復內容與原因 |
| **🏗️ 架構/邏輯變更** | `DEVELOPMENT.md` | 更新技術決策、模組圖或流程說明 |
| **📦 發布新版** | `src/meta.json` | 確保元數據版本與 `package.json` 一致 |

### 第三階段：驗證與交付 (Verification)
1. **執行測試**: `npm test` (確保邏輯無壞損)。
2. **執行構建**: `npm run build` (更新 `user.js`)。
3. **提交變更**: 使用 Conventional Commits 格式 (`feat:`, `fix:`, `docs:` 等)。

---

## 💬 溝通與語言

| 場合 | 語言 |
|------|------|
| 與 AI 對話 | 繁體中文 |
| 程式碼註解 | 繁體中文 |
| Commit Message | 英文 |
| README 文件 | 中英雙語 |

---

## 🎨 程式碼風格 (Code Style)

```javascript
// ✅ 正確 (Correct)
const videoContainer = document.querySelector('#content');
if (videoContainer?.classList.contains('active')) {
    processVideo(videoContainer);
}

// ❌ 錯誤 (Wrong)
const video_container = document.querySelector("#content") // No snake_case, missing semi
```

**核心規則**：
- 字串使用單引號 `'`。
- 語句結尾**必須**加分號 `;`。
- 變數命名使用 `camelCase`。
- 優先使用現代語法 (`?.`, `??`, `const/let`)。

---

## 🚀 Git 與發布 (Git & Release)

### Commit 類型
- `feat:` 新功能
- `fix:` 修補 Bug
- `docs:` 僅修改文件
- `style:` 格式修改 (不影響代碼運行)
- `refactor:` 重構 (無新功能修復)
- `chore:` 構建過程或輔助工具的變更

### 發布流程 (Release Cycle)
1. 完成所有代碼與文檔修改。
2. 執行 `npm test` && `npm run build`。
3. 提交代碼。
4. 打上標籤: `git tag v1.x.x`。
5. 推送: `git push origin main --tags`。

---

## 🔧 常見問題與解法 (Troubleshooting)

| 問題 | 解法 |
|------|------|
| **Windows Git 中文亂碼** | `git config core.quotepath false` |
| **指令無輸出 (No Output)** | 改用 `run_command` 啟動 Shell Session + `send_command_input` |
| **Rollup Build 失敗** | 檢查 `src/meta.json` 格式是否正確 Json |
| **代碼編輯 (replace) 失敗** | **嚴禁**改用 `write_file` 覆寫以免造成截斷遺失。<br>**正確做法**：1. 用 `read_file` 獲取精確縮排。2. 拆分為更小的原子化替換 (Atomic Replace)。 |
| **PowerShell `&&` 語法錯誤** | Windows 環境下預設使用 PowerShell，不支援 `&&` 分隔指令。<br>**解決方案**：改用 `;` 作為分隔符 (例如：`git add . ; git commit`)。 |
