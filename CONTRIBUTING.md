# 貢獻指南

感謝你對 YouTube Cleaner 的興趣！

---

## 貢獻類型

| 類型 | 難度 |
|------|------|
| 🐛 修 Bug | ⭐ 簡單 |
| 📝 改文件 | ⭐ 簡單 |
| 🌐 翻譯 | ⭐⭐ 中等 |
| ✨ 新功能 | ⭐⭐⭐ 進階 |

---

## 開發環境

### 需要的工具
- 瀏覽器 (Chrome/Firefox/Edge)
- [Tampermonkey](https://www.tampermonkey.net/)
- VS Code (推薦)
- Git

### 開發流程

```bash
# 1. Fork 並 Clone
git clone https://github.com/你的帳號/youtube-homepage-cleaner.git
cd youtube-homepage-cleaner

# 2. 建立分支
git checkout -b feature/你的功能

# 3. 開發並測試

# 4. 提交
git commit -m "feat: 你的功能"
git push origin feature/你的功能
```

---

## 程式碼規範

```javascript
// ✅ 正確
const videoContainer = document.querySelector('#content');
if (videoContainer?.classList.contains('active')) {
    processVideo(videoContainer);
}

// ❌ 錯誤
const video_container = document.querySelector("#content")
```

**重點**：單引號、分號、駝峰命名

---

## Commit 格式

```
類型: 簡短說明

[詳細內容]
```

| 類型 | 用途 |
|------|------|
| `feat:` | 新功能 |
| `fix:` | 修 Bug |
| `docs:` | 改文件 |
| `chore:` | 雜事 |

---

## 測試清單

提交前請確認：

- [ ] YouTube 首頁正常
- [ ] 播放頁正常
- [ ] 搜尋頁正常
- [ ] Console 沒有錯誤

---

## Pull Request

1. 建立 PR
2. 填寫說明
3. 等待審核 (1-3 天)
4. 合併

---

## 回報問題

### Bug 請包含：
- 瀏覽器版本
- Tampermonkey 版本
- 腳本版本
- 如何重現
- Console 錯誤 (如果有)

### 功能建議請說明：
- 想解決什麼問題
- 你的解決方案

---

## 需要幫助？

- 📖 [README](README.md)
- 💬 [Discussions](https://github.com/bennytsai1234/youtube-homepage-cleaner/discussions)
- 🐛 [Issues](https://github.com/bennytsai1234/youtube-homepage-cleaner/issues)

---

**Happy Contributing! 🎉**
