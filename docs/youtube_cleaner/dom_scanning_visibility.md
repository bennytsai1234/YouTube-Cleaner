# DOM Scanning Visibility

## 目前狀態

- `src/features/video-filter.ts` 管理主要 `MutationObserver`、候選元素收集、批次處理、整頁掃描、SPA navigation 後 cache 清理與 selector health check。
- `src/features/dom-visibility.ts` 負責找到 filter container、標記已檢查、隱藏元素、保存/還原 inline style 與清理狀態。
- `src/core/stats.ts` 記錄 session 級過濾統計。

## 範圍

- 主要檔案：`src/features/video-filter.ts`、`src/features/dom-visibility.ts`、`src/core/stats.ts`.
- 邊界檔案：`src/features/filter-engine.ts`、`src/data/selectors.ts`、`src/main.ts`。
- 相關測試：`test/filter-test.ts`、`test/filter-engine-test.ts`、`test/selectors-test.ts`、E2E 過濾測試。

## 上游依賴

- `SELECTORS.allContainers` 提供掃描候選範圍。
- `FilterEngine` 提供裁決與白名單結果。
- Browser `MutationObserver`、`requestIdleCallback` 與 DOM dataset。
- `main.ts` 在初始化、refresh 與 `yt-navigate-finish` 時呼叫掃描與清快取。

## 下游影響

- 所有 JS-based 過濾都經過 `VideoFilter.processElement()`。
- DOM 隱藏狀態會影響 UI 可見性、後續重掃、click handler 是否略過隱藏元素。
- `FilterStats` 會在系統選單中顯示 session 統計。

## 關鍵流程

- `start()` 建立 observer，監聽 `document.body` 的 subtree childList，並初始化 subscription manager。
- `processMutations()` 對大量 mutations 直接整頁掃描；小量 mutations 收集新增節點、子節點與 parent container。
- `processPage()` 查詢所有 containers，做一次 selector health check，並只處理未標記 `ypChecked` 的元素。
- `processBatch()` 用 `requestIdleCallback` 每批最多 50 個，timeout 500ms。
- `hideElement()` 保存原始 inline style，套用 `display:none` 與 `visibility:hidden`，重置時還原。

## 常見變更入口

- 長時間使用變慢：先看 `BATCH_SIZE`、`IDLE_TIMEOUT`、`MUTATION_THRESHOLD` 與候選收集邏輯。
- 切換設定後元素沒有復原：看 `resetHiddenState()`、`clearFilterState()` 與 style 保存欄位。
- SPA 換頁後舊狀態污染：看 `main.ts` 的 `yt-navigate-finish` 與 `VideoFilter.clearCache()`。
- Selector health check 警告：先更新 `src/data/selectors.ts`，再跑 selector tests。

## 已知風險

- YouTube 會重用 DOM 節點；dataset 標記若沒有清理，可能導致漏檢。
- 隱藏 parent container 時必須保存 inline style，否則重設設定會破壞 YouTube 原本樣式。
- 大量 mutation 觸發整頁掃描是正確性與效能的折衷，改門檻需測首頁滾動。

## 不要做

- 不要在 selector 失效時用更大範圍的全頁文字掃描取代 container 模型。
- 不要直接覆蓋 element style 而不保存可還原狀態。
- 不要讓 `VideoFilter.stop()` 只停主 observer；也要維持下游 subscription observer lifecycle。
