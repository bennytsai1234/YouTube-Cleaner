# OpenSpec 指引

這是給 AI 助手的規範驅動開發指引。

---

## 快速檢查清單

- [ ] 先用 `openspec list` 看現有的 changes
- [ ] 先用 `openspec list --specs` 看現有的 specs
- [ ] 選一個 change-id (例如 `add-xxx`, `fix-xxx`)
- [ ] 建立 `proposal.md`, `tasks.md`, 和 spec deltas
- [ ] 執行 `openspec validate [change-id] --strict`

---

## 三階段流程

### 1. 建立提案 (Proposal)

**什麼時候要寫提案？**
- ✅ 新功能
- ✅ 重大變更
- ✅ 架構調整

**什麼時候不用？**
- ❌ 修 Bug
- ❌ 改錯字
- ❌ 更新依賴

**步驟：**
1. 在 `openspec/changes/[change-id]/` 建立資料夾
2. 寫 `proposal.md` (為什麼要做、要改什麼)
3. 寫 `tasks.md` (待辦清單)
4. 在 `specs/[capability]/spec.md` 寫 delta
5. 執行 `openspec validate [change-id] --strict`

### 2. 實作 (Apply)

1. 讀 `proposal.md` 了解目標
2. 讀 `tasks.md` 看待辦事項
3. 依序完成每個任務
4. 完成後勾選 `- [x]`

### 3. 歸檔 (Archive)

完成後執行：
```bash
openspec archive [change-id] --yes
```

---

## 檔案結構

```
openspec/
├── project.md          # 專案規範
├── specs/              # 現行規範 (已實作)
│   └── [capability]/
│       └── spec.md
└── changes/            # 變更提案 (待實作)
    ├── [change-name]/
    │   ├── proposal.md  # 提案說明
    │   ├── tasks.md     # 待辦清單
    │   └── specs/       # Spec 變更
    └── archive/         # 已完成的
```

---

## 常用指令

```bash
openspec list              # 列出進行中的 changes
openspec list --specs      # 列出所有 specs
openspec show [item]       # 顯示詳細內容
openspec validate --strict # 驗證格式
openspec archive [id] -y   # 歸檔完成的 change
```

---

## 寫 Spec 的格式

### Requirement 格式
```markdown
### Requirement: 功能名稱
系統 SHALL 提供...

#### Scenario: 情境名稱
- **WHEN** 使用者做某事
- **THEN** 系統回應某事
```

### Delta 格式 (變更)
```markdown
## ADDED Requirements
### Requirement: 新功能
...

## MODIFIED Requirements
### Requirement: 修改的功能
...

## REMOVED Requirements
### Requirement: 移除的功能
**Reason**: 移除原因
```

---

## 常見錯誤

| 錯誤訊息 | 解法 |
|---------|------|
| "must have at least one delta" | 確認 `changes/[name]/specs/` 有 .md 檔案 |
| "must have at least one scenario" | 確認用 `#### Scenario:` (4 個 #) |

---

## 命名規則

- **change-id**: 動詞開頭，kebab-case
  - 例：`add-dark-mode`, `fix-layout-bug`
- **capability**: 名詞，kebab-case
  - 例：`user-auth`, `video-filter`
