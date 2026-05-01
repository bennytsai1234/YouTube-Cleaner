# YouTube Cleaner — Project Summary (v2.1.8)

## 📋 專案概述

**YouTube Cleaner（YouTube 淨化大師）** 是一個高效能、模組化的 Tampermonkey Userscript，核心目標是替使用者打造一個純淨、無干擾的 YouTube 瀏覽體驗。

專案以 **TypeScript** 撰寫，透過 **Rollup** 打包成單一 `.user.js` 發布，具備完整的單元測試（tsx）與 E2E 測試（Playwright）覆蓋。

---

## 🏗️ 整體架構

```
src/
├── main.ts                        # App 進入點（Composition Root）
├── meta.json                      # UserScript Metadata
├── env.d.ts                       # 環境型別聲明
│
├── core/                          # 核心基礎設施
│   ├── config.ts                  # 設定管理 (ConfigManager, Singleton)
│   ├── constants.ts               # 頻道名稱清洗常數 (CLEANING_RULES)
│   ├── logger.ts                  # 統一日誌輸出 (Logger)
│   ├── stats.ts                   # 過濾統計 (FilterStats)
│   ├── types.ts                   # YouTube 內部物件型別 (YtConfig)
│   └── utils.ts                   # 通用工具函式 (Utils)
│
├── data/                          # 靜態資料層（純資料，不含邏輯）
│   ├── selectors.ts               # 所有 CSS 選擇器集中管理 (SELECTORS)
│   ├── rules.ts                   # 規則定義、優先級、白名單策略 (RULE_DEFINITIONS)
│   ├── rule-names.ts              # 各語系規則顯示名稱 (RULE_NAMES)
│   ├── default-section-blacklist.ts  # 預設區塊黑名單
│   └── i18n-filter-patterns.ts   # 各語系偵測 RegExp (FILTER_PATTERNS)
│
├── features/                      # 業務邏輯模組
│   ├── video-filter.ts            # MutationObserver 協調中心（掃描生命週期）
│   ├── filter-engine.ts           # 過濾規則裁決（核心判斷邏輯）
│   ├── video-data.ts              # DOM 卡片資料懶惰抽取 (LazyVideoData)
│   ├── dom-visibility.ts          # DOM 隱藏、標記、重置操作
│   ├── custom-rules.ts            # 文字型規則管理 (CustomRuleManager)
│   ├── subscription-manager.ts   # 訂閱頻道自動感應與保護
│   ├── style-manager.ts           # 動態 CSS 注入 (StyleManager)
│   ├── adblock-guard.ts           # 反廣告封鎖彈窗處理 (AdBlockGuard)
│   ├── interaction.ts             # 互動增強（新分頁開啟）
│   └── filter-types.ts            # 過濾相關型別定義
│
├── styles/                        # CSS 模組（由 Rollup 內嵌）
│   └── youtube-cleaner.css        # 基礎反廣告 CSS 規則
│
└── ui/                            # 使用者介面層
    ├── menu.ts                    # 選單流程編排 (UIManager)
    ├── menu-renderer.ts           # 選單渲染邏輯
    ├── menu-types.ts              # 選單型別定義
    ├── list-manager.ts            # 黑白名單 CRUD (ListManager)
    ├── settings-io.ts             # 設定匯出/匯入 (SettingsIO)
    ├── i18n.ts                    # i18n 入口與語系偵測
    └── i18n-strings.ts            # 各語系 UI 文案
```

---

## 🔄 核心運作流程

```
App.init()
  │
  ├── StyleManager.apply()           ← CSS 第一道過濾（零閃爍）
  │     └── 注入 display:none 規則（廣告、Premium、Shorts Shelf 等）
  │
  ├── AdBlockGuard.start()           ← Patch YouTube 內部 config + MutationObserver
  │     └── 監聽 ytd-popup-container，自動移除反廣告彈窗
  │
  ├── VideoFilter.start()            ← 啟動主要 MutationObserver
  │     └── SubscriptionManager.init() ← 啟動訂閱掃描與監聽
  │
  ├── InteractionEnhancer.init()     ← 攔截 click 事件（新分頁邏輯）
  │
  └── GM_registerMenuCommand()       ← 註冊 Tampermonkey 選單入口
  
每次 DOM 變化（MutationObserver）→ processMutations()
  → processElement()
      → FilterEngine.findFilterDetail()   ← 多層規則判斷
          → CustomRuleManager.check()     (文字型規則)
          → checkSectionFilter()          (區塊黑名單)
          → getFilterKeyword()            (關鍵字黑名單)
          → getFilterChannel()            (頻道黑名單)
          → getStrongRuleMatch()          (Shorts / 會員)
          → getFilterView()               (低觀看數)
          → getFilterDuration()           (時長過濾)
          → getFilterPlaylist()           (推薦合輯)
      → FilterEngine.applyWhitelistDecision()  ← 白名單裁決
          → SubscriptionManager.isSubscribed() (訂閱保護)
          → checkWhitelist()                   (頻道/關鍵字白名單)
      → dom-visibility.hideElement()      ← 執行隱藏
```

