# 文件索引

本目錄收錄 YouTube Cleaner 的所有開發、架構與深度技術文件。專案總覽請看根目錄的 [README.md](../README.md)。

---

## 主要文件

| 文件 | 對象 | 內容 |
|------|------|------|
| [DEVELOPMENT.md](DEVELOPMENT.md) | 開發者 | 環境設置、常用指令、測試、發布流程、新增規則教學 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 開發者、進階使用者 | 資料夾結構、模組職責、核心流程、設定系統、設計決策 |
| [ROADMAP.md](ROADMAP.md) | 所有人 | 維護方向與優先順序 |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | 貢獻者 | 貢獻流程、Commit 慣例、PR 規範 |
| [../CHANGELOG.md](../CHANGELOG.md) | 所有人 | 版本變更紀錄 |

---

## Codebase Atlas

`youtube_cleaner/` 收錄各模組的細部說明，便於 AI agent 或新進開發者快速定位程式碼。

入口：[youtube_cleaner_index.md](youtube_cleaner_index.md)

模組層級文件：

- [Runtime Bootstrap](youtube_cleaner/runtime_bootstrap.md)
- [Configuration And Storage](youtube_cleaner/configuration_storage.md)
- [Rule Catalog And Selectors](youtube_cleaner/rule_catalog_selectors.md)
- [Filter Decision Engine](youtube_cleaner/filter_decision_engine.md)
- [DOM Scanning And Visibility](youtube_cleaner/dom_scanning_visibility.md)
- [Video Data Extraction](youtube_cleaner/video_data_extraction.md)
- [Subscription Protection](youtube_cleaner/subscription_protection.md)
- [CSS And Adblock Guard](youtube_cleaner/css_adblock_guard.md)
- [Interaction And UI](youtube_cleaner/interaction_ui.md)
- [I18n And Localization](youtube_cleaner/i18n_localization.md)
- [Testing And Release Tooling](youtube_cleaner/testing_release_tooling.md)

Workflow 指引：

- [Main Workflow](youtube_cleaner_main_workflow.md)
- [Understand Workflow](youtube_cleaner_understand_workflow.md)
- [Change Workflow](youtube_cleaner_change_workflow.md)
- [Validate Workflow](youtube_cleaner_validate_workflow.md)
- [通用 Adapter](youtube_cleaner_adapter.md)

---

## 從哪裡開始？

| 我是… | 建議閱讀順序 |
|-------|--------------|
| 想用這個腳本 | 根目錄 [README.md](../README.md) |
| 想開始開發 | [DEVELOPMENT.md](DEVELOPMENT.md) → [ARCHITECTURE.md](ARCHITECTURE.md) |
| 想送 PR | [../CONTRIBUTING.md](../CONTRIBUTING.md) → [DEVELOPMENT.md](DEVELOPMENT.md) |
| 想修一個特定 bug | [ARCHITECTURE.md](ARCHITECTURE.md) → 對應的 [Codebase Atlas 模組文件](#codebase-atlas) |
