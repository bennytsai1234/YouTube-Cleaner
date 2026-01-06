# 📋 倉庫清理規劃報告

**專案名稱**: YouTube Homepage Cleaner
**報告日期**: 2026-01-07
**當前版本**: v1.6.6
**執行狀態**: ✅ 已完成

---

## 📊 執行摘要

| 任務 | 狀態 | 說明 |
|------|------|------|
| 合併重複 Archive 目錄 | ✅ 完成 | 8 個變更已移至正確位置 |
| 刪除 Gemini Code Assist 配置 | ✅ 完成 | 刪除 9 個檔案 |
| 更新 OpenSpec Specs | ✅ 完成 | 修正 3 個 spec 格式問題 |

---

## 🔧 執行詳情

### 1. Archive 目錄合併

**操作**: 將 `openspec/changes/archive/` 合併至 `openspec/archive/`

**移動的變更**:
| 變更 ID | 日期 |
|---------|------|
| `2026-01-04-add-notification-new-tab-option` | 2026-01-04 |
| `2026-01-04-hide-shorts-shelf-with-native-attribute` | 2026-01-04 |
| `2026-01-04-improve-branding-and-readme` | 2026-01-04 |
| `2026-01-04-reverse-engineer-specs` | 2026-01-04 |
| `2026-01-06-disable-filtering-for-playlists` | 2026-01-06 |
| `2026-01-06-refactor-to-modular-architecture` | 2026-01-06 |
| `2026-01-06-support-playlist-video-renderer-new-tab` | 2026-01-06 |
| `set-default-lang-zh-tw-v1-6-2` | - |

**合併後 Archive 總計**: 12 個已歸檔變更

---

### 2. Gemini Code Assist 配置刪除

**刪除的檔案**:

```
.github/workflows/
├── gemini-dispatch.yml      (已刪除)
├── gemini-invoke.yml        (已刪除)
├── gemini-review.yml        (已刪除)
├── gemini-scheduled-triage.yml (已刪除)
└── gemini-triage.yml        (已刪除)

.github/commands/            (整個目錄已刪除)
├── gemini-invoke.toml
├── gemini-review.toml
├── gemini-scheduled-triage.toml
└── gemini-triage.toml
```

**保留的 Workflows**:
- `lint.yml` - ESLint 檢查
- `release.yml` - 發布流程

---

### 3. OpenSpec Specs 更新

**修正的問題**:

| Spec | 問題 | 修正 |
|------|------|------|
| `localization/spec.md` | 仍使用 delta 格式 (`## MODIFIED Requirements`)，版本資訊過時 | 重寫為標準 spec 格式，移除版本號硬編碼 |
| `notification-control/spec.md` | Purpose 為 TBD 佔位文字 | 補充完整 Purpose 描述 |
| `documentation/spec.md` | Purpose 為 TBD 佔位文字 | 補充完整 Purpose 描述 |

**Spec 狀態總覽**:

| Spec | 狀態 | 說明 |
|------|------|------|
| `adblock-guard` | ✅ 良好 | 完整描述反廣告封鎖功能 |
| `core-filtering` | ✅ 良好 | 定義觀看數/時長/關鍵字過濾 |
| `documentation` | ✅ 已修正 | 專案文檔規範 |
| `i18n` | ✅ 良好 | 國際化與數值解析 |
| `interaction` | ✅ 良好 | 新分頁開啟功能 |
| `localization` | ✅ 已修正 | 語言偵測與預設值 |
| `notification-control` | ✅ 已修正 | 通知新分頁開啟 |
| `ui-cleaning` | ✅ 良好 | CSS 靜態隱藏規則 |

---

## 📁 清理後目錄結構

```
youtube-homepage-cleaner/
├── .agent/workflows/        # Gemini CLI 工作流程 (3 個)
├── .github/workflows/       # GitHub Actions (2 個 - lint, release)
├── assets/                  # 資產 (banner.png)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CLEANUP_PLANNING_REPORT.md  ← 本報告
│   └── adr/                 # 架構決策記錄 (6 個 ADR)
├── openspec/
│   ├── archive/             # 已歸檔變更 (12 個) ✅ 已合併
│   ├── changes/             # 進行中變更 (0 個)
│   ├── specs/               # 規格 (8 個) ✅ 已更新
│   ├── AGENTS.md
│   └── project.md
├── src/                     # 源碼 (15 個檔案)
├── test/                    # 測試 (1 個)
├── AGENTS.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── GEMINI.md
├── LICENSE
├── README.md
├── README-greasyfork.md
├── SECURITY.md
├── package.json
├── rollup.config.mjs
└── youtube-homepage-cleaner.user.js
```

---

## 📈 清理成效

| 指標 | 清理前 | 清理後 | 變化 |
|------|--------|--------|------|
| GitHub Workflows | 7 個 | 2 個 | -5 個 |
| Commands 目錄 | 4 個 | 0 個 | -4 個 |
| Archive 位置 | 2 處 | 1 處 | 統一 |
| TBD Specs | 3 個 | 0 個 | 全部補充 |
| 格式錯誤 Specs | 1 個 | 0 個 | 已修正 |

---

## ✅ 完成的檢查清單

- [x] 合併 `openspec/changes/archive/` 到 `openspec/archive/`
- [x] 刪除 Gemini Code Assist 相關 CI 配置
- [x] 修正 `localization/spec.md` delta 格式問題
- [x] 補充 `notification-control/spec.md` Purpose
- [x] 補充 `documentation/spec.md` Purpose

---

## 🔜 下一步建議

1. **提交變更**: 執行 `git add -A && git commit -m "chore: clean up repository structure"`
2. **驗證 Specs**: 執行 `openspec validate --strict` 確認所有規格有效
3. **推送至遠端**: `git push origin main`

---

*報告由 Gemini CLI 自動生成並執行*
*完成時間: 2026-01-07 02:37*
