# 執行入口與打包發布

## Responsibility

- 擁有 userscript 的組裝根、啟動順序、防重複初始化、YouTube SPA 導航後刷新流程、Tampermonkey metadata 與 Rollup 打包輸出。
- 當未來工作涉及「腳本何時啟動」、「哪些模組先後初始化」、「版本與安裝資訊」、「OpenCC/Tampermonkey 權限」或「build 產物」時，從這個模組開始。

## Scope

- 代表範圍：`src/main.ts`、`src/meta.json`、`rollup.config.mjs`、`package.json` 的 build/version scripts，以及根目錄 userscript 輸出。
- 入口點：`App.init()` 組裝設定、CSS、防護、過濾、互動與選單；`yt-navigate-finish` 事件負責重新 patch、清快取、重新掃描與訂閱掃描。
- 建置：Rollup 以 `src/main.ts` 為 input，輸出 IIFE userscript，從 `src/meta.json` 生成 metablock，並用 package version 覆蓋 metadata version。

## Dependencies & Impact

- 依賴設定、CSS 注入、防護、過濾、互動與 UI 模組；這裡是 runtime composition root，不應承載業務判斷。
- 修改初始化順序會影響 CSS 首屏隱藏、Adblock 防護、MutationObserver 掃描、點擊事件攔截與選單 refresh 行為。
- 修改 metadata 或 package version 流程會影響安裝 URL、更新 URL、README badge、release consistency 與產出的 userscript header。

## Key Flows

- 啟動：建立 `ConfigManager` → 套用樣式 → 同步 AdBlock 防護 → 啟動影片過濾 → 啟動互動增強 → 註冊 Tampermonkey 設定選單 → 初次掃描頁面與訂閱。
- SPA 導航：YouTube 觸發 `yt-navigate-finish` → 重新 patch config → 清除過濾快取 → 掃描新頁面 → 清理 adblock 彈窗 → 掃描訂閱。
- 建置：`npm run build` → Rollup 讀取 source 與 CSS → 注入 userscript metadata → 輸出 `youtube-homepage-cleaner.user.js`。

## Change Entry Points & Routes

- 改啟動順序或 refresh 行為時，先看 `src/main.ts`，再路由到被初始化的 owning module。
- 改 userscript metadata、權限、match/exclude、OpenCC CDN 時，先看 `src/meta.json`，再跑 release consistency。
- 改 build pipeline 時，先看 `rollup.config.mjs` 與 `package.json` scripts，並確認 userscript 產物仍可由 source 重建。
- 發布版本相關變更必須同步 package、lockfile、metadata、README badge 與 userscript header。

## Known Risks

- `run-at` 是 `document-start`，初始化太晚會增加首屏閃爍；太早操作 DOM 則需確認 document/head/body 是否已可用。
- YouTube 是 SPA，漏掉導航刷新會造成舊頁快取、過濾標記或 adblock patch 狀態失效。
- `youtube-homepage-cleaner.user.js` 是建置產物；直接手改會被下一次 build 覆蓋，也會破壞 release consistency。
- OpenCC 透過 metadata `@require` 載入；CDN 失效時只能依賴程式內的降級路徑。

## Do Not Do

- 不要把過濾規則、selector 或 UI 流程塞進 `src/main.ts`。
- 不要手動編輯 userscript 輸出來修 bug；修 source 後 build。
- 不要在 metadata 補不必要的外部依賴，除非已評估維護成本與失效降級。
