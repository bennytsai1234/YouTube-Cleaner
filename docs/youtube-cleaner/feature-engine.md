# feature-engine — 功能引擎層

## 職責

實作所有 YouTube 頁面上的執行時期功能：影片過濾、反 Adblock 防護、CSS 樣式注入、點擊行為強化、訂閱頻道自動掃描。此模組是專案的核心價值所在，所有使用者可見的行為都由這裡驅動。

## 範圍

- `src/features/video-filter.ts` — **VideoFilter**：過濾編排器。管理 MutationObserver（監聽 body 的 childList/subtree）、批次處理（requestIdleCallback + BATCH_SIZE=50）、整頁掃描、選擇器健康檢查（DEBUG_MODE）、快取清除。提供 start/stop/processPage/processElement/reset/clearCache/scanSubscriptions。
- `src/features/filter-engine.ts` — **FilterEngine**：核心過濾邏輯。findFilterDetail() 依序執行：文字規則匹配 → 區段過濾 → 關鍵字過濾 → 頻道過濾 → 強規則匹配 → 觀看數過濾 → 時長過濾 → 播放清單過濾。checkSectionFilter() 處理 RICH-SECTION/REEL-SHELF/SHELF-RENDERER。checkWhitelist() 檢查頻道白名單與關鍵字白名單。
- `src/features/filter-types.ts` — **FilterDetail**（reason/trigger/rule）與 **WhitelistReason**（channel_whitelist/keyword_whitelist）型別。
- `src/features/video-data.ts` — **LazyVideoData**：惰性 DOM 資料提取。title（含 aria-label fallback）、channel（含 yt-decorated-avatar-view-model 處理）、url、viewCount（含觀看數+直播人數區分）、timeAgo、duration、isShorts、isMembers、isUserPlaylist、isPlaylist。
- `src/features/dom-visibility.ts` — DOM 顯隱管理。getFilterContainer()（向上查找過濾容器）、hideElement()（設 display:none!important + visibility:hidden!important + dataset 標記 + FilterStats 記錄）、markChecked()、clearFilterState()（清除所有 yp-checked/yp-hidden 標記並還原樣式）、resetHiddenState()（僅清除隱藏）。
- `src/features/custom-rules.ts` — **CustomRuleManager**：從 RULE_DEFINITIONS 載入文字規則，對元素 textContent 執行 RegExp/字串匹配。
- `src/features/subscription-manager.ts` — **SubscriptionManager**：自動掃描側邊欄（ytd-guide-section-renderer）或訂閱頁面（ytd-browse），提取頻道名稱（經 Utils.cleanChannelName 清洗），去重後寫入 ConfigManager。含 15 分鐘掃描間隔、500 頻道上限、MutationObserver 監聽側邊欄展開。
- `src/features/adblock-guard.ts` — **AdBlockGuard**：雙重防護。patchConfig() 修改 YouTube 內部 config（openPopupConfig + EXPERIMENT_FLAGS）阻止偵測；MutationObserver 監聽 popup 容器，觸發 checkAndClean() 自動關閉彈窗。
- `src/features/style-manager.ts` — **StyleManager**：動態 CSS 注入。從 RuleEnables 讀取開關狀態，組合 CSS 選擇器規則（廣告、Premium、Shorts、新聞、電影等），注入 `<style id="yt-cleaner-css">`。支援字型修復。
- `src/features/interaction.ts` — **InteractionEnhancer**：全域 click 事件攔截（capture 階段）。處理通知新分頁、一般影片背景新分頁、側欄導覽、頻道連結。使用 SELECTORS.INTERACTION_EXCLUDE 排除不該攔截的元素。

## 依賴與影響

- **上游**：
  - core-foundation（ConfigManager、Utils、Logger、FilterStats、型別）
  - data-definitions（SELECTORS、RuleDefinition、RULE_DEFINITIONS、buildDefaultRuleEnables、buildDefaultRulePriorities、getTextRuleDefinitions）
  - user-interface（I18N — VideoData 使用 I18N.filterPatterns 解析觀看數；StyleManager 使用 I18N.t() 產生語系化 CSS 選擇器）
- **下游**：
  - app-entry（main.ts 實例化並管理所有 feature 生命週期）

