# 專案開發指南 (Development Guide)

本文件整合了專案的**架構說明**、**技術決策**與**開發工作流程**，旨在幫助開發者快速上手。

---

## 🏗️ 1. 資料夾結構 (Architecture)

專案採用模組化設計 (`src/`)，最終透過 `rollup` 打包成單一 IIFE 腳本。

```
src/
├── main.ts                         # 程式進入點 (App Composition Root)
├── meta.json                       # UserScript Metadata (版本、@match、@require)
├── env.d.ts                        # 環境型別聲明
│
├── core/                           # 核心基礎設施（不依賴外部模組）
│   ├── config.ts                   # 設定管理 (ConfigManager, Singleton)
│   ├── constants.ts                # 全局常數 (CLEANING_RULES)
│   ├── logger.ts                   # 統一日誌封裝 (Logger)
│   ├── stats.ts                    # 過濾統計 (FilterStats)
│   ├── types.ts                    # YouTube 內部物件型別 (YtConfig)
│   └── utils.ts                    # 通用工具 (數字解析、時間計算、OpenCC-JS 封裝)
│
├── data/                           # 靜態資料層（純資料，不含副作用）
│   ├── selectors.ts                # CSS 選擇器集中管理 (SELECTORS)  ← 最常需要修改的檔案
│   ├── rules.ts                    # 規則定義、優先級與白名單策略 (RULE_DEFINITIONS)
│   ├── rule-names.ts               # 各語系規則顯示名稱
│   ├── default-section-blacklist.ts   # 預設區塊標題黑名單
│   └── i18n-filter-patterns.ts     # 各語系偵測正則 (FILTER_PATTERNS)
│
├── features/                       # 業務邏輯模組
│   ├── video-filter.ts             # MutationObserver 協調中心（掃描生命週期）
│   ├── filter-engine.ts            # 過濾規則裁決引擎（核心）
│   ├── video-data.ts               # LazyVideoData：DOM 卡片資料懶惰抽取
│   ├── dom-visibility.ts           # DOM 操作：隱藏、標記、重置
│   ├── custom-rules.ts             # 文字型規則管理 (CustomRuleManager)
│   ├── subscription-manager.ts     # 訂閱頻道自動感應與保護
│   ├── style-manager.ts            # 動態 CSS 注入 (StyleManager)
│   ├── adblock-guard.ts            # 反廣告封鎖彈窗處理 (AdBlockGuard)
│   ├── interaction.ts              # 互動增強（新分頁開啟）
│   └── filter-types.ts             # FilterDetail / WhitelistReason 型別
│
├── styles/                         # CSS 模組（Rollup 以字串形式內嵌）
│   └── youtube-cleaner.css         # 基礎反廣告 CSS 規則
│
└── ui/                             # 使用者介面層
    ├── menu.ts                     # 選單流程編排 (UIManager)
    ├── menu-renderer.ts            # 選單渲染邏輯（prompt/alert 封裝）
    ├── menu-types.ts               # MenuContext / MenuItem 型別
    ├── list-manager.ts             # 黑白名單 CRUD (ListManager)
    ├── settings-io.ts              # 設定匯出/匯入 (SettingsIO)
    ├── i18n.ts                     # i18n 入口、語系偵測、`t()` 翻譯函式
    └── i18n-strings.ts             # 各語系 UI 文案
```

**運作流程**:
1. `main.ts` → 初始化各模組。
2. `StyleManager.apply()` → 注入 CSS 規則（First-Pass Filter，零閃爍）。
3. `AdBlockGuard.start()` → Patch YouTube 內部 config，啟動彈窗監聽。
4. `VideoFilter.start()` → 啟動主 MutationObserver，同時初始化 SubscriptionManager。
5. `MutationObserver` → 觸發 `processElement()` → `FilterEngine` 裁決 → `dom-visibility` 執行隱藏。
6. `yt-navigate-finish` 事件 → 重新 patch config、清除快取、重新掃描。

---

## 🏛️ 2. 關鍵技術決策 (Key Decisions)

