# YouTube Cleaner — Agent 指南

Tampermonkey 使用者腳本。TypeScript 原始碼在 `src/`，Rollup 打包成根目錄的 `youtube-homepage-cleaner.user.js`。使用者從 main 分支的 raw URL 安裝與自動更新（`src/meta.json` 的 `downloadURL`／`updateURL`），所以 push 到 main 的打包檔就是正式發布物。

## 語言與方向

- 程式碼註解用繁體中文（台灣用語）；commit 訊息用英文 Conventional Commits。
- 專案以維護為主，優先穩定與低維護成本。新功能要明確改善現有體驗、不顯著增加維護成本、不依賴不穩定的 YouTube 內部 API，並預設關閉或能被使用者清楚控制。

## 指令

- `npm run verify`：權威的完整驗證（typecheck → lint → 單元測試 → build → `check:release`），內容與 CI 相同。
- 單元測試沒有框架：`tsx` 直接執行 `test/*-test.ts`，用 jsdom 加 `test/helpers/browser-env.ts` mock GM API。新增測試檔要手動加進 `package.json` 的 `test:unit`，否則不會被執行。
- `npm run dev`：Rollup watch。
- 沒有 E2E。改 selector 或互動行為時，除了單元測試，還要在真實 YouTube 上確認受影響的頁面。

## 程式碼規則

- 不要直接編輯 `youtube-homepage-cleaner.user.js`。改 `src/` 後執行 `npm run build`，打包檔和原始碼放在同一個 commit。
- YouTube DOM selector 一律放在 `src/data/selectors.ts`；selector 不寫死特定語系的文字，語系相關的比對放 `src/data/i18n-filter-patterns.ts`。
- 新增規則要三處同步：`src/data/rules.ts`（`RULE_DEFINITIONS`）、`src/core/config.ts`（`RuleEnables` 介面）、`src/data/rule-names.ts`（四語系顯示名稱）。`RuleEnables` 與 `RULE_DEFINITIONS` 的一致性沒有編譯期檢查（預設值以 `as unknown as RuleEnables` 轉型）。
- CSS 與 JS 的分界看白名單：CSS（`src/features/style-manager.ts`）只放白名單不豁免、而且只靠結構 selector 就能判斷的規則（廣告、固定區塊）；要讀標題／頻道／觀看數，或要讓白名單豁免的規則（含 Shorts、合輯、會員限定），放 JS（`src/features/filter-engine.ts`）。CSS 的 `display:none !important` 白名單救不回來，`a265467` 就是把這三類從 CSS 搬回 JS 才修好。在分界內優先用 CSS，因為 JS 過濾要等 MutationObserver 加上 `requestIdleCallback`，元素會先出現一下。
- 不要刪除或改名既有規則 id：使用者已儲存的設定以 id 為鍵，改了就會遺失。
- 設定讀寫只透過 `ConfigManager`，feature 不直接呼叫 `GM_getValue`／`GM_setValue`。`compiled*` 鍵是 `ConfigManager` 自動維護的 regex 快取：不要把 RegExp 存進 ConfigState，設定匯出也會略過這些鍵（`src/ui/settings-io.ts`）。
- 隱藏與還原元素走 `src/features/dom-visibility.ts`（`hideElement`／`clearFilterState`），不要直接改 `display`／`visibility`，否則無法還原。
- 使用者可見文字只放在 `src/ui/i18n-strings.ts`，zh-TW／zh-CN／en／ja 四語系同步。

## 已知風險

- YouTube 改版是最常見的故障來源：selector 或資料擷取失效時，依序檢查 `src/data/selectors.ts` → `src/features/video-data.ts` 的屬性擷取 → `src/features/dom-visibility.ts` 的 `FILTER_CONTAINER_SELECTOR`。
- 反 Adblock 依賴 YouTube 內部 config 路徑（`adblock-guard.ts` 的 `patchConfig`：`openPopupConfig`、`EXPERIMENT_FLAGS`）；改 `src/core/types.ts` 的 `YtConfig` 時一併檢查。
- 繁簡互通依賴 `src/meta.json` 以 `@require` 載入的 opencc-js；沒載入時轉換會靜默失效。

## 發布

1. `CHANGELOG.md` 把 `[Unreleased]` 的內容改成新版本段落，和其他改動一起 commit，讓工作區保持乾淨（`npm version` 要求乾淨的工作區）。
2. `npm run verify` 通過。
3. `npm version <patch|minor|major> -m "chore: bump to v%s"`：更新 `package.json`／`package-lock.json`，`version` hook 會執行 `scripts/update-readme.js`（README badge、`src/meta.json`）與 build 並 stage，接著建立 commit 和 annotated tag `vX.Y.Z`。
4. `git push --follow-tags`。tag 會觸發 `.github/workflows/release.yml` 建立 GitHub Release 並附上打包檔；push 到 main 本身就會讓使用者端自動更新。

`npm run check:release` 檢查 package.json、lock、`src/meta.json`、README badge 與安裝連結、打包檔 header 的版本和 URL 是否一致。

## 保持 repo 整潔

- 根目錄只放：`AGENTS.md`、`README.md`、`CHANGELOG.md`、`CONTRIBUTING.md`、`LICENSE`、`package.json`、`package-lock.json`、`tsconfig.json`、`eslint.config.js`、`rollup.config.mjs`、`youtube-homepage-cleaner.user.js`（發布物，安裝 URL 指向它）、`.gitattributes`、`.editorconfig`、`.gitignore`，以及 `src/`、`test/`、`scripts/`、`assets/`、`.github/`。新檔案放進既有目錄。
- 使用者可見的變更寫進 `CHANGELOG.md` 的 `[Unreleased]`。
- 文字檔用 LF（`.gitattributes`、`.editorconfig` 強制）；在 Windows 上用程式寫檔要明確指定 LF。
