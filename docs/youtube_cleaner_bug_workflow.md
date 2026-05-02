# YouTube Cleaner Bug Workflow

## 目的

- 用於明確 bug、failing tests、regression、crash 或不穩定行為。
- 一般 bug fix 不要重新執行 Codebase Atlas；先使用這份 workflow 與 [`youtube_cleaner_index.md`](youtube_cleaner_index.md)。
- 只有 ownership、流程或模組邊界改變時，才同步更新受影響的 Atlas 文件。

## 流程

1. 打開 [`youtube_cleaner_index.md`](youtube_cleaner_index.md)，依症狀選出最可能的 owning module。
2. 讀該模組的「上游依賴」、「下游影響」、「關鍵流程」、「已知風險」與「不要做」。
3. 再進入程式碼，沿著 failing runtime path 或 test path 找實際原因。
4. 判斷缺陷是模組內部問題，還是上游輸入變化，例如 YouTube DOM、GM storage、i18n 文案或 build metadata。
5. 優先把修復集中在 owning module；跨 boundary 修改需要明確原因。
6. 選擇最小可證明的驗證命令。常見基線是 `npm test`，selector 變更加跑 `npm run test:e2e:selectors`，發布/metadata 變更加跑 `npm run build` 與 `npm run check:release`。
7. 若結構、ownership 或流程變更，更新對應 module doc 與 index 摘要。

## 常見症狀對應

- 過濾突然失效：先看 [`rule_catalog_selectors.md`](youtube_cleaner/rule_catalog_selectors.md) 與 [`dom_scanning_visibility.md`](youtube_cleaner/dom_scanning_visibility.md)。
- 白名單或訂閱保護失效：先看 [`filter_decision_engine.md`](youtube_cleaner/filter_decision_engine.md)、[`subscription_protection.md`](youtube_cleaner/subscription_protection.md)、[`configuration_storage.md`](youtube_cleaner/configuration_storage.md)。
- 觀看數、時間、頻道或 playlist 誤判：先看 [`video_data_extraction.md`](youtube_cleaner/video_data_extraction.md)。
- Adblock popup 或 CSS 誤藏：先看 [`css_adblock_guard.md`](youtube_cleaner/css_adblock_guard.md)。
- 新分頁 click 行為錯誤：先看 [`interaction_enhancement.md`](youtube_cleaner/interaction_enhancement.md)。
- 設定匯入匯出或選單錯誤：先看 [`menu_settings_io.md`](youtube_cleaner/menu_settings_io.md)。

## 修改前摘要

當使用者期待先確認時，摘要：

- 症狀與可重現條件
- 已確認或假設的 root cause
- Owning module 與可能的 boundary module
- 可能修改的檔案
- 修復前後行為差異
- 要跑的測試或檢查
