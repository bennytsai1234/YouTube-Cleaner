# YouTube Cleaner Atlas Index

## 目的與使用方式

- 修改或驗證前，先用這份 index 定位相關模組，再進入程式碼。
- 本文件維持高層次導覽；模組細節放在各模組文件中。
- Codebase Atlas 通常只需初始化一次。
- 後續理解、修改、驗證或混合型任務，請透過轉接器進入，不要重新執行 Codebase Atlas。
- 只有使用者明確要求 rebuild、refresh、regenerate 或 rescan 時，才重新完整掃描並重建 atlas。

## 決策紀錄

- Atlas 模式：獨立模式（standalone）
- 工作語言：繁體中文
- 參考模板模式：無（none）
- 工作流程交付策略：commit 並 push
- 報告層級：白話（plain）
- 工作流程入口點：Generic + Claude Code + Codex

### 入口點位置

- 通用轉接器：`docs/youtube_cleaner_adapter.md`
- Claude Code 技能：`.claude/skills/youtube-cleaner-atlas/SKILL.md`
- Codex 技能：`.agents/skills/youtube-cleaner/SKILL.md`
- CLAUDE.md 已包含進入指示

## 專案操作約束

以下規則繼承自現有專案指引，所有工作流程都必須遵守：

### 語言
- 所有使用者面向的輸出與文件使用繁體中文
- Commit 訊息使用英文，遵循 Conventional Commits 規範

### 維護狀態
- 專案為維護導向，不預先規劃大型新功能
- 優先順序：修正失效功能 → 改善效能與穩定性 → 補強測試與文件 → 小幅體驗改善
- 新功能須同時符合：明顯改善體驗、不顯著增加維護成本、不依賴不穩定 YouTube API、預設關閉或能被使用者清楚控制

### 程式碼風格
- TypeScript strict 模式，全量通過 `npm run typecheck`
- CSS-First：能用 CSS 隱藏的元素優先使用 CSS
- CSS 選擇器集中在 `src/data/selectors.ts`，不散落各模組
- 規則同步：`src/data/rules.ts`、`src/core/config.ts`（RuleEnables）、`src/data/rule-names.ts` 三者必須同步
- 禁止手動編輯 `youtube-homepage-cleaner.user.js`（Rollup 建置產出）

### 測試
- `npm run verify` 為主要驗證入口（typecheck + lint + unit + build + release check）
- 新增規則需補測試（filter-test 或 filter-engine-test）
- Selector 變更需要 `npm run test:unit` 驗證 selector 語法與來源檢查
- 設定相關變更需補 settings-io-test 或 config-manager-test

### 發布
- 完整驗證通過後才發布
- 版本一致性檢查：`npm run check:release`

## 架構決策

跨模組決策在此記錄（模組層級的決策放在各模組文件的「已知風險」或「禁止事項」中）。

| 決策 | 日期 | 說明 |
|------|------|------|
| （尚無） | | |

## 工作流程文件

日常工作透過轉接器進入，轉接器先讀取本 index，用一句話確認專案用途，然後路由到以下兩個工作流程之一：

- 調查工作流程（唯讀——解釋、定位、審查、重現、分析、風險評估）：[youtube_cleaner_investigate_workflow.md](youtube_cleaner_investigate_workflow.md)
- 變更工作流程（寫入——任何程式碼編輯）：[youtube_cleaner_change_workflow.md](youtube_cleaner_change_workflow.md)

共享的獨立技術文件（除錯、TDD、驗證、程式碼審查、設計討論）位於 `youtube_cleaner_techniques/`，按需讀取。

## 模組清單

- [核心基礎設施（core）](youtube_cleaner/core.md)
- [靜態資料層（data）](youtube_cleaner/data.md)
- [業務邏輯（features）](youtube_cleaner/features.md)
- [使用者介面（ui）](youtube_cleaner/ui.md)
- [進入點與建置（entry-and-build）](youtube_cleaner/entry_and_build.md)

## 模組導覽摘要

### 核心基礎設施（core）
擁有設定管理、日誌、統計、型別與工具函式。是最底層，不依賴其他業務模組。當你需要讀寫使用者設定、輸出除錯日誌、解析影片時長或轉換繁簡中文時從這裡開始。修改這裡的型別會影響整個專案，需謹慎。

### 靜態資料層（data）
擁有所有 CSS 選擇器、過濾規則定義、規則名稱與語系模式。純資料無副作用。當 YouTube 改版導致元素消失、需要新增過濾規則或調整規則優先級時從這裡開始。修改後必須同步 rules/config/rule-names 三處，且 selector 變更需要跑 E2E 測試。

### 業務邏輯（features）
擁有 MutationObserver 掃描、過濾裁決、DOM 操作、自訂規則、訂閱保護、CSS 注入、AdBlock 防護與點擊互動。這是專案的核心。當你需要修改過濾行為、新增過濾類型、調整 DOM 隱藏方式或修復防護機制時從這裡開始。

### 使用者介面（ui）
擁有 Tampermonkey 選單、設定操作、語系翻譯與黑白名單編輯。當你需要修改選單行為、調整設定匯出/匯入或新增語系時從這裡開始。不直接操作 DOM 過濾。

### 進入點與建置（entry-and-build）
擁有 App 初始化、UserScript metadata、CSS 靜態資源與 Rollup 建置管線。當你需要調整初始化順序、修改版本號或建置流程時從這裡開始。
