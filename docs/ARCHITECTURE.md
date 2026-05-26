# Architecture

YouTube Cleaner 是以 TypeScript 撰寫、透過 Rollup 打包為單一 IIFE `.user.js` 的 Tampermonkey 腳本。本文件是專案架構的單一真相源（Single Source of Truth），描述程式碼結構、核心流程、模組職責與關鍵設計決策。

> 想開始開發？請先看 [DEVELOPMENT.md](DEVELOPMENT.md)。
> 想了解規則細節？請看模組層級的 [Codebase Atlas](youtube_cleaner_index.md)。

---

## 資料夾結構

```
src/
├── main.ts                         # App 進入點（Composition Root）
├── meta.json                       # UserScript Metadata（版本、@match、@require）
├── env.d.ts                        # 環境型別聲明
│
├── core/                           # 核心基礎設施（不依賴外部模組）
│   ├── config.ts                   # ConfigManager（Singleton，GM 儲存讀寫、預編譯 RegExp）
│   ├── constants.ts                # CLEANING_RULES（頻道名稱清洗常數）
│   ├── logger.ts                   # Logger（統一日誌輸出）
│   ├── stats.ts                    # FilterStats（過濾統計，Session 級別）
│   ├── types.ts                    # YtConfig（YouTube 內部物件型別）
│   └── utils.ts                    # Utils（數字解析、時間計算、繁簡轉換）
│
├── data/                           # 靜態資料層（純資料、無副作用）
│   ├── selectors.ts                # SELECTORS（所有 CSS 選擇器集中管理） ← 最常需修改
│   ├── rules.ts                    # RULE_DEFINITIONS（規則定義、優先級、白名單策略）
│   ├── rule-names.ts               # RULE_NAMES（各語系規則顯示名稱）
│   ├── default-section-blacklist.ts  # 預設區塊標題黑名單
│   └── i18n-filter-patterns.ts     # FILTER_PATTERNS（各語系偵測 RegExp）
│
├── features/                       # 業務邏輯模組
│   ├── video-filter.ts             # MutationObserver 協調中心（掃描生命週期）
│   ├── filter-engine.ts            # 過濾規則裁決引擎（核心判斷邏輯）
│   ├── video-data.ts               # LazyVideoData（DOM 卡片資料懶惰抽取）
│   ├── dom-visibility.ts           # 隱藏、標記、重置 DOM 狀態
│   ├── custom-rules.ts             # CustomRuleManager（文字型規則管理）
│   ├── subscription-manager.ts     # 訂閱頻道自動感應與保護
│   ├── style-manager.ts            # StyleManager（動態 CSS 注入）
│   ├── adblock-guard.ts            # AdBlockGuard（反廣告封鎖彈窗處理）
│   ├── interaction.ts              # 互動增強（新分頁開啟）
│   └── filter-types.ts             # FilterDetail / WhitelistReason 型別
│
├── styles/                         # CSS 模組（Rollup 以字串形式內嵌）
│   └── youtube-cleaner.css         # 基礎反廣告 CSS 規則
│
└── ui/                             # 使用者介面層
    ├── menu.ts                     # UIManager（選單流程編排）
    ├── menu-renderer.ts            # 選單渲染邏輯（prompt/alert 封裝）
    ├── menu-types.ts               # MenuContext / MenuItem 型別
    ├── list-manager.ts             # ListManager（黑白名單 CRUD，含精確模式 `=名稱`）
    ├── settings-io.ts              # SettingsIO（JSON 設定匯出/匯入）
    ├── i18n.ts                     # 語系偵測、`t()` 翻譯函式
    └── i18n-strings.ts             # 各語系 UI 文案
```

---

## 核心運作流程

### 啟動序列

```
App.init()
  │
  ├── StyleManager.apply()          ← 第一道過濾，注入 CSS 隱藏規則（零閃爍）
  │
  ├── AdBlockGuard.sync()           ← Patch window.yt.config_ + 啟動 ytd-popup-container observer
  │
  ├── VideoFilter.start()           ← 啟動主 MutationObserver
  │     └── SubscriptionManager.init()  ← 啟動訂閱掃描與監聽
  │
  ├── InteractionEnhancer.init()    ← 攔截 click 事件（新分頁邏輯）
  │
  ├── GM_registerMenuCommand()      ← 註冊 Tampermonkey 選單入口
  │
  └── window.addEventListener('yt-navigate-finish', refresh)
        ← SPA 路由後重新 patch、清除快取、重新掃描
```

### 過濾決策路徑

