# 架構文件

這份文件說明專案的程式碼結構。

---

## 資料夾結構

```
src/
├── main.js           # 程式進入點
├── meta.json         # 腳本資訊 (版本、作者等)
├── core/             # 核心功能
│   ├── config.js     # 設定管理
│   ├── logger.js     # 日誌輸出
│   ├── stats.js      # 統計資料
│   └── utils.js      # 工具函式
├── data/
│   └── selectors.js  # CSS 選擇器 (集中管理)
├── features/         # 功能模組
│   ├── adblock-guard.js   # 處理反廣告封鎖彈窗
│   ├── custom-rules.js    # 自訂規則
│   ├── interaction.js     # 使用者互動
│   ├── style-manager.js   # CSS 樣式管理
│   └── video-filter.js    # 影片過濾 (核心)
└── ui/               # 介面
    ├── i18n.js       # 多語言 (中英日)
    └── menu.js       # 設定選單
```

---

## 主要模組說明

### Core (核心)
- **ConfigManager**: 管理使用者設定，會記住你的選擇
- **Utils**: 工具函式，像是把「1.2萬」轉成數字

### Features (功能)
- **VideoFilter**: 最重要的模組，負責過濾影片
- **AdBlockGuard**: 自動關閉 YouTube 的廣告封鎖警告

### UI (介面)
- **Menu**: Tampermonkey 選單，讓你調整設定
- **I18N**: 根據你的語言顯示對應文字

---

## 運作流程

1. 網頁載入 → 初始化設定和樣式
2. MutationObserver 監控頁面變化
3. 有新內容出現 → VideoFilter 開始過濾
4. 符合規則的影片 → 隱藏

---

## 效能設計

- **CSS 優先**: 能用 CSS 隱藏就不用 JS，快 10-100 倍
- **延遲處理**: 用 debounce 避免太頻繁執行
- **分批處理**: 用 requestIdleCallback 不卡畫面

---

## 測試清單

| 頁面 | 測試項目 |
|------|---------|
| 首頁 | Shorts 隱藏、廣告隱藏、低觀看過濾 |
| 播放頁 | 相關影片過濾 |
| 搜尋頁 | Shorts/廣告隱藏 |
| SPA 導航 | 換頁後過濾器重新生效 |