---

## 🧩 模組職責分工

| 模組 | 職責 |
|------|------|
| `main.ts` | 組合根，初始化所有模組，監聽 `yt-navigate-finish` |
| `core/config.ts` | Singleton ConfigManager，讀寫 GM 儲存，預編譯 RegExp |
| `core/utils.ts` | 數字解析、時間計算、繁簡轉換、頻道名稱清洗 |
| `core/stats.ts` | 過濾次數統計（Session 級別） |
| `data/selectors.ts` | **唯一** CSS 選擇器來源，YouTube DOM 變動只需改這裡 |
| `data/rules.ts` | 規則定義（ID、預設開關、強弱優先級、白名單範疇、文字規則） |
| `features/video-filter.ts` | MutationObserver 生命週期管理，批次處理（requestIdleCallback）|
| `features/filter-engine.ts` | 過濾決策引擎，同時處理白名單豁免裁決 |
| `features/video-data.ts` | `LazyVideoData`：懶讀 title/channel/views/duration 等欄位 |
| `features/dom-visibility.ts` | hideElement / markChecked / clearFilterState / resetHiddenState |
| `features/subscription-manager.ts` | 從側邊欄自動抓取訂閱名單，提供 `isSubscribed()` 保護 |
| `features/adblock-guard.ts` | Patch `window.yt.config_` + MutationObserver 移除彈窗 |
| `features/style-manager.ts` | 動態組裝 CSS 規則字串，注入 `<style id="yt-cleaner-css">` |
| `features/interaction.ts` | 攔截 click，實作「背景新分頁」與「通知新分頁」 |
| `ui/menu.ts` | 四層選單流程：過濾 / 名單 / 體驗 / 系統 |
| `ui/list-manager.ts` | 黑白名單新增（含精確模式 `=名稱`）/移除/清空/恢復預設 |
| `ui/settings-io.ts` | JSON 格式設定匯出（`GM_setClipboard`）/ 匯入 |
| `ui/i18n.ts` | 語系偵測（優先讀 `yt.config_.HL`）、`t()` 翻譯函式 |

---

## ⚙️ 設定系統 (ConfigManager)

所有設定以 `snake_case` key 存入 Tampermonkey `GM_getValue`/`GM_setValue`。

| 設定 Key | 類型 | 說明 |
|----------|------|------|
| `OPEN_IN_NEW_TAB` | bool | 影片在新分頁開啟 |
| `OPEN_NOTIFICATIONS_IN_NEW_TAB` | bool | 通知在新分頁開啟 |
| `FONT_FIX` | bool | 啟用字型修正 |
| `ENABLE_LOW_VIEW_FILTER` | bool | 啟用低觀看數過濾 |
| `LOW_VIEW_THRESHOLD` | number | 最低觀看數門檻 |
| `GRACE_PERIOD_HOURS` | number | 新影片豁免期（小時）|
| `ENABLE_DURATION_FILTER` | bool | 啟用時長過濾 |
| `DURATION_MIN` / `DURATION_MAX` | number | 時長下/上限（秒）|
| `ENABLE_KEYWORD_FILTER` | bool | 啟用關鍵字過濾 |
| `KEYWORD_BLACKLIST` | string[] | 標題關鍵字黑名單 |
| `KEYWORD_WHITELIST` | string[] | 標題關鍵字白名單 |
| `ENABLE_CHANNEL_FILTER` | bool | 啟用頻道過濾 |
| `CHANNEL_BLACKLIST` | string[] | 頻道黑名單 |
| `CHANNEL_WHITELIST` | string[] | 頻道白名單 |
| `MEMBERS_WHITELIST` | string[] | 會員影片專屬白名單 |
| `ENABLE_SECTION_FILTER` | bool | 啟用區塊過濾 |
| `SECTION_TITLE_BLACKLIST` | string[] | 區塊標題黑名單 |
| `ENABLE_REGION_CONVERT` | bool | 啟用繁簡互通過濾（OpenCC）|
| `DISABLE_FILTER_ON_CHANNEL` | bool | 進入頻道頁時停用內容過濾 |
| `DEBUG_MODE` | bool | 啟用詳細日誌 |
| `SUBSCRIBED_CHANNELS` | string[] | 自動掃描的訂閱頻道緩存 |
| `RULE_ENABLES` | RuleEnables | 各規則開關（布林值 map）|
| `RULE_PRIORITIES` | Record | 各規則強弱優先級 |

