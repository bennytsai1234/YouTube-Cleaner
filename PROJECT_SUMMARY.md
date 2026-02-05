# YouTube Cleaner Project Summary (v2.0.0)

## 📋 專案概述
YouTube Cleaner 是一個高效能、模組化的瀏覽器腳本 (Userscript)，旨在透過過濾 Shorts、推薦內容、低品質影片及廣告攔截警告，為使用者打造純淨的 YouTube 瀏覽體驗。

## 🚀 v2.0.0 重大里程碑
2.0.0 版本是本專案的一個重要轉折點，從單一腳本進化為**結構化、元件化**的成熟架構。

### 1. 架構重構 (Modularization)
- **職責分離**：將原本肥大的 `App` 類別拆分為多個核心模組：
    - `AdBlockGuard`: 獨立負責反廣告攔截邏輯與配置補丁。
    - `VideoFilter`: 核心過濾引擎，負責 DOM 監聽與過濾決策。
    - `UIManager`: 採用宣告式選單系統，優化互動邏輯。
    - `StyleManager`: 統一管理 CSS 注入。
- **組合根模式 (Composition Root)**：`main.js` 現在僅作為啟動器，負責協調各模組的初始化，大幅提升代碼可讀性。

### 2. 穩定性與健康檢查 (Reliability)
- **選擇器健康檢查 (Selector Health Check)**：新增自動診斷工具，在 DEBUG 模式下自動驗證 YouTube DOM 結構是否發生變化，並在控制台拋出具體警告，縮短修復週期。
- **狀態機過濾**：引入 Mutation 隊列與狀態管理，避免在 YouTube 頻繁更新 DOM 時產生競態條件 (Race Conditions) 或效能瓶頸。

### 3. 效能優化 (Performance)
- **增量處理**：由全頁掃描改為增量掃描，僅處理 MutationObserver 回傳的新增節點。
- **Idle-Time 執行**：利用 `requestIdleCallback` 將過濾任務分配至瀏覽器空閒時間，確保滾動流暢度。
- **快取機制**：在 `VideoFilter` 與 `LazyVideoData` 中大量使用快取，避免重複的 DOM 查詢與數值解析。

### 4. 核心功能 (Core Features)
- **反廣告攔截警告**：自動關閉 YouTube 彈窗並自動恢復影片播放。
- **Shorts 全面封鎖**：移除首頁、搜尋與側欄的所有 Shorts 入口。
- **智慧過濾**：支援觀看數閾值、發布時間寬限期、影片時長、關鍵字與頻道黑白名單。
- **區塊過濾器**：可依標題隱藏特定首頁區塊（如：耳目一新、合輯）。
- **多國語言**：完整支援 繁體中文、簡體中文、英文、日文。

## 🛠️ 技術棧 (Tech Stack)
- **Language**: JavaScript (ES6+)
- **Build Tool**: Rollup.js (模組化打包)
- **Testing**: Node.js 自研測試套件 (涵蓋 70+ 測試案例)
- **Libraries**: OpenCC-JS (繁簡轉換)

## 📈 未來展望
1. **設定雲端同步**：探索使用瀏覽器同步 API 儲存設定。
2. **UI 視覺化調整**：從 `prompt` 選單進化為嵌入式的 HTML 設定面板。
3. **機器學習預測**：研究利用簡單的啟發式演算法預測感興趣內容，而非僅依賴黑名單。

---
*Last Updated: 2026-02-06*
*Status: Stable / Released*