### 2.1 CSS 優先策略 (CSS-First)
**原則**: 能用 CSS 隱藏的元素，絕不使用 JavaScript。  
**原因**: CSS 處理速度比 JS 快 10-100 倍，且能避免頁面閃爍 (FOUC)。  
**實作**: `StyleManager` 生成動態 CSS；只有當規則需要**解析內容**（如觀看數、時間、頻道名稱）時才使用 JS。

### 2.2 混合式監控 (Hybrid Monitoring)
**問題**: YouTube 是 SPA（單頁應用），內容動態載入，且頁面跳轉不會重新載入。  
**解法三層**:
1. **靜態 CSS 規則**: `StyleManager` 注入後立即生效，攔截大多數已知干擾區塊。
2. **MutationObserver**: 監控 DOM 樹變化，以 `requestIdleCallback` 批次處理（每批 50 個，500ms 超時）。
3. **`yt-navigate-finish` 事件**: 頁面跳轉後重新掃描，防止 SPA 路由後失效。

### 2.3 LazyVideoData（懶惰求值）
**問題**: 每個 DOM 元素可能不需要讀取全部欄位，過早讀取浪費效能。  
**解法**: `LazyVideoData` 使用 getter 延遲計算，首次讀取時才執行 DOM 查詢和數字解析，結果快取於 `private _field`。

### 2.4 規則優先級系統（Strong / Weak）
**問題**: 白名單與過濾規則應該如何互動？  
**解法**:
- **強規則（Strong）**: Shorts、廣告、合輯 — 白名單對這些規則無效。
- **弱規則（Weak）**: 觀看數、時長、關鍵字 — 可被頻道白名單或訂閱保護豁免。
- **特例**: `members_only` 為強規則，但 `MEMBERS_WHITELIST` 可開一個專屬例外通道。

### 2.5 嚴謹的型別系統
**原則**: 全面採用 TypeScript，編譯期捕捉錯誤。  
**優勢**: 規則 ID、設定 key、選單操作都有型別約束，重構時不會靜默失效。

### 2.6 選擇器集中管理
**原則**: 所有 CSS Selector **必須**定義在 `src/data/selectors.ts`。  
**原因**: YouTube 前端代碼常常更新。集中管理讓單一檔案修改即可修復大多數 DOM 變更問題。

### 2.7 最小外部依賴
**原則**: 核心功能零依賴；繁簡互通功能依賴 CDN `opencc-js@1.0.5`。  
**保障**: CDN 失效時，自動降級為原生字串比對（Graceful Degradation）。

### 2.8 原生 Tampermonkey UI
**原則**: 使用 `GM_registerMenuCommand` + `prompt`/`alert` 原生 UI。  
**原因**: 避免注入 React/Vue UI 到頁面，減少與 YouTube CSS 衝突，降低維護成本。

---

## ➕ 3. 如何新增一個過濾規則

新增規則最常見的兩種情境：

### 3.1 新增「文字型」規則（針對元素 textContent 比對）

只需編輯兩個檔案：

**Step 1** — `src/data/rules.ts`：在 `RULE_DEFINITIONS` 陣列新增一筆：
```typescript
{ id: 'my_new_rule', defaultEnabled: true, textRules: [/我的規則關鍵字/i] }
```

**Step 2** — `src/core/config.ts`：在 `RuleEnables` interface 新增對應 key：
```typescript
export interface RuleEnables {
    // ...existing rules...
    my_new_rule: boolean;
}
```

**Step 3** — `src/data/rule-names.ts`：新增各語系顯示名稱（可選，未設定會顯示 rule id）。

### 3.2 新增「CSS 型」規則（可用 CSS Selector 直接隱藏）

**Step 1** — `src/data/rules.ts`：新增規則定義（不需要 `textRules`）。

**Step 2** — `src/core/config.ts`：新增 `RuleEnables` key。

**Step 3** — `src/features/style-manager.ts`：在 `map` 物件加入 CSS 選擇器：
```typescript
const map = {
    // ...
    my_new_rule: ['ytd-some-renderer', 'ytd-another-renderer']
};
```

---

## 🧪 4. 測試與發布

### 4.1 測試指令