---

## 🛡️ 過濾優先級系統

```
強規則 (Strong) → 白名單無效
  • shorts_item / shorts_item_js  → Shorts 影片
  • ad_sponsor                    → 廣告贊助
  • mix_only                      → 合輯 Mix
  • premium_banner                → Premium 橫幅
  • recommended_playlists         → 推薦合輯/播放清單

弱規則 (Weak) → 白名單可豁免
  • keyword_blacklist             → 關鍵字命中
  • channel_blacklist             → 頻道黑名單
  • low_view / low_viewer_live    → 低觀看數
  • duration_filter               → 時長超出範圍
  • section_blacklist             → 區塊標題命中
  • members_only_js               → 會員影片（僅 MEMBERS_WHITELIST 可豁免）

白名單優先級
  1. 訂閱保護（SubscriptionManager）— 自動生效，對弱規則有效
  2. 頻道白名單 / 關鍵字白名單   — 手動設定，對弱規則有效
  3. 會員白名單（MEMBERS_WHITELIST）— 唯一能放行會員影片的路徑
```

---

## 🧪 測試涵蓋

| 測試類型 | 指令 | 涵蓋範圍 |
|----------|------|----------|
| 型別檢查 | `npm run typecheck` | TypeScript `strict` 型別檢查，不輸出編譯產物 |
| 單元測試 | `npm test` | filter-test, logic-test, interaction-test, adblock-guard-test, config-manager-test, filter-engine-test, settings-io-test, selectors-test |
| E2E 測試 | `npm run test:e2e` | 搜尋頁、公開頻道頁、播放頁（不需登入）|
| 選擇器驗證 | `npm run test:e2e:selectors` | 驗證 CSS 選擇器在真實 YouTube DOM 中可命中 |
| 發布一致性 | `npm run check:release` | 驗證版本、userscript metadata、README 安裝連結與輸出檔案一致 |
| 完整驗證 | `npm run verify` | typecheck + lint + 單元 + build + release check + E2E |

---

## 🛠️ 技術棧

| 技術 | 用途 |
|------|------|
| TypeScript 5.x | 全體源碼語言 |
| Rollup 4.x | 模組打包（輸出 IIFE UserScript）|
| rollup-plugin-userscript-metablock | 自動插入 UserScript 標頭 |
| rollup-plugin-string | 將 CSS 文件以字串內嵌打包 |
| tsx | 單元測試執行器（無需編譯步驟）|
| `test/helpers/*` | 共用測試 runner、GM storage mock 與 JSDOM browser env |
| Playwright | E2E 瀏覽器自動化測試 |
| ESLint + eslint-plugin-userscripts | 代碼風格與 UserScript 規範檢查 |
| OpenCC-JS (CDN) | 繁簡中文互通過濾引擎 |

---

## 📦 版本與發布

- **當前版本**：`v2.1.8`
- **發布平台**：Greasy Fork、GitHub Releases
- **版本管理**：`npm version <patch/minor/major>`（自動觸發 `scripts/update-readme.js` 更新 README 版號）
- **輸出檔案**：`youtube-homepage-cleaner.user.js`（根目錄，直接發布）
- **發布前驗證**：`npm run verify`，並由 `scripts/check-release-consistency.js` 檢查版本與 URL 一致性。

---

*Last Updated: 2026-05-01*
*Status: Stable / Active Development*
