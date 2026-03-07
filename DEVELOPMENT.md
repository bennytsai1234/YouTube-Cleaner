# 專案開發指南 (Development Guide)

本文件整合了專案的**架構說明**與**技術決策**，旨在幫助開發者快速上手。

---

## 🏗️ 1. 資料夾結構 (Architecture)

專案採用模組化設計 (`src/`)，最終透過 `rollup` 打包成單一腳本。

```
src/
├── main.ts           # 程式進入點 (Entry Point)
├── meta.json         # UserScript Metadata (版本、@match、@require)
├── core/             # 核心基礎設施
│   ├── config.ts     # 設定管理 (ConfigManager)
│   ├── logger.ts     # 日誌封裝 (Logger)
│   ├── stats.ts      # 統計資料 (FilterStats)
│   ├── constants.ts  # 全局常數 (Constants)
│   ├── types.ts      # TypeScript 型別定義 (Types)
│   └── utils.ts      # 通用工具 (數字解析、時間計算)
├── data/
│   └── selectors.ts  # CSS 選擇器集中管理 (Critical!)
├── features/         # 業務邏輯模組
│   ├── video-filter.ts    # 影片過濾核心邏輯
│   ├── style-manager.ts   # CSS 樣式注入 (高效過濾)
│   ├── adblock-guard.ts   # 反廣告封鎖彈窗處理
│   ├── custom-rules.ts    # 擴充規則定義
│   └── interaction.ts     # 互動增強 (如新分頁開啟)
└── ui/               # 使用者介面
    ├── menu.ts       # Tampermonkey 選單實作
    └── i18n.ts       # 多國語言架構 (i18n)，統一管理繁、簡、英、日語系與正則匹配
```

**運作流程**:
1. `main.ts`: 初始化 `ConfigManager` 與 `StyleManager`。
2. `StyleManager`: 注入 CSS 規則 (First Pass Filter)。
3. `MutationObserver`: 監控 DOM 變化，將新增元素傳遞給 `VideoFilter`。
4. `VideoFilter`: 透過 `utils.ts` 解析影片資訊，判斷是否隱藏 (Second Pass Filter)。

---

## 🏛️ 2. 關鍵技術決策 (Key Decisions)

### 2.1 CSS 優先策略 (Performance)
**原則**: 能用 CSS 隱藏的元素，絕不使用 JavaScript。
**原因**: CSS 處理速度比 JS 快 10-100 倍，且能避免頁面閃爍 (FOUC)。
**實作**: `StyleManager` 負責生成動態 CSS，只有當規則需要內容判斷 (如 "觀看數 < 1000") 時才使用 JS。

### 2.2 混合式監控 (Monitoring)
**問題**: YouTube 是 SPA (單頁應用)，內容動態載入。
**解法**:
1. **靜態規則**: CSS `display: none` (立即生效)。
2. **MutationObserver**: 監控 DOM 樹變化 (Debounce 處理)。
3. **事件監聽**: 監聽 `yt-navigate-finish` 處理頁面跳轉。

### 2.3 嚴謹的型別系統與穩定性 (Type Safety & Reliability)
**原則**: 全面採用 TypeScript，拒絕因拼寫錯誤或無效參數導致的執行階段中斷。
**優勢**: 基於 TypeScript 與編譯階段的嚴格檢查，增進了開發流程的可控性，減少了重構階段潛在的破壞性變更 (Breaking Changes)。

### 2.4 選擇器集中管理 (Maintainability)
**原則**: 所有 CSS Selector 必須定義在 `src/data/selectors.ts`。
**原因**: YouTube 前端代碼經常變動。集中管理讓我們能在單一檔案中修復大部分的 DOM 變更問題。

### 2.5 原生 UI (Simplicity)
**原則**: 使用 Tampermonkey 原生選單 (`GM_registerMenuCommand`) 與 `prompt`/`alert`。
**原因**: 避免注入複雜的 React/Vue UI 到頁面中，減少與 YouTube CSS 衝突的風險，並降低維護成本。

---

## 🧪 3. 測試與發布

- **單元測試**: `npm test` (使用 `tsx` 執行 `test/` 目錄下的測試腳本，驗證核心邏輯與組件)。
- **構建**: `npm run build` (使用 rollup 打包 ts 模組)。
- **發布**: `npm run version` 可自動更新 README 版號。
