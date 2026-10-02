# YouTube Cleaner — Agent 指南

Tampermonkey 使用者腳本。TypeScript 原始碼在 `src/`，Rollup 打包成根目錄的 `youtube-homepage-cleaner.user.js`。使用者從 main 分支的 raw URL 安裝與自動更新（`src/meta.json` 的 `downloadURL`／`updateURL`），所以 push 到 main 的打包檔就是正式發布物。

## 語言與方向

- 回報與程式碼註解用繁體中文（台灣用語）；commit 訊息用英文 Conventional Commits。
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
- 不要刪除或改名既有規則 id：使用者已儲存的設定以 id 為鍵，改了就會遺失。
- 設定讀寫只透過 `ConfigManager`，feature 不直接呼叫 `GM_getValue`／`GM_setValue`。`compiled*` 鍵是 `ConfigManager` 自動維護的 regex 快取：不要把 RegExp 存進 ConfigState，設定匯出也會略過這些鍵（`src/ui/settings-io.ts`）。
- 隱藏與還原元素走 `src/features/dom-visibility.ts`（`hideElement`／`clearFilterState`），不要直接改 `display`／`visibility`，否則無法還原。
- 使用者可見文字只放在 `src/ui/i18n-strings.ts`，zh-TW／zh-CN／en／ja 四語系同步。

## 已知風險

- YouTube 改版是最常見的故障來源：selector 或資料擷取失效時，依序檢查 `src/data/selectors.ts` → `src/features/video-data.ts` 的屬性擷取 → `src/features/dom-visibility.ts` 的 `FILTER_CONTAINER_SELECTOR`。
- 反 Adblock 依賴 YouTube 內部 config 路徑（`adblock-guard.ts` 的 `patchConfig`：`openPopupConfig`、`EXPERIMENT_FLAGS`）；改 `src/core/types.ts` 的 `YtConfig` 時一併檢查。
- 繁簡互通依賴 `src/meta.json` 以 `@require` 載入的 opencc-js；沒載入時轉換會靜默失效。

## 關鍵決策

- [verified] 發布用的打包檔必須從已 commit 的原始碼 build。v2.1.17（`b6c8ef8`）的打包檔帶到工作區裡尚未 commit 的 `INTERACTION_EXCLUDE` 改動，原始碼和測試到 `caf6c5a`（v2.1.18）才補上；`check:release` 只比對版本與 URL，抓不到這種落差。
- [unverified] 能用 CSS 隱藏的元素先用 CSS（`src/features/style-manager.ts`），再考慮 JS 解析。依據是推論：CSS 在渲染前就生效、不會閃爍；效能差距沒有量測過。

## 發布

1. `CHANGELOG.md` 把 `[Unreleased]` 的內容改成新版本段落，和其他改動一起 commit，讓工作區保持乾淨（`npm version` 要求乾淨的工作區）。
2. `npm run verify` 通過。
3. `npm version <patch|minor|major> -m "chore: bump to v%s"`：更新 `package.json`／`package-lock.json`，`version` hook 會執行 `scripts/update-readme.js`（README badge、`src/meta.json`）與 build 並 stage，接著建立 commit 和 annotated tag `vX.Y.Z`。
4. `git push --follow-tags`。tag 會觸發 `.github/workflows/release.yml` 建立 GitHub Release 並附上打包檔；push 到 main 本身就會讓使用者端自動更新。

`npm run check:release` 檢查 package.json、lock、`src/meta.json`、README badge 與安裝連結、打包檔 header 的版本和 URL 是否一致。

## 保持 repo 整潔

- 根目錄只放：`AGENTS.md`、`README.md`、`CHANGELOG.md`、`CONTRIBUTING.md`、`LICENSE`、`package.json`、`package-lock.json`、`tsconfig.json`、`eslint.config.js`、`rollup.config.mjs`、`youtube-homepage-cleaner.user.js`（發布物，安裝 URL 指向它）、`.gitattributes`、`.editorconfig`、`.gitignore`，以及 `src/`、`test/`、`scripts/`、`assets/`、`.github/`。新檔案放進既有目錄。
- 取代某樣東西時，同一個變更內移除舊的檔案、腳本、設定，以及指向它們的引用。
- 不建 `docs/`、計畫檔或完成紀錄：規則寫在這裡，行為規格寫成測試，工作歷史寫在 commit 訊息，使用者可見的變更寫進 `CHANGELOG.md`。
- 暫存檔、下載物、handoff 留在 repo 外或被忽略的路徑，任務結束就刪掉。
- 文字檔用 LF（`.gitattributes`、`.editorconfig` 強制）；在 Windows 上用程式寫檔要明確指定 LF。
- 回報完成前檢查 `git status` 和根目錄，確認沒有新增雜物。

## 交付流程（給 GPT／Codex；所有 agent 都遵守）

1. 原始碼就是 commit：發布物（main 上的打包檔、GitHub Release）一律從乾淨、已 commit 的狀態 build，不從帶有未 commit 改動的工作區打包。
2. 版本只從一個地方推進：用 `npm version` 同步所有版本欄位，不手動逐檔改版號，也不另外建版本副本。
3. 驗收：`npm run verify` 通過；改到 selector 或互動行為時，在真實 YouTube 上確認一次受影響的頁面。
4. 歷史放在 git：不做 `.bak`、複本或完成紀錄文件；操作中需要的臨時複本，在同一步驟內刪掉。
5. 一個工作一支腳本：擴充 `scripts/` 裡既有的腳本，不複製出新版本。
6. 紀錄：commit 訊息寫改了什麼、怎麼驗證；長期規則寫進本檔；使用者可見的變更寫進 `CHANGELOG.md`。
7. 回報分三段：改了什麼、驗證了什麼、還有什麼待處理。不重述範圍，不逐步敘述過程。
