# YouTube Cleaner — Agent 指南

Tampermonkey 使用者腳本。TypeScript 原始碼在 `src/`，Rollup 打包成根目錄的 `youtube-homepage-cleaner.user.js`。使用者從 main 分支的 raw URL 安裝與自動更新（`src/meta.json` 的 `downloadURL`／`updateURL`），所以 push 到 main 的打包檔就是正式發布物（`docs/adr/0002-bundle-committed-raw-url-is-release.md`）。

## Agent skills

### Issue tracker

這個 repo 的 GitHub Issues，用 `gh` CLI。見 `docs/agents/issue-tracker.md`。

### Triage labels

預設的五個角色（`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`）。見 `docs/agents/triage-labels.md`。

### Domain docs

單一 context：根目錄的 `GLOSSARY.md` 與 `docs/adr/`。見 `docs/agents/domain.md`。

## 寫碼前

- `CODING_STANDARDS.md`：CSS／JS 分界、規則 id、設定與文字的規範。改規則、selector、設定或使用者可見文字前先讀。
- `CONTRIBUTING.md`：專案方向（維護為主，新功能的門檻）與 commit 慣例。

## 指令

- `npm run verify`：權威的完整驗證（typecheck → lint → 單元測試 → build → `check:release`）。CI 跑同樣的檢查，另外確認 commit 的打包檔和 `src/` build 出來的一致。
- 單元測試沒有框架：`node --test` 用 `tsx` 執行 `test/*-test.ts`，jsdom 加 `test/helpers/browser-env.ts` mock GM API。
- pre-commit（husky，`npm install` 時自動裝上）：lint-staged 跑 ESLint、typecheck、單元測試。
- 改 `src/` 後執行 `npm run build`，打包檔和原始碼放在同一個 commit。
- 沒有 E2E。改 selector 或互動行為時，除了單元測試，還要在真實 YouTube 上確認受影響的頁面。

## 已知風險

- YouTube 改版是最常見的故障來源：selector 或資料擷取失效時，依序檢查 `src/data/selectors.ts` → `src/features/video-data.ts` 的屬性擷取 → `src/features/dom-visibility.ts` 的 `FILTER_CONTAINER_SELECTOR`。
- 反 Adblock 依賴 YouTube 內部 config 路徑（`adblock-guard.ts` 的 `patchConfig`：`openPopupConfig`、`EXPERIMENT_FLAGS`）；改 `src/core/types.ts` 的 `YtConfig` 時一併檢查。
- 繁簡互通依賴 `src/meta.json` 以 `@require` 載入的 opencc-js；沒載入時轉換會靜默失效。

## 發布

使用者可見的變更平時就寫進 `CHANGELOG.md` 的 `[Unreleased]`。

1. `CHANGELOG.md` 把 `[Unreleased]` 的內容改成新版本段落，和其他改動一起 commit，讓工作區保持乾淨（`npm version` 要求乾淨的工作區）。
2. `npm run verify` 通過。
3. `npm version <patch|minor|major> -m "chore: bump to v%s"`：更新 `package.json`／`package-lock.json`，`version` hook 會執行 `scripts/update-readme.js`（README badge、`src/meta.json`）與 build 並 stage，接著建立 commit 和 annotated tag `vX.Y.Z`。
4. `git push --follow-tags`。tag 會觸發 `.github/workflows/release.yml` 建立 GitHub Release 並附上打包檔；push 到 main 本身就會讓使用者端自動更新。

`npm run check:release` 檢查 package.json、lock、`src/meta.json`、README badge 與安裝連結、打包檔 header 的版本和 URL 是否一致。
