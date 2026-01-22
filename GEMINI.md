# Gemini CLI 開發規範

本檔案定義了 AI Agent 在此專案中的操作規範。

---

## 溝通語言

| 場合 | 語言 |
|------|------|
| 與 AI 對話 | 繁體中文 |
| 程式碼註解 | 繁體中文 |
| Commit Message | 英文 |
| README 文件 | 中英雙語 |

---

## 工作原則

- **連續執行**: 多步驟任務自動完成，只在錯誤或需要確認時暫停
- **小步交付**: 每次只做一小部分，方便驗證
- **主動檢查**: 改完後自動跑 lint、build、test

---

## 程式碼風格

```javascript
// ✅ 正確
const videoContainer = document.querySelector('#content');
if (videoContainer?.classList.contains('active')) {
    processVideo(videoContainer);
}

// ❌ 錯誤
const video_container = document.querySelector("#content")
if (video_container.classList.contains("active")) {
    process_video(video_container)
}
```

**重點**：
- 用單引號 `'`
- 結尾要分號 `;`
- 變數用駝峰式 `camelCase`

---

## Git 工作流

### 分支
```
main   ← 穩定版本
  └── beta ← 開發中
        └── feature/xxx ← 新功能
```

### Commit 格式

| 類型 | 用途 | 範例 |
|------|------|------|
| `feat:` | 新功能 | `feat: add dark mode` |
| `fix:` | 修 Bug | `fix: button not working` |
| `docs:` | 改文件 | `docs: update README` |
| `chore:` | 雜事 | `chore: update version` |

### 發布流程
1. 在 `beta` 開發
2. 合併到 `main`
3. 打標籤 `git tag v1.x.x`
4. 推送 `git push origin main --tags`

---

## OpenSpec 工作流

做新功能的三步驟：

1. `/openspec-proposal` → 寫提案
2. `/openspec-apply` → 開始實作
3. `/openspec-archive` → 完成歸檔

---

## 重大架構決策

詳見 [docs/adr/README.md](docs/adr/README.md)

| # | 決策 |
|---|------|
| 1 | CSS 優先隱藏 |
| 2 | 最小外部依賴 |
| 3 | 混合式 DOM 監控 |
| 4 | 選擇器集中管理 |
| 5 | 原生彈窗 UI |
| 6 | OpenCC-JS 繁簡轉換 |

---

## 記住的問題

| 問題 | 解法 |
|------|------|
| Windows Git 中文亂碼 | `git config core.quotepath false` |
| 指令沒有輸出 | 用 Shell Session + `send_command_input` |
