<div align="center">

<img src="assets/banner.png" alt="YouTube Cleaner" width="720">

# YouTube Cleaner（YouTube 淨化大師）

**純淨、極速、可自訂的 YouTube 體驗強化腳本。**

封鎖 Shorts、過濾低品質推薦、自動處理 Adblock 彈窗，把 YouTube 還原成它本來應有的樣子。

[![Version](https://img.shields.io/badge/version-v2.1.14-orange?style=flat-square)](https://github.com/bennytsai1234/YouTube-Cleaner/releases)
[![License](https://img.shields.io/github/license/bennytsai1234/YouTube-Cleaner?style=flat-square&color=green)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/bennytsai1234/YouTube-Cleaner?style=flat-square&logo=github)](https://github.com/bennytsai1234/YouTube-Cleaner/stargazers)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

[安裝](#安裝) · [功能](#功能) · [使用](#使用) · [文件](docs/README.md) · [貢獻](CONTRIBUTING.md) · [更新紀錄](CHANGELOG.md)

</div>

---

## 簡介

YouTube Cleaner 是一個以 TypeScript 撰寫、透過 Rollup 打包的 Tampermonkey 使用者腳本。它在不修改 YouTube 帳號狀態的前提下，於瀏覽器端攔截、隱藏、與美化 YouTube 的干擾元素：

- **Shorts、合輯、會員限定、Premium 廣告橫幅** — 由 CSS 第一道過濾即時隱藏，零閃爍。
- **低觀看數影片、超短/超長影片、特定關鍵字** — 由可組態的弱規則過濾。
- **反 Adblock 彈窗** — 自動拆除，播放不中斷。
- **點擊行為** — 影片預設於背景新分頁開啟，瀏覽流程不被打斷。

支援繁中、簡中、英文、日文 UI 與本地化過濾正則。

## 功能

### 介面淨化

- **Shorts 全面封鎖**：首頁、搜尋、側邊欄的所有 Shorts 節點。
- **區塊過濾**：「耳目一新」「合輯」「社群貼文」「電影片段」等干擾區塊。
- **廣告/彈窗**：反 Adblock 警告、Premium 強推橫幅自動處理。

### 智慧過濾

- **強規則**（無視白名單）：Shorts、廣告、合輯、會員限定、Premium 橫幅。
- **弱規則**（白名單可豁免）：低觀看數、影片時長、關鍵字、頻道、區塊標題。
- **分層白名單**：頻道白名單、關鍵字白名單、會員專屬白名單。
- **訂閱保護**：自動感應訂閱清單，避免你愛的頻道因低觀看數被隱藏。
- **繁簡互通**：基於 OpenCC，輸入一種字體自動攔截兩岸三地用詞。

### 體驗強化

- **背景新分頁**：點擊影片於背景開啟，保持當前列表位置。
- **通知新分頁**：通知中心點擊影片同樣支援。
- **頻道頁停用過濾**（可選）：進入頻道頁時自動停用內容過濾，避免漏看作者影片。

### 進階管理

- **多語系 UI**：繁中、簡中、英文、日文，可自動偵測或手動切換。
- **JSON 設定備份**：跨裝置同步個人設定。
- **過濾統計**：即時查看被隱藏的影片數量。
- **Debug Mode**：詳細日誌，方便排查 selector 失效。

---

## 安裝

### 1. 安裝 Tampermonkey

| 瀏覽器 | 連結 |
|--------|------|
| Chrome / Edge / Brave | [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Mozilla Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) |
| Safari | [Mac App Store](https://apps.apple.com/app/apple-store/id1482490089) |

### 2. 安裝腳本

<div align="center">

[![Install](https://img.shields.io/badge/⬇_點此安裝-YouTube_Cleaner-success?style=for-the-badge&logo=tampermonkey)](https://raw.githubusercontent.com/bennytsai1234/YouTube-Cleaner/main/youtube-homepage-cleaner.user.js)

</div>

或直接複製安裝連結到 Tampermonkey：

```
https://raw.githubusercontent.com/bennytsai1234/YouTube-Cleaner/main/youtube-homepage-cleaner.user.js
```

### 3. 開啟 YouTube

打開 YouTube，點擊瀏覽器右上角的 Tampermonkey 圖示，選擇 **「⚙️ 淨化大師設定」** 即可開啟設定面板。

---

## 使用

設定面板分為四大類：

| 類別 | 內容 |
|------|------|
| **過濾** | 啟用/停用各規則、調整低觀看門檻、時長範圍 |
| **名單** | 黑/白名單管理（頻道、關鍵字、區塊標題、會員專屬） |
| **體驗** | 新分頁開啟、字型修正、頻道頁停用過濾 |
| **系統** | 語言切換、Debug Mode、設定匯出/匯入、統計 |

### 黑白名單支援精確模式

預設為「包含比對」，若要精確匹配整個名稱，前面加上 `=`：

```
=Some Channel Name      # 只匹配「Some Channel Name」
Some Channel            # 匹配任何包含「Some Channel」的字串
```

### 設定備份

於「系統 → 匯出設定」可將完整設定複製為 JSON 字串（透過 `GM_setClipboard`）。匯入時會自動驗證型別並拒絕格式錯誤的內容，避免汙染 runtime 狀態。

---

## 過濾邏輯

YouTube Cleaner 使用 **強/弱規則** 與 **分層白名單** 的設計：

```
強規則 → 白名單無效（Shorts、廣告、合輯、Premium）
弱規則 → 白名單可豁免（低觀看數、時長、關鍵字、頻道、區塊）
會員影片 → 強規則，但 MEMBERS_WHITELIST 為唯一豁免通道

白名單優先級：
1. 訂閱保護    （自動，僅豁免低觀看數類規則）
2. 頻道/關鍵字白名單  （手動，對弱規則有效）
3. 會員白名單  （會員影片唯一豁免）
```

完整流程與規則對照請看 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

---

## 開發

```bash
git clone https://github.com/bennytsai1234/YouTube-Cleaner.git
cd YouTube-Cleaner
npm install
npm run dev          # Rollup watch
npm run verify       # 完整驗證
```

詳細的環境需求、測試策略、新增規則、發布流程，請看 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

架構說明（資料夾、模組、流程、設計決策），請看 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

### 技術棧

TypeScript（strict）· Rollup · Tampermonkey APIs · ESLint · OpenCC-JS

---

## 貢獻

歡迎送 Issue 與 PR。送 PR 前請先閱讀 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 授權

本專案以 [MIT License](LICENSE) 發布。

---

<div align="center">

如果這個專案改善了你的 YouTube 體驗，請給一顆 ⭐ 鼓勵作者繼續維護。

Maintained by [Benny](https://github.com/bennytsai1234) · Built with TypeScript

</div>
