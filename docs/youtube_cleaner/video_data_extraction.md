# Video Data Extraction

## 目前責任

- 負責從 YouTube DOM card 懶惰抽取 title、channel、URL、views、live viewers、age、duration、Shorts、members-only 與 playlist 狀態。
- metadata 缺失、門檻判斷錯誤或 YouTube card markup 變更時，從這裡開始。

## 範圍

- `src/features/video-data.ts`
- `src/core/utils.ts` 的 parsing helpers
- `src/data/selectors.ts`
- `src/data/i18n-filter-patterns.ts`
- `test/logic-test.ts`、`test/filter-engine-test.ts` 與 selector tests

## 依賴與影響

- 依賴 `SELECTORS`、`I18N.filterPatterns` 與 `Utils` parsing helpers。
- 提供 `FilterEngine` 判斷 keyword、channel、low-view、duration、members-only、Shorts 與 playlist rule 所需資料。
- channel cleaning 會影響 whitelist、blacklist 與 subscription protection。

## 關鍵流程

- `LazyVideoData` 每個欄位只在首次存取時抽取並 cache。
- title 與 URL 使用 selector fallback list 與 aria-label fallback。
- metadata parsing 先讀 metadata text 與 title-link aria label，再解析 views、live viewers 與 time age。
- playlist / user-playlist 偵測結合 link pattern、badge、title pattern 與 ownership text。

## 變更入口

- DOM field extraction：`src/features/video-data.ts`。
- numeric、duration、time-age、live-viewer、channel-cleaning、OpenCC regex parsing：`src/core/utils.ts`。
- selector drift：`src/data/selectors.ts`。

## 變更路線

- Metadata parser 變更應加入或更新 realistic DOM snippet 的 unit tests。
- Selector fallback 變更應跑 selector unit tests，可能時跑 Playwright selector health check。
- Channel cleaning 變更必須檢查 blacklist、whitelist、members whitelist 與 subscription matching。

## 已知風險

- YouTube aria-label 可能包含多種資料，parser 必須避免把 upload age 誤認為 view count。
- Locale-specific metadata text 變更會破壞 low-view 與 time-age filter。
- Lazy cache 代表同一個 `LazyVideoData` instance 首次讀取後，不會反映後續 DOM text 變化。

## 參考備註

- 無。

## 不要做

- 沒有量測理由時，不要對每張卡片 eager 讀取所有 metadata。
- 不要新增 locale-specific parsing 卻不更新 i18n patterns 或 tests。
- 不要繞過 `Utils.cleanChannelName()` 做頻道比對。
