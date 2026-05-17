# DOM Scanning And Visibility

## 目前責任

- 負責 MutationObserver 掃描、批次排程、頁面放行邏輯、hidden-state marker、style restoration 與 selector health logging。
- 效能、stale hidden state、重複處理或頁面 navigation 行為，從這裡開始。

## 範圍

- `src/features/video-filter.ts`
- `src/features/dom-visibility.ts`
- 與 `FilterEngine`、`LazyVideoData` 的 runtime 互動
- 過濾行為相關 E2E 測試

## 依賴與影響

- 依賴 `ConfigManager`、`SELECTORS`、`FilterEngine`、`FilterStats`、`Logger` 與 DOM dataset marker。
- 此模組決定何時處理元素，以及如何隱藏或還原元素，因此影響所有視覺過濾行為。
- UI 統計依賴 `hideElement()` 內的 `FilterStats.record()`。

## 關鍵流程

- `VideoFilter.start()` 建立 document-level `MutationObserver` 並啟動 subscription monitoring。
- 小型 mutation batch 收集 candidate container；大型 batch 觸發 full-page processing。
- `processPage()` 掃描所有已知 container，在 debug mode 下驗證 selector，並用 `requestIdleCallback` 處理未處理元素。
- `processElement()` 委派給 `FilterEngine`，套用 whitelist decision，然後 hidden 或 mark checked。
- `clearFilterState()` 在 navigation 後還原 style 並清 marker；`resetHiddenState()` 在設定 refresh 時重置 hidden state 與 stats。

## 變更入口

- 掃描 lifecycle、batching、allow-list pages、selector health：`src/features/video-filter.ts`。
- hiding、style restoration、dataset marker：`src/features/dom-visibility.ts`。
- marker semantics 變更後檢查 filtering 與 interaction 測試。

## 變更路線

- Performance：調整 mutation threshold、batch size、idle timeout 或 candidate collection -> 跑 unit tests 與相關 E2E。
- Hidden-state：更新 marker/style 行為 -> 驗證 reset、navigation、設定 refresh。
- Page allow-list：更新 `isPageAllowingContent` -> 驗證 channel、playlist、library、subscription、watch page 行為。

## 已知風險

- style restoration 錯誤可能破壞既有 inline style。
- mutation handling 做太多同步工作會讓 YouTube 頁面卡住。
- 標記錯 container 可能隱藏過多內容，或讓後續掃描跳過已變更內容。

## 參考備註

- 無。

## 不要做

- 不要把批次 observer flow 改成每個 mutation 都 full synchronous scan。
- 不要移除隱藏前保存原始 inline style 的邏輯。
- 不要擴大 page allow-list 而沒有 false negative 測試。
