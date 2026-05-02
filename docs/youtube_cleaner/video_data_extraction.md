# Video Data Extraction

## 目前狀態

- `src/features/video-data.ts` 的 `LazyVideoData` 從影片或 playlist DOM 容器懶惰抽取 title、channel、url、views、live viewers、time ago、duration、Shorts、members 與 playlist 狀態。
- `src/core/utils.ts` 提供觀看數、時間、duration、直播人數解析、繁簡 RegExp 生成與頻道名稱清洗。
- 此模組把不穩定的 YouTube DOM metadata 轉成 `FilterEngine` 可判斷的 typed properties。

## 範圍

- 主要檔案：`src/features/video-data.ts`、`src/core/utils.ts`。
- 上游資料：`src/data/selectors.ts`、`src/data/i18n-filter-patterns.ts`、`src/core/constants.ts`。
- 相關測試：`test/filter-test.ts`、`test/logic-test.ts`、`test/filter-engine-test.ts`、`test/selectors-test.ts`、多個 e2e。

## 上游依賴

- `SELECTORS.METADATA`、`SELECTORS.BADGES` 與 `SELECTORS.LINK_CANDIDATES`。
- `I18N.filterPatterns[I18N.lang]` 對 views、live、ago、members-only、playlist 的語系偵測。
- OpenCC-JS 可用時，`Utils.generateCnRegex()` 會建立繁簡互通 pattern。
- YouTube aria-label、textContent、href、badge 與 metadata 結構。

## 下游影響

- `FilterEngine` 使用 `LazyVideoData` 做低觀看數、時長、關鍵字、頻道、Shorts、members 與 playlist 判斷。
- `InteractionEnhancer` 另行使用 link candidates；selector 變更需同步思考資料抽取與 click 行為。
- `dom-visibility.hideElement()` 會把 item 的 title、channel、url 放到 debug log。

## 關鍵流程

- getter 第一次讀取時才查 DOM 並 cache 結果，避免每個元素都讀完所有欄位。
- `_parseMetadata()` 先嘗試 title link aria-label，再掃描 metadata text，分別解析 views、live viewers 與 time ago。
- `channel` 會走 `Utils.cleanChannelName()` 去除 YouTube UI 注入字詞、隱形字元與部分 suffix。
- `isPlaylist` 同時檢查 playlist link、Mix badge 與語系 playlist pattern。

## 常見變更入口

- 觀看數或時間判斷失準：先看 `Utils.parseNumeric()`、`Utils.parseTimeAgo()` 與 `i18n-filter-patterns.ts`。
- 抽不到標題或頻道：先看 `SELECTORS.METADATA.TITLE`、`TITLE_LINKS`、`CHANNEL`。
- Shorts / members / playlist 誤判：看 `SELECTORS.BADGES` 與 `LazyVideoData` 對應 getter。
- 頻道白名單不命中：看 `Utils.cleanChannelName()` 是否清洗過度或不足。

## 已知風險

- metadata parsing 對 YouTube DOM 與本地化文案敏感。
- `innerText` 用於 members-only 判斷可能觸發 layout 成本，擴大使用前要評估效能。
- Lazy cache 以 DOM element 為生命週期；YouTube 重用 DOM 時需依賴 `VideoFilter.clearCache()` 和 data attributes 重新檢查。

## 不要做

- 不要在 `FilterEngine` 中直接重複 DOM parsing；應擴充 `LazyVideoData`。
- 不要繞過 `Utils.cleanChannelName()` 做 channel matching。
- 不要用單一語系字串當作跨語系 metadata 判斷。
