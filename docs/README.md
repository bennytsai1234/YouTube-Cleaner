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

- [執行入口與打包發布](youtube_cleaner/runtime_bootstrap_packaging.md)
- [設定、儲存與核心工具](youtube_cleaner/configuration_storage_utilities.md)
- [規則目錄、Selector 與靜態資料](youtube_cleaner/rule_catalog_selectors.md)
- [過濾裁決與 DOM 可見性流程](youtube_cleaner/filtering_dom_pipeline.md)
- [頁面防護、CSS 注入與互動增強](youtube_cleaner/page_guards_interactions.md)
- [使用者選單、名單管理與設定匯入匯出](youtube_cleaner/user_interface_settings.md)
- [測試、品質檢查與發布工具](youtube_cleaner/testing_release_tooling.md)

通用入口：[youtube_cleaner_adapter.md](youtube_cleaner_adapter.md)

---

## 從哪裡開始？

| 我是… | 建議閱讀順序 |
|-------|--------------|
| 想用這個腳本 | 根目錄 [README.md](../README.md) |
| 想開始開發 | [DEVELOPMENT.md](DEVELOPMENT.md) → [ARCHITECTURE.md](ARCHITECTURE.md) |
| 想送 PR | [../CONTRIBUTING.md](../CONTRIBUTING.md) → [DEVELOPMENT.md](DEVELOPMENT.md) |
| 想修一個特定 bug | [ARCHITECTURE.md](ARCHITECTURE.md) → 對應的 [Codebase Atlas 模組文件](#codebase-atlas) |