```
DOM mutation → processMutations() → processElement(card)
  │
  ├── FilterEngine.findFilterDetail(card)
  │     ├── CustomRuleManager.check()    （文字型規則）
  │     ├── checkSectionFilter()         （區塊黑名單）
  │     ├── getFilterKeyword()           （關鍵字黑名單）
  │     ├── getFilterChannel()           （頻道黑名單）
  │     ├── getStrongRuleMatch()         （Shorts / 會員 / 廣告 / 合輯）
  │     ├── getFilterView()              （低觀看數）
  │     ├── getFilterDuration()          （時長範圍）
  │     └── getFilterPlaylist()          （推薦合輯）
  │
  ├── FilterEngine.applyWhitelistDecision()
  │     ├── SubscriptionManager.isSubscribed()  （訂閱保護，僅對低觀看數弱規則生效）
  │     └── checkWhitelist()                    （頻道/關鍵字白名單，對弱規則生效）
  │
  └── dom-visibility.hideElement() / clearFilterState()
```

---

## 模組職責

| 模組 | 職責 |
|------|------|
| `main.ts` | App 組裝根，初始化所有模組、綁定 `yt-navigate-finish`、防重複初始化 |
| `core/config.ts` | Singleton ConfigManager，讀寫 GM 儲存、預編譯 RegExp、defaults 管理 |
| `core/utils.ts` | 數字解析、時間計算、OpenCC 繁簡轉換封裝、頻道名稱清洗 |
| `core/stats.ts` | 過濾次數統計（Session 級別） |
| `data/selectors.ts` | 唯一 CSS 選擇器來源，YouTube DOM 變動只需改這裡 |
| `data/rules.ts` | 規則定義（ID、預設開關、強弱優先級、白名單範疇、文字規則） |
| `features/video-filter.ts` | MutationObserver 生命週期、批次處理（`requestIdleCallback`，每批 50 個，500ms 超時） |
| `features/filter-engine.ts` | 規則判斷與白名單裁決，輸出 `FilterDetail` |
| `features/video-data.ts` | `LazyVideoData`：懶讀 title/channel/views/duration/members/playlist 等欄位 |
| `features/dom-visibility.ts` | `hideElement` / `markChecked` / `clearFilterState` / `resetHiddenState` |
| `features/subscription-manager.ts` | 側邊欄訂閱掃描、`isSubscribed()` 保護（500 筆上限） |
| `features/adblock-guard.ts` | Patch `window.yt.config_` + MutationObserver 移除反廣告彈窗 |
| `features/style-manager.ts` | 動態組裝 CSS 規則字串，注入 `<style id="yt-cleaner-css">` |
| `features/interaction.ts` | 攔截 click，實作背景新分頁與通知中心新分頁 |
| `ui/menu.ts` | 四大類選單編排：過濾 / 名單 / 體驗 / 系統 |
| `ui/list-manager.ts` | 黑白名單新增/移除/清空/恢復預設（含精確模式 `=名稱`） |
| `ui/settings-io.ts` | JSON 格式設定匯出（`GM_setClipboard`）/ 匯入（型別驗證） |
| `ui/i18n.ts` | 語系偵測（優先讀 `yt.config_.HL`）、`t()` 翻譯函式 |

---

## 設定系統

所有設定以 `snake_case` key 存入 Tampermonkey `GM_setValue` / `GM_getValue`。

| Key | 型別 | 說明 |
|-----|------|------|
| `OPEN_IN_NEW_TAB` | bool | 影片在新分頁開啟 |
| `OPEN_NOTIFICATIONS_IN_NEW_TAB` | bool | 通知中心點擊在新分頁開啟 |
| `FONT_FIX` | bool | 啟用字型修正 |
| `ENABLE_LOW_VIEW_FILTER` | bool | 啟用低觀看數過濾 |
| `LOW_VIEW_THRESHOLD` | number | 最低觀看數門檻 |
| `GRACE_PERIOD_HOURS` | number | 新影片豁免期（小時） |
| `ENABLE_DURATION_FILTER` | bool | 啟用時長過濾 |
| `DURATION_MIN` / `DURATION_MAX` | number | 時長下/上限（秒） |
| `ENABLE_KEYWORD_FILTER` | bool | 啟用關鍵字過濾 |
| `KEYWORD_BLACKLIST` / `KEYWORD_WHITELIST` | string[] | 標題關鍵字黑/白名單 |
| `ENABLE_CHANNEL_FILTER` | bool | 啟用頻道過濾 |
| `CHANNEL_BLACKLIST` / `CHANNEL_WHITELIST` | string[] | 頻道黑/白名單 |
| `MEMBERS_WHITELIST` | string[] | 會員影片專屬白名單（唯一能放行會員影片的路徑） |
| `ENABLE_SECTION_FILTER` | bool | 啟用區塊過濾 |
| `SECTION_TITLE_BLACKLIST` | string[] | 區塊標題黑名單 |
| `ENABLE_REGION_CONVERT` | bool | 啟用繁簡互通過濾（OpenCC） |
| `DISABLE_FILTER_ON_CHANNEL` | bool | 進入頻道頁時停用內容過濾 |
| `DEBUG_MODE` | bool | 啟用詳細日誌 |
| `SUBSCRIBED_CHANNELS` | string[] | 自動掃描的訂閱頻道快取 |
| `RULE_ENABLES` | `RuleEnables` | 各規則開關（布林值 map） |
| `RULE_PRIORITIES` | `Record` | 各規則強弱優先級 |

