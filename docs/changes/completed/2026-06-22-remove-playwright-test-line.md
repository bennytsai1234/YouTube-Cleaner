# 移除 Playwright 測試線

Cleanup

## 已確認的 Before
CI 目前卡在 Playwright 瀏覽器安裝流程，先前的 apt source 修正已避開第三方來源風險，但下載 Chrome for Testing 到 100% 後仍未正常結束。使用者已決定完整移除 Playwright 相關測試線，不再維護 E2E 與 selector health check。

## 已確認的 After
移除 workflow 中 Playwright 安裝、E2E 執行、selector health check 與其 artifact/issue 流程，移除 npm scripts、Playwright 依賴與 E2E 測試檔。之後驗證改以 typecheck、lint、unit tests、build 與 release metadata check 為主。

## 預期檔案範圍
- `.github/workflows/ci.yml`
- `.github/workflows/e2e-selector-check.yml`
- `.github/workflows/release.yml`
- `package.json`
- `package-lock.json`
- `playwright.config.ts`
- `test/e2e/`
- `docs/DEVELOPMENT.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `README.md`
- `docs/youtube_cleaner_index.md`
- `docs/youtube_cleaner/entry_and_build.md`
- `docs/changes/planning/2026-06-18-fix-ci-playwright-apt-hang.md`

## 驗證步驟
- `npm run typecheck`
- `npm run lint`
- `npm run test:unit`
- `npm run build`
- `npm run check:release`
- 確認剩餘 npm scripts 與 workflow 不再引用 Playwright

## 實際驗證
- `npm run verify` 通過（typecheck + lint + unit + build + release check）。
- 實際 workflow、npm scripts、lockfile、測試與一般文件已無 Playwright/E2E 指令引用。

## 回滾路徑
還原此次變更 commit，即可恢復原本的 Playwright 依賴、E2E 測試與 workflow 步驟。
