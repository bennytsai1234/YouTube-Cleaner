# Testing And Release Tooling

## 目前責任

- 負責本地驗證指令、bundling、linting、type checking、Playwright tests、release consistency checks、version update helpers 與 GitHub Actions。
- CI failure、dependency upgrade、release preparation 或 build output 問題，從這裡開始。

## 範圍

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `eslint.config.js`
- `rollup.config.mjs`
- `playwright.config.ts`
- `scripts/check-release-consistency.js`
- `scripts/update-readme.js`
- `.github/workflows/*.yml`
- `test/**/*.ts`

## 依賴與影響

- Rollup 消費 `src/main.ts`、`src/meta.json`、CSS string imports 與 `package.json` version。
- Release checks 比對 package metadata、userscript metadata、README install link/badge 與 generated output。
- GitHub Actions 使用 Node 24，執行 install、typecheck、lint、build、release check、unit tests、Playwright browser install 與 E2E。

## 關鍵流程

- `npm run typecheck` 執行 `tsc --noEmit`。
- `npm run lint` 對 `src` 執行 ESLint。
- `npm test` 轉到 `npm run test:unit`。
- `npm run test:e2e` 執行 Playwright E2E，排除 auth-tagged tests。
- `npm run verify` 執行完整本地驗證鏈。
- `npm version` 會執行 `scripts/update-readme.js` 並 stage README version badge 變更。

## 變更入口

- command、dependency、version：`package.json`。
- generated userscript output：`rollup.config.mjs`。
- release metadata failure：`scripts/check-release-consistency.js`。
- CI pipeline failure：`.github/workflows/ci.yml`。
- unit/E2E coverage：`test/`。

## 變更路線

- Dependency upgrade：更新 package metadata 與 lockfile -> 跑目標測試 -> broad upgrade 時跑 `npm run verify`。
- Release：version bump -> build generated output -> release consistency check -> changelog/readme review -> full verification。
- Selector-related CI failure 通常回到 Rule Catalog And Selectors 與 E2E selector tests。

## 已知風險

- E2E 依賴 live YouTube pages，可能因上游 DOM 或網路變更失敗。
- Source 或 metadata release 變更後，必須重新 build `youtube-homepage-cleaner.user.js`。
- CI 中的 Node/action version 是相容性表面的一部分。

## 參考備註

- 無。

## 不要做

- 不要提交 `playwright/.auth/`、`test-results/` 或 generated report artifacts。
- 版本或 metadata 變更時，不要跳過 release consistency checks。
- 不要更新 dependency 卻不檢查 lockfile 與 callers。
