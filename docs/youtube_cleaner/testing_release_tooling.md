# Testing Release Tooling

## 目前狀態

- `package.json` scripts 定義 typecheck、lint、unit、build、release consistency、E2E 與完整 verify。
- 單元測試以 `tsx` 直接執行 TypeScript，JSDOM 與 GM storage mock 位於 `test/helpers/`。
- Playwright E2E 會先 build 根目錄 `youtube-homepage-cleaner.user.js`，再透過 `test/e2e/utils.ts` 注入 YouTube 頁面。
- Release tooling 會檢查 package、lockfile、metadata、README badge/install link 與 generated userscript header 一致。

## 範圍

- 主要檔案：`package.json`、`playwright.config.ts`、`test/`、`scripts/check-release-consistency.js`、`scripts/update-readme.js`。
- 邊界檔案：`src/meta.json`、`README.md`、`youtube-homepage-cleaner.user.js`、`package-lock.json`、`eslint.config.js`、`tsconfig.json`。
- 常用命令：`npm run typecheck`、`npm run lint`、`npm test`、`npm run build`、`npm run check:release`、`npm run test:e2e`、`npm run verify`。

## 上游依賴

- Node/npm toolchain 與 devDependencies：TypeScript、ESLint、tsx、JSDOM、Rollup、Playwright。
- 真實 YouTube DOM 與 network 狀態會影響 E2E。
- `youtube-homepage-cleaner.user.js` 必須由 build 產生，E2E injection 才能讀到最新腳本。

## 下游影響

- 所有跨模組修改的驗證策略。
- 發布前版本一致性與 README 安裝入口。
- CI 或本地 verify 的穩定性。

## 關鍵流程

- `npm test` 執行所有手寫 unit tests：filter、logic、interaction、adblock guard、config、filter engine、settings IO、selectors。
- `npm run test:e2e` 執行非登入 E2E，避開 `@auth` tests。
- `npm run verify` 串起 typecheck、lint、unit、build、release check 與 E2E。
- `npm version` 會呼叫 `scripts/update-readme.js` 更新 README badge 與 `src/meta.json` version。
- `scripts/check-release-consistency.js` 用 package version 與 repo slug 驗證 metadata、README 與 userscript header。

## 常見變更入口

- 修改核心裁決：至少跑 `npm test`，涉及真實 DOM 時加跑相關 Playwright spec。
- 修改 selector：跑 `npm test` 與 `npm run test:e2e:selectors`。
- 修改 metadata、版本或發布連結：跑 `npm run build` 與 `npm run check:release`。
- 修改 UI 設定或匯入匯出：跑 `test/settings-io-test.ts` 對應 unit，必要時跑 settings e2e。

## 已知風險

- Playwright 依賴真實 YouTube，可能受地區、登入狀態、A/B test 與頁面改版影響。
- E2E 讀 generated userscript；忘記 build 會測到舊腳本。
- Release consistency 會讀 README 與 userscript header；版本更新流程不能只改 package。

## 不要做

- 不要把根目錄 userscript 當 source of truth。
- 不要在 selector 改動後只跑 unit，不跑真實 DOM selector check。
- 不要修改 release URL 或 repo slug 推導而不跑 `npm run check:release`。
