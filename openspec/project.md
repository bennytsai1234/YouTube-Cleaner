# 專案規範

## 這個專案是什麼？

一個 Tampermonkey 腳本，用來清理 YouTube 首頁，隱藏 Shorts、廣告、低觀看影片等干擾內容。

**目標用戶**: 想要乾淨 YouTube 體驗的人

---

## 技術棧

| 技術 | 用途 |
|------|------|
| JavaScript (ES6+) | 主程式語言 |
| Tampermonkey 5.0+ | 腳本執行環境 |
| CSS3 (`:has()`) | 隱藏元素 |
| OpenCC-JS | 繁簡轉換 |

### 使用的 API

| API | 用途 |
|-----|------|
| `GM_addStyle` | 注入 CSS |
| `GM_getValue` / `GM_setValue` | 儲存設定 |
| `GM_registerMenuCommand` | 建立選單 |
| `GM_info` | 取得腳本資訊 |

**不使用網路請求**，所有資料都在本地。

---

## 程式碼規範

### 命名方式

| 類型 | 格式 | 範例 |
|------|------|------|
| 變數 | camelCase | `videoContainer` |
| 常數 | UPPER_SNAKE_CASE | `MAX_RETRY` |
| 類別 | PascalCase | `VideoFilter` |

### 格式
- 分號: 必須
- 引號: 單引號
- 縮排: 4 空格

---

## 過濾策略

```
優先順序:
1. CSS 規則 (最快)
2. MutationObserver (動態內容)
3. 文字比對 (備援)
```

---

## 效能目標

| 指標 | 目標 |
|------|------|
| 初始執行 | < 50ms |
| 過濾 100 個影片 | < 100ms |
| 記憶體 | < 5MB |

---

## Git 規範

### 分支
```
main   ← 穩定版
  └── beta ← 開發中
        └── feature/xxx
```

### Commit 格式
- `feat:` 新功能
- `fix:` 修 Bug
- `docs:` 改文件
- `chore:` 雜事

---

## 資料夾結構

```
youtube-homepage-cleaner/
├── src/                    # 原始碼
├── docs/adr/               # 架構決策記錄
├── openspec/               # 規範文件
│   ├── specs/              # 現行規範
│   └── changes/            # 變更提案
├── youtube-homepage-cleaner.user.js  # 主腳本
├── GEMINI.md               # AI 協作規則
└── README.md               # 說明文件
```

---

## 測試清單

| 頁面 | 測試項目 |
|------|---------|
| 首頁 | Shorts 隱藏、廣告隱藏、低觀看過濾 |
| 播放頁 | 相關影片過濾 |
| 搜尋頁 | Shorts/廣告隱藏 |
| SPA 導航 | 換頁後過濾器重新生效 |

---

## 參考資料

- [Tampermonkey 文件](https://www.tampermonkey.net/documentation.php)
- [Conventional Commits](https://www.conventionalcommits.org/)