## 關鍵流程

- **過濾管線**（VideoFilter.processElement）：
  1. getFilterContainer() 向上查找容器
  2. 檢查 ypChecked（已處理）/ ypHidden（已隱藏）/ native_hidden
  3. 跳過 ytd-playlist-panel-video-renderer
  4. FilterEngine.findFilterDetail() 依序匹配規則
  5. 若有匹配 → LazyVideoData 提取 → applyWhitelistDecision() 檢查白名單
  6. 無白名單豁免 → hideElement() 隱藏並記錄

- **MutationObserver 批次處理**（VideoFilter.processMutations）：
  1. 大量突變（>100）→ 整頁掃描
  2. 少量突變 → 收集候選元素（從 addedNodes 匹配 allContainers）
  3. 批次以 requestIdleCallback 處理

- **AdBlock 防護**（AdBlockGuard）：
  1. 初始化時 patchConfig() 修改 YouTube 內部設定
  2. MutationObserver 監聽 body 直接子元素 + ytd-popup-container
  3. 每次 yt-navigate-finish 重新 patch + checkAndClean

- **訂閱掃描**（SubscriptionManager）：
  1. 初始化時嘗試從 ytInitialData 靜態提取
  2. 設置 MutationObserver 監聽側邊欄展開
  3. scan() 從側邊欄或訂閱頁面提取頻道連結
  4. Utils.cleanChannelName() 清洗 → 去重 → 寫入 ConfigManager.SUBSCRIBED_CHANNELS

## 變更入口與路徑

- **新增過濾類型**（如新的弱規則）：在 filter-engine.ts 中加入新的 get* 方法 → 在 findFilterDetail() 的管線中插入 → 若需新設定鍵，同步更新 core-foundation/config.ts 與 data-definitions/rules.ts。
- **YouTube DOM 變更**：先檢查 data-definitions/selectors.ts 的選擇器 → 檢查 video-data.ts 的屬性提取（title/channel/viewCount 等）→ 檢查 dom-visibility.ts 的 FILTER_CONTAINER_SELECTOR。
- **CSS 隱藏規則新增**：在 style-manager.ts 的 map 或 hasRules 中加入新項目 → 確保 data-definitions/rules.ts 中有對應 RuleDefinition → 確保 ConfigState.RuleEnables 有對應鍵。
- **AdBlock 防護失效**：檢查 adblock-guard.ts 中的 keywords 清單與 whitelistSelectors → 檢查 YouTube config 路徑（openPopupConfig / EXPERIMENT_FLAGS）是否變更。

## 已知風險

- **YouTube DOM 結構變更**：所有 feature 都直接操作 YouTube DOM，任何改版都可能導致選擇器失效或資料提取失敗。VideoFilter.validateSelectors() 僅在 DEBUG_MODE 下執行且只檢查 CHANNEL 選擇器。
- **MutationObserver 效能**：監聽 body 的 childList+subtree 可能觸發大量回呼。processMutations() 有 MUTATION_THRESHOLD=100 的降級機制（整頁掃描），但 YouTube 的 SPA 導航仍可能造成短暫效能衝擊。
- **AdBlock 防護貓捉老鼠**：依賴 YouTube 內部 config 物件的具體路徑，這些路徑可能隨 YouTube 更新而變更。
- **requestIdleCallback 瀏覽器相容性**：VideoFilter 使用 requestIdleCallback，在不支援的瀏覽器上降級為同步處理。
- **CSS 注入時機**：StyleManager.apply() 在 App.init() 中呼叫，早於 YouTube 渲染，但若 YouTube 使用 Shadow DOM 則 CSS 無法穿透。

## 禁止事項

- 不要在此模組中直接呼叫 GM_getValue/GM_setValue——透過 ConfigManager。
- 不要在 feature 中直接硬編碼選擇器字串——使用 data-definitions/selectors.ts 的 SELECTORS。
- 不要在此模組中加入選單/UI 邏輯——那是 user-interface 的職責。
- SubscriptionManager 掃描到的頻道不要超過 MAX_SUBSCRIPTIONS（500）上限。
- 不要在 hideElement 之外直接修改 DOM 元素的 display/visibility——使用 dom-visibility 的統一介面以確保可還原。
