# 測試、品質檢查與發布工具

## Responsibility

- 擁有 npm 指令、TypeScript/ESLint/Rollup 工具鏈、JSDOM 測試環境、單元測試 runner、release consistency 檢查、版本同步腳本與開發/發布文件。
- 當未來工作涉及測試新增、驗證失敗、release check、版本發布、工具升級、CI 類問題或開發流程文件時，從這裡開始。

## Scope

- 代表範圍：`package.json` scripts、`tsconfig.json`、`eslint.config.js`、`test/`、`test/helpers/`、`scripts/check-release-consistency.js`、`scripts/update-readme.js`、`docs/DEVELOPMENT.md`、`docs/ROADMAP.md`。
- 常用命令：`npm run typecheck`、`npm run lint`、`npm test`、`npm run test:unit`、`npm run build`、`npm run check:release`、`npm run verify`.
- 測試 seam：filter、filter engine、logic/dom visibility、interaction、adblock guard、config manager、settings I/O、selectors。

## Dependencies & Impact

- 測試 helpers 安裝 JSDOM 與 GM storage mock；來源模組若新增 browser/Tampermonkey API，測試環境可能也要同步。
- Release consistency 腳本讀 package、lockfile、metadata、README 與 userscript 產物；任何版本或 URL 變更都會受影響。
- `npm version` script 會更新 README badge、`src/meta.json`、build userscript，並 git add 相關檔案。

## Key Flows

- 完整驗證：typecheck → lint → unit tests → build → release consistency。
- Unit tests：tsx 直接執行 TypeScript 測試，不需先編譯；每個測試檔使用簡單 runner 輸出 pass/fail。
- Release check：確認 semver、lockfile version、metadata version、download/update URL、README badge、userscript header 全部一致。
- 發布：`npm version patch/minor/major` → verify → commit → push tags。

## Change Entry Points & Routes

- 新增過濾行為：補 filter 或 filter-engine 測試；如果涉及 DOM 狀態，也看 logic/dom visibility 測試。
- 改 selector：跑 selector test，必要時補 fixture 或真實 YouTube DOM 抽查流程。
- 改設定或匯入匯出：補 config-manager 或 settings-io 測試。
- 改互動增強：補 interaction 測試，尤其是排除清單、link candidates、通知中心與播放頁推薦。
- 改 release 流程：同步 `scripts/`、`package.json` scripts 與 `docs/DEVELOPMENT.md`。

## Known Risks

- 測試主要是 JSDOM 單元測試；真實 YouTube DOM、瀏覽器 popup policy、Tampermonkey 沙箱與 CDN 載入仍需人工或專門 E2E 流程確認。
- `docs/DEVELOPMENT.md` 目前把 selector 變更建議寫成 unit 檢查；貢獻指南另提到真實 DOM/E2E selector 驗證，日後若建立正式 E2E 流程需同步文件。
- Tooling 版本較新，升級 TypeScript、ESLint 或 Rollup 時要注意 plugin 相容性。

## Do Not Do

- 不要宣稱完成但未跑與變更風險相符的 fresh verification。
- 不要只因 unit tests 通過就宣稱真實 YouTube DOM 一定可用；selector 與互動類變更仍需按風險補充驗證。
- 不要讓 release script 靜默改檔後不檢查 git diff。
