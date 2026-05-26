# 貢獻指南（Contributing）

感謝你對 YouTube Cleaner 有興趣！本文件說明參與貢獻的流程與規範。

> 在你開始之前，請先閱讀 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)（開發環境與測試）與 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)（系統架構）。

---

## 行為準則

請以尊重、友善的方式與其他貢獻者互動。對人對事就事論事，避免人身攻擊。

## 如何貢獻

### 回報 Bug

使用 [GitHub Issues](https://github.com/bennytsai1234/YouTube-Cleaner/issues) 開新 issue。請盡可能附上：

- 瀏覽器與版本
- Tampermonkey 版本
- 腳本版本（在 Tampermonkey 控制台或 `package.json` 可查）
- 重現步驟
- 預期行為與實際行為
- 必要時，附上 Debug Mode 開啟後的 Console log（系統 → Debug Mode）

### 提出新功能

請先開 issue 討論。本專案目前是 **維護導向**（見 [docs/ROADMAP.md](docs/ROADMAP.md)），新功能須符合：

- 明確改善現有使用體驗
- 不顯著增加維護成本
- 不依賴不穩定的 YouTube 內部 API
- 預設關閉或能被使用者清楚控制

### 送 Pull Request

1. **Fork & Clone**：fork 本 repo，clone 到本機。
2. **建立分支**：`git checkout -b fix/short-description` 或 `feat/short-description`。
3. **開發**：依照 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。
4. **驗證**：執行 `npm run verify`（完整驗證，含 typecheck、lint、unit、build、release check、E2E）。小範圍變更可先跑目標測試，PR 前建議跑完整驗證。
5. **Commit**：使用 [Conventional Commits](https://www.conventionalcommits.org/)，訊息英文。
6. **Push & PR**：推到你的 fork，開 PR 到 `main`。

---

## Commit 慣例

採用 [Conventional Commits](https://www.conventionalcommits.org/)。常用前綴：

| 前綴 | 用途 |
|------|------|
| `feat:` | 新功能 |
| `fix:` | Bug 修復 |
| `refactor:` | 重構（不改變外部行為） |
| `perf:` | 效能改善 |
| `docs:` | 文件 |
| `test:` | 測試 |
| `chore:` | 雜項（依賴升級、tooling） |
| `ci:` | CI/CD |
| `release:` | 版本發布 |

範例：

```
fix: respect playlist page links in interaction enhancer
feat: add subscription protection for low-view rule
refactor: resolve detect-object-injection warnings by using Reflect API
```

---

## 程式碼風格

- **TypeScript strict**：所有新代碼必須通過 `npm run typecheck`。
- **ESLint**：遵守 `eslint.config.js` 規範，PR 前跑 `npm run lint`。
- **CSS-First**：能用 CSS 隱藏的元素，先用 CSS（見 [docs/ARCHITECTURE.md#關鍵設計決策](docs/ARCHITECTURE.md#關鍵設計決策)）。
- **CSS 選擇器集中**：一律寫在 [src/data/selectors.ts](src/data/selectors.ts)，不要散落到業務模組。
- **規則同步**：新增規則時，[src/data/rules.ts](src/data/rules.ts)、[src/core/config.ts](src/core/config.ts) 的 `RuleEnables`、[src/data/rule-names.ts](src/data/rule-names.ts) 三者必須同步。
- **不要直接修改 `youtube-homepage-cleaner.user.js`**：這是 Rollup 打包輸出，源碼修改一律從 `src/` 開始。

---

## 測試要求

PR 必須包含對應測試。指引：

- **新增規則** → `test/filter-test.ts` 或 `test/filter-engine-test.ts` 補測試。
- **改 selectors.ts** → 跑 `npm run test:e2e:selectors`，驗證真實 YouTube DOM 可命中。
- **改 settings / config** → `test/settings-io-test.ts` 或 `test/config-manager-test.ts` 補測試。
- **改 interaction.ts** → `test/interaction-test.ts` 補測試。

完整測試指令請看 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#常用指令)。

---

## PR 檢查清單

送 PR 前請自我檢查：

- [ ] `npm run verify` 通過
- [ ] Commit 訊息符合 Conventional Commits
- [ ] 對應測試已新增/更新
- [ ] 若改了使用者可見行為，CHANGELOG.md 已記錄
- [ ] 若改了 selectors.ts，已跑過 `npm run test:e2e:selectors`
- [ ] 若新增規則，`rules.ts` / `config.ts` / `rule-names.ts` 三處已同步
- [ ] 沒有直接修改 `youtube-homepage-cleaner.user.js`

---

## 發布（僅維護者）

發布流程在 [docs/DEVELOPMENT.md#發布流程](docs/DEVELOPMENT.md#發布流程)。

---

## 授權

提交 PR 即表示你同意你的貢獻以 [MIT License](LICENSE) 授權給本專案。
