# YouTube Cleaner Optimization Workflow

## 目的

- 用於改善既有行為、可靠性、可維護性、效能或清晰度，不加入無關新功能。
- 一般 optimization 不要重新執行 Codebase Atlas；先使用這份 workflow 與 [`youtube_cleaner_index.md`](youtube_cleaner_index.md)。
- 只有 structure、ownership 或風險描述改變時，才同步更新受影響的 Atlas 文件。

## 流程

1. 打開 [`youtube_cleaner_index.md`](youtube_cleaner_index.md)，選一個 target module。
2. 讀該模組的目前狀態、上游依賴、下游影響、關鍵流程與已知風險。
3. 找最小變更層：UI、設定、資料、selector、runtime 掃描、裁決、DOM 隱藏、build tooling 或測試。
4. 保持使用者可見行為不變，除非使用者明確要求改變。
5. 避免跨模組 refactor；若必須跨 boundary，先說明為何單模組修改不足。
6. 驗證 upstream 與 downstream 行為仍可運作。
7. 若結構、ownership 或風險改變，更新受影響的 Atlas 文件。

## 常見 optimization 導向

- DOM 掃描或滾動效能：先看 [`dom_scanning_visibility.md`](youtube_cleaner/dom_scanning_visibility.md) 與 [`video_data_extraction.md`](youtube_cleaner/video_data_extraction.md)。
- Selector 維護性：先看 [`rule_catalog_selectors.md`](youtube_cleaner/rule_catalog_selectors.md)。
- 規則裁決清晰度：先看 [`filter_decision_engine.md`](youtube_cleaner/filter_decision_engine.md)。
- 設定匯入匯出安全性：先看 [`menu_settings_io.md`](youtube_cleaner/menu_settings_io.md) 與 [`configuration_storage.md`](youtube_cleaner/configuration_storage.md)。
- 測試與發布穩定性：先看 [`testing_release_tooling.md`](youtube_cleaner/testing_release_tooling.md)。

## 修改前摘要

當使用者期待先確認時，摘要：

- Target module
- 目前問題
- Optimization direction
- 行為前後是否一致
- Explicit non-goals
- 可能影響的 upstream/downstream
- 要跑的測試或檢查
