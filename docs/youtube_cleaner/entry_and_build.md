# 進入點與建置（entry-and-build）

## 當前職責

管理應用程式初始化、UserScript 元資料、CSS 靜態資源與 Rollup 建置管線。這是專案的組合根（Composition Root）與建置基礎設施。當你需要調整初始化順序、修改 UserScript 版本或 metadata、變更建置流程或 CSS 靜態規則時，從這裡開始。

## 範圍

- `src/main.ts`：App 進入點，組合根，負責初始化所有模組的正確順序
- `src/meta.json`：UserScript Metadata（版本、@match、@require、@grant 等）
- `src/styles/youtube-cleaner.css`：基礎反廣告 CSS 規則（Rollup 以字串內嵌）
- `rollup.config.js`：Rollup 建置設定
- `package.json`：npm scripts、依賴管理
- `scripts/check-release-consistency.js`：版本一致性檢查腳本

## 依賴與影響

- 上游：所有 `src/` 模組（core、data、features、ui）
- 下游：`youtube-homepage-cleaner.user.js`（Rollup 打包輸出，不可手動編輯）
- 外部：Node.js、Rollup、TypeScript、ESLint、Playwright

## 關鍵流程

### 啟動序列
```
App.init()
  ├── Logger.setup()
  ├── ConfigManager.init()
  ├── StyleManager.apply()          ← 第一道 CSS 過濾
  ├── AdBlockGuard.sync()           ← Patch YouTube 內部 API
  ├── VideoFilter.start()           ← 主 MutationObserver
  │     └── SubscriptionManager.init()
  ├── InteractionEnhancer.init()    ← 點擊攔截
  ├── GM_registerMenuCommand()      ← 選單註冊
  └── window.addEventListener('yt-navigate-finish', refresh)
```

### 建置管線
```
TypeScript 原始碼 → Rollup（含 plugin-typescript、plugin-node-resolve）
  → 單一 IIFE 檔案 youtube-homepage-cleaner.user.js
  → metablock plugin 插入 UserScript header
```

### 驗證管線
```
npm run verify
  ├── npm run typecheck     （tsc --noEmit）
  ├── npm run lint          （eslint src）
  ├── npm run test:unit     （8 個測試檔案）
  ├── npm run build         （rollup -c）
  ├── npm run check:release （版本一致性）
  └── npm run test:e2e      （Playwright E2E）
```

## 變更入口點

- 調整初始化順序或新增初始化步驟：從 `main.ts` 的 App.init() 開始
- 修改 UserScript metadata：從 `meta.json` 開始
- 變更 CSS 靜態規則：從 `styles/youtube-cleaner.css` 開始
- 調整建置流程：從 `rollup.config.js` 和 `package.json` 的 scripts 開始
- 新增 npm script：從 `package.json` 開始

## 變更路徑

- `meta.json` 版本變更 → 需同步 `package.json` version、`README.md` badge 和 `CHANGELOG.md`
- `main.ts` 初始化順序變更 → 需確認所有 features 模組的初始化相依性
- CSS 變更 → 需確認 `features/style-manager.ts` 的動態注入邏輯相容
- 建置工具升級 → 需確認 `youtube-homepage-cleaner.user.js` 輸出正確

## 已知風險

- `youtube-homepage-cleaner.user.js` 是建置產出，與源碼不同步會造成混淆
- UserScript metadata（@match、@grant）修改可能影響腳本載入範圍或權限
- Rollup 設定複雜度（多個 plugin、字串內嵌 CSS），升級時需謹慎

## 參考筆記

無（獨立模式）

## 禁止事項

- 不要手動編輯 `youtube-homepage-cleaner.user.js`（建置產出）
- 不要在建置設定中引入執行期依賴
- 不要在 `main.ts` 中實作業務邏輯（應委派給對應模組）
