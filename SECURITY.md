# 安全政策

## 隱私承諾

這個腳本**不會收集任何個人資料**。

---

## 資料處理

| 資料 | 有收集嗎？ | 儲存位置 | 會傳出去嗎？ |
|------|-----------|---------|-------------|
| 設定偏好 | ✅ | 你的電腦 | ❌ 不會 |
| 過濾統計 | ✅ | 記憶體 (關閉即消失) | ❌ 不會 |
| 瀏覽紀錄 | ❌ 不收集 | - | - |
| 個人資訊 | ❌ 不收集 | - | - |

---

## 使用的權限

| 權限 | 用途 | 安全嗎？ |
|------|------|---------|
| `GM_addStyle` | 注入 CSS 隱藏元素 | ✅ 安全 |
| `GM_getValue` | 讀取設定 | ✅ 安全 |
| `GM_setValue` | 儲存設定 | ✅ 安全 |
| `GM_registerMenuCommand` | 建立選單 | ✅ 安全 |

### 不會使用的權限

- ❌ `GM_xmlhttpRequest` (網路請求)
- ❌ `GM_download` (下載)
- ❌ `GM_notification` (通知)
- ❌ `GM_setClipboard` (剪貼簿)

---

## 安全特性

- ✅ 無混淆：程式碼清楚可讀
- ✅ 無 eval()：不執行動態程式碼
- ✅ 無外部連線：不連接任何伺服器
- ✅ 無追蹤：不收集使用數據
- ✅ 開源：你可以隨時檢查程式碼

---

## 安全建議

1. **只從官方安裝**
   - GitHub: `github.com/bennytsai1234/youtube-homepage-cleaner`
   - GreasyFork: 官方頁面

2. **定期更新**: 保持最新版本

3. **有疑慮就檢查**: 程式碼完全公開

---

## 發現漏洞？

請**不要**公開發 Issue，改用以下方式：

1. GitHub 私訊
2. GitHub Security Advisories

我們會在 48 小時內回覆。

---

## 聯絡

- [GitHub Issues](https://github.com/bennytsai1234/youtube-homepage-cleaner/issues)
- [GitHub Discussions](https://github.com/bennytsai1234/youtube-homepage-cleaner/discussions)

---

**你的隱私是我們的首要考量。**
