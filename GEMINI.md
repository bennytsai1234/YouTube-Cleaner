# AI Agent 開發守則

本文件是 Gemini CLI、Claude Code、Codex 等 AI Agent 在本專案工作時的共通約定。本文件刻意精簡，深入內容請依需要參照：

- 環境設置、測試、發布 → [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- 架構、模組、設計決策 → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Commit 慣例、PR 流程 → [CONTRIBUTING.md](CONTRIBUTING.md)
- 模組層級細節 → [docs/youtube_cleaner_index.md](docs/youtube_cleaner_index.md)

---

## 核心原則

### 1. 源碼修改一律從 `src/` 開始

`youtube-homepage-cleaner.user.js` 是 Rollup 打包輸出，**絕對不要直接編輯**。修改源碼後執行 `npm run build` 才會更新該檔。

### 2. 不要為了「面積大」而用全檔覆寫

優先使用編輯器的 `Edit` / `replace` 類工具做局部替換，避免不必要的整檔覆寫造成截斷或遺漏。整檔重寫只在以下情境合理：

- 新建檔案
- 結構性重排（多區塊洗牌、需要重新組織）
- 局部編輯反覆失敗，且已先 `Read` 確認檔案目前狀態

整檔覆寫前，先 `Read` 一次目標檔案以確保上下文正確。

### 3. CSS 選擇器集中

所有 YouTube DOM 的 CSS Selector 必須定義在 [src/data/selectors.ts](src/data/selectors.ts)。不要在業務模組散落寫死選擇器。YouTube DOM 漂移時，只改這一個檔案。

### 4. 規則三同步

新增/修改過濾規則時，以下三個檔案必須同步：

- [src/data/rules.ts](src/data/rules.ts) — `RULE_DEFINITIONS`
- [src/core/config.ts](src/core/config.ts) — `RuleEnables` interface
- [src/data/rule-names.ts](src/data/rule-names.ts) — 各語系顯示名稱（選用，未設定會 fallback 到 rule id）

### 5. CSS-First

能用 CSS 隱藏的元素，先用 CSS（透過 [src/features/style-manager.ts](src/features/style-manager.ts)），再考慮 JS 解析。CSS 過濾比 JS 快 10–100 倍且零閃爍。

### 6. 跨檔影響分析

修改 [src/core/config.ts](src/core/config.ts)、[src/data/selectors.ts](src/data/selectors.ts) 或任何公共常數後，請搜尋全域引用並同步更新。

### 7. 匯入與型別完整性

使用新變數或類別前，確認檔案頂部已有對應 `import`。改完後跑 `npm run typecheck` 與 `npm run lint`。

---

## Release 一致性

`package.json`、`package-lock.json`、`src/meta.json`、README badge、`youtube-homepage-cleaner.user.js` 的版本必須一致。`npm version <patch|minor|major>` 會自動執行 [scripts/update-readme.js](scripts/update-readme.js) 同步多數檔案；最後由 `npm run check:release` 驗證。

---

## 驗證

| 範圍 | 指令 |
|------|------|
| 小範圍變更 | 對應的單元測試 + `npm run typecheck` |
| 改 selectors | `npm run test:e2e:selectors` |
| 發布前、大範圍重構 | `npm run verify` |

---

## Commit 慣例

採用 [Conventional Commits](https://www.conventionalcommits.org/)，訊息一律英文。

```
feat: ...
fix: ...
refactor: ...
docs: ...
test: ...
chore: ...
release: vX.Y.Z
```

### Commit 節奏

按邏輯單元 commit：「一個 bug 修復」「一個重構」「一次依賴升級」各自一個 commit。**不要**每改一個檔案就 commit 一次（過去專案有過大量 `backup: update *.md` 雜訊，已不採用）。

### 危險操作

未經使用者明確同意，**不要**：

- `git push --force`、`git reset --hard`、`git checkout .`、`git clean -f`、`git branch -D`
- 跳過 hook（`--no-verify`）、跳過簽章（`--no-gpg-sign`）
- 修改 `.git/config` 或 git 全域設定
- 直接 push 到 `main`

---

## 平台注意事項

| 平台 | 注意 |
|------|------|
| Linux / macOS | 預設使用 `&&` 串接命令 |
| Windows PowerShell | 不支援 `&&`，需用 `;`。不要使用 CMD 語法（如 `dir /s /b`） |
| Git CRLF | Windows 預設行為，PR 前確認沒誤改大量檔案行尾 |

---

## 疑難排解

| 問題 | 解法 |
|------|------|
| 局部編輯反覆失敗 | 先 `Read` 確認檔案當下狀態（注意行尾、空白、不可見字元）；分段做小範圍替換；最後一個選項才整檔覆寫 |
| Selector 失效 | 開啟 Debug Mode → 看 `Selector Health Check` 警告 → 改 [src/data/selectors.ts](src/data/selectors.ts) → 跑 `npm run test:e2e:selectors` |
| 規則加了卻沒生效 | 檢查「規則三同步」是否漏一個 |
| `check:release` 失敗 | 看錯誤訊息對應哪個檔案版本/URL 不一致，手動同步 |
| 程式碼意外被刪 | `git checkout <file>` 還原到 HEAD |

---

## 對使用者的回報

修改完成後，向使用者回報時：

- 列出實際變動的檔案路徑
- 說明變動原因（fix / feat / refactor 等）
- 若跑了驗證，附上結果（pass / fail 與要點）
- 若有未解決的 follow-up，明確標出

避免冗長的「我做了什麼」敘述。使用者通常已經看到 diff，重點是 **為什麼** 與 **下一步**。
