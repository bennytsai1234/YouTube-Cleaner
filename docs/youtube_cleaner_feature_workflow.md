# YouTube Cleaner Feature Workflow

## 目的

- 用於新增目前不存在的行為。
- 一般 feature work 不要重新執行 Codebase Atlas；先使用這份 workflow 與 [`youtube_cleaner_index.md`](youtube_cleaner_index.md)。
- 只有 ownership、API、使用者流程或模組邊界改變時，才同步更新受影響的 Atlas 文件。

## 流程

1. 保留使用者原始需求，先界定是新過濾規則、設定選項、UI 流程、互動增強、工具流程，還是發布/文件能力。
2. 打開 [`youtube_cleaner_index.md`](youtube_cleaner_index.md)，找自然 owning module。
3. 讀 owning module doc；若 feature 觸及設定、規則、UI、selector、測試或 build，讀相關 boundary module doc。
4. 定義 feature boundary：包含行為、不包含行為、設定 key、storage、UI 文案、規則 ID、selector、外部依賴、使用者可見變更。
5. 使用既有模式實作：規則走 `rules.ts` / `config.ts` / `FilterEngine`，selector 集中到 `selectors.ts`，UI 文案走 i18n，持久化走 `ConfigManager`。
6. 補上最接近風險的測試：unit、selector e2e、settings e2e、release check 或完整 `npm run verify`。
7. 若新增模組、改 ownership 或改主要流程，更新 Atlas index 與相關 module doc。

## 常見 feature 導向

- 新過濾規則：先看 [`rule_catalog_selectors.md`](youtube_cleaner/rule_catalog_selectors.md)、[`configuration_storage.md`](youtube_cleaner/configuration_storage.md)、[`filter_decision_engine.md`](youtube_cleaner/filter_decision_engine.md)。
- 新設定或選單：先看 [`menu_settings_io.md`](youtube_cleaner/menu_settings_io.md) 與 [`configuration_storage.md`](youtube_cleaner/configuration_storage.md)。
- 新 metadata 判斷：先看 [`video_data_extraction.md`](youtube_cleaner/video_data_extraction.md)。
- 新 CSS-first 隱藏：先看 [`css_adblock_guard.md`](youtube_cleaner/css_adblock_guard.md)，並確認不需要白名單。
- 新互動行為：先看 [`interaction_enhancement.md`](youtube_cleaner/interaction_enhancement.md)。

## 修改前摘要

當使用者期待先確認時，摘要：

- 原始需求
- Owning module 與 boundary modules
- Included scope 與 explicit non-goals
- 設定、UI、資料或外部系統影響
- 實作策略
- 完成後行為
- 要跑的測試或檢查