| 指令 | 說明 |
|------|------|
| `npm run typecheck` | 執行 TypeScript 型別檢查（`tsc --noEmit`） |
| `npm run lint` | ESLint 代碼品質檢查 |
| `npm test` | 執行所有單元測試（tsx） |
| `npm run test:e2e` | 執行 E2E 測試（不需登入的公開頁面）|
| `npm run test:e2e:selectors` | 驗證 CSS 選擇器健康狀態 |
| `npm run check:release` | 驗證 package、metadata、README 與 userscript 版本/URL 一致 |
| `npm run verify` | 完整驗證：typecheck + lint + 單元 + build + release check + E2E |

### 4.2 E2E 測試策略

- **主要測試目標**: 搜尋結果頁、公開頻道頁、播放頁（穩定，不需登入）。
- **不作為主測**: 登出狀態的 YouTube 首頁（不穩定，常要求登入）。
- **登入態測試**: 存放在 `playwright/.auth/`（已加入 `.gitignore`），不提交版本庫。

### 4.3 發布流程

```bash
# 1. 更新版本號（同時更新 README 版號並執行 git add README.md）
npm version patch   # 或 minor / major

# 2. 完整驗證（含型別、lint、單元、build、版本一致性、E2E）
npm run verify

# 3. 提交並推送
git add -A
git commit -m "release: vX.Y.Z"
git push
```

發布前人工確認清單：

- `package.json`、`package-lock.json`、`src/meta.json`、README badge 與 `youtube-homepage-cleaner.user.js` 的版本一致。
- `src/meta.json` 的 `downloadURL` / `updateURL` 與 README 安裝連結指向同一個 `main/youtube-homepage-cleaner.user.js`。
- `npm run test:e2e:selectors` 仍能在真實 YouTube DOM 找到影片容器、標題、頻道與連結候選。
- 沒有把 `compiled*` runtime cache 匯出到設定備份。

---

## 🧩 5. 重構後的主要責任分工

| 模組 | 職責 |
|------|------|
| `src/main.ts` | App 進入點，初始化、事件綁定，防重複初始化 |
| `src/features/video-filter.ts` | 掃描協調與 MutationObserver 生命週期 |
| `src/features/filter-engine.ts` | 規則判斷、白名單裁決、過濾原因生成 |
| `src/features/video-data.ts` | LazyVideoData DOM 卡片資料抽取 |
| `src/features/dom-visibility.ts` | 隱藏、標記、重置 DOM 狀態 |
| `src/data/rules.ts` | 規則定義、優先級與白名單策略（Single Source of Truth）|
| `src/data/selectors.ts` | 所有 CSS 選擇器（Single Source of Truth）|
| `src/ui/menu.ts` | 選單流程編排（4 大類別 × N 層子選單）|
| `src/ui/list-manager.ts` | 黑白名單 CRUD（含精確模式 `=名稱`）|
| `src/ui/settings-io.ts` | JSON 格式匯出（GM_setClipboard）/ 匯入 |
| `src/ui/i18n.ts` | 語系偵測、`t()` 函式；文案、regex 已拆到獨立子模組 |

---

## 🐛 6. 常見問題排查

| 症狀 | 可能原因 | 排查步驟 |
|------|----------|----------|
| 過濾突然失效 | YouTube 更新 DOM 結構 | 開啟 Debug Mode → 看 `Selector Health Check` 警告 → 修改 `selectors.ts` |
| 特定元素沒被過濾 | 選擇器未涵蓋新 HTML Tag | 在開發者工具找 DOM 結構 → 更新 `selectors.ts` |
| 設定沒有儲存 | ConfigState 新 key 未加入 defaults | 確認 `config.ts` 的 `this.defaults` 包含該 key |
| 白名單頻道仍被過濾 | 強規則無視白名單 | 確認是弱規則（Weak），或改用 MEMBERS_WHITELIST |
| 訂閱保護不生效 | 訂閱清單尚未掃描到 | 展開側邊導航欄觸發掃描，或等 15 分鐘自動更新 |

---

*Last Updated: 2026-05-01*