---

## 過濾優先級系統

```
強規則 (Strong)  → 白名單無效
  • shorts_item / shorts_item_js     Shorts 影片
  • ad_sponsor                       廣告贊助
  • mix_only                         合輯 Mix
  • premium_banner                   Premium 橫幅
  • recommended_playlists            推薦合輯/播放清單

弱規則 (Weak)    → 白名單可豁免
  • keyword_blacklist                關鍵字命中
  • channel_blacklist                頻道黑名單
  • low_view / low_viewer_live       低觀看數
  • duration_filter                  時長超出範圍
  • section_blacklist                區塊標題命中
  • members_only_js                  會員影片（僅 MEMBERS_WHITELIST 可豁免）

白名單優先級
  1. 訂閱保護（SubscriptionManager）— 自動，僅豁免低觀看數類弱規則
  2. 頻道白名單 / 關鍵字白名單      — 手動，對弱規則有效
  3. 會員白名單（MEMBERS_WHITELIST）— 會員影片唯一豁免路徑
```

---

## 關鍵設計決策

### CSS-First 策略

能用 CSS 隱藏的元素，絕不使用 JavaScript。CSS 處理速度比 JS 快 10–100 倍，且避免頁面閃爍（FOUC）。`StyleManager` 生成動態 CSS；只有需要解析內容（觀看數、時長、頻道名稱）時才使用 JS。

### 混合式監控

YouTube 是 SPA，內容動態載入、頁面跳轉不重新載入。三層解法：

1. **靜態 CSS 規則** — `StyleManager` 注入後立即生效。
2. **MutationObserver** — 監控 DOM 樹變化，以 `requestIdleCallback` 批次處理（每批 50 個，500ms 超時）。
3. **`yt-navigate-finish` 事件** — 頁面跳轉後重新掃描。

### LazyVideoData

每個 DOM 元素可能不需要讀取全部欄位，過早讀取浪費效能。`LazyVideoData` 使用 getter 延遲計算，首次讀取才執行 DOM 查詢與數字解析，結果快取於 `private _field`。

### 強/弱規則系統

白名單與規則的互動策略明確分層：

- **強規則**：Shorts、廣告、合輯 — 白名單對這些無效。
- **弱規則**：觀看數、時長、關鍵字 — 可被頻道白名單或訂閱保護豁免。
- **特例**：`members_only` 為強規則，但 `MEMBERS_WHITELIST` 開了專屬例外通道。

### 選擇器集中管理

所有 CSS Selector 必須定義在 `src/data/selectors.ts`。YouTube 前端常常更新，集中管理讓單一檔案修改即可修復大多數 DOM 變更問題。

### 最小外部依賴

核心功能零依賴；繁簡互通功能依賴 CDN `opencc-js@1.0.5`。CDN 失效時，自動降級為原生字串比對（Graceful Degradation）。

### 原生 Tampermonkey UI

使用 `GM_registerMenuCommand` + `prompt` / `alert` 原生 UI。避免注入 React/Vue UI 到頁面，減少與 YouTube CSS 衝突，降低維護成本。

### 嚴謹型別系統

全面採用 TypeScript（`strict` mode）。規則 ID、設定 key、選單操作都有型別約束，重構時不會靜默失效。

---

## 技術棧

| 技術 | 用途 |
|------|------|
| TypeScript 6.x (`strict`) | 全體源碼 |
| Rollup 4.x | 模組打包（IIFE UserScript 輸出） |
| `rollup-plugin-userscript-metablock` | 自動插入 UserScript 標頭 |
| `rollup-plugin-string` | CSS 以字串內嵌打包 |
| `tsx` | 單元測試執行器（免編譯） |
| `jsdom` | 單元測試 DOM 環境 |
| Playwright | E2E 瀏覽器自動化 |
| ESLint + `eslint-plugin-userscripts` | 代碼風格與 UserScript 規範 |
| OpenCC-JS（CDN） | 繁簡中文互通過濾引擎 |
