# 業務邏輯（features）

## 當前職責

實作所有 YouTube 頁面的過濾、隱藏、互動與防護邏輯。這是專案的核心業務層，包含 MutationObserver 掃描、過濾裁決、DOM 操作、自訂規則、訂閱保護、CSS 注入、AdBlock 防護與點擊互動。當你需要修改過濾行為、新增過濾邏輯、調整 DOM 操作方式或修復防護機制時，從這裡開始。

## 範圍

### 主協調器
- `src/features/video-filter.ts`：MutationObserver 協調中心，管理掃描生命週期

### 過濾核心
- `src/features/filter-engine.ts`：過濾規則裁決引擎，核心判斷邏輯
- `src/features/video-data.ts`：LazyVideoData，DOM 卡片資料懶惰抽取

### 過濾輔助
- `src/features/dom-visibility.ts`：隱藏、標記、重置 DOM 狀態
- `src/features/custom-rules.ts`：CustomRuleManager，文字型規則管理

### 特殊功能
- `src/features/subscription-manager.ts`：訂閱頻道自動感應與保護
- `src/features/style-manager.ts`：StyleManager，動態 CSS 注入
- `src/features/adblock-guard.ts`：AdBlockGuard，反廣告封鎖彈窗處理
- `src/features/interaction.ts`：互動增強（新分頁開啟）

### 型別
- `src/features/filter-types.ts`：FilterDetail / WhitelistReason 型別定義

## 依賴與影響

- 上游：`core/`（ConfigManager、Logger、Stats、Types、Utils）、`data/`（Selectors、Rules、RuleNames）
- 下游：`ui/`（UIManager 觸發設定變更後回流至此）
- 外部：Tampermonkey GM API、YouTube DOM、YouTube 內部 JS 物件（yt.config_）

## 關鍵流程

### 啟動序列
1. StyleManager.apply() → 第一道 CSS 過濾（零閃爍）
2. AdBlockGuard.sync() → Patch yt.config_ + 啟動 popup observer
3. VideoFilter.start() → 啟動 MutationObserver，內含 SubscriptionManager.init()
4. InteractionEnhancer.init() → 攔截 click 事件

### 過濾決策
```
DOM mutation → processMutations() → processElement(card)
  ├── CustomRuleManager.check()       （文字型規則）
  ├── checkSectionFilter()            （區塊黑名單）
  ├── getFilterKeyword()              （關鍵字黑名單）
  ├── getFilterChannel()              （頻道黑名單）
  ├── getStrongRuleMatch()            （Shorts / 會員 / 廣告 / 合輯）
  ├── getFilterView()                 （低觀看數）
  ├── getFilterDuration()             （時長範圍）
  └── getFilterPlaylist()             （推薦合輯）
       ↓
  applyWhitelistDecision()
  ├── SubscriptionManager 訂閱保護（僅對弱規則生效）
  └── checkWhitelist() 白名單檢查
```

### SPA 路由處理
- `yt-navigate-finish` 事件 → 重新 patch、清除快取、重新掃描

## 變更入口點

- 新增過濾類型：從 `filter-engine.ts` 的 findFilterDetail() 開始
- 修改 DOM 隱藏行為：從 `dom-visibility.ts` 開始
- 新增自訂規則類型：從 `custom-rules.ts` 開始
- 修復 AdBlock 相關問題：從 `adblock-guard.ts` 開始
- 調整互動行為：從 `interaction.ts` 開始

## 變更路徑

- 過濾邏輯變更 → 需同步更新 `test/filter-test.ts` / `test/filter-engine-test.ts`
- DOM 操作變更 → 需同步檢查 `data/selectors.ts` 是否需更新
- 啟動流程變更 → 需同步檢查 `main.ts`（entry）的初始化順序
- StyleManager 變更 → 需檢查 `styles/youtube-cleaner.css` 的 CSS 規則

## 已知風險

- MutationObserver 效能：過多 DOM 變化時可能造成效能瓶頸
- YouTube 內部 API（yt.config_）非公開，改版時可能失效
- LazyVideoData 的 DOM 抽取邏輯依賴 YouTube 的 HTML 結構
- AdBlock 防護邏輯與 YouTube 的反廣告機制是軍備競賽

## 參考筆記

無（獨立模式）

## 禁止事項

- 不要在 features 中直接定義 CSS 選擇器（應放在 data/selectors.ts）
- 不要在 features 中直接實作 UI 渲染（應放在 ui/）
- 不要略過 filter-engine 的裁決直接操作 DOM
