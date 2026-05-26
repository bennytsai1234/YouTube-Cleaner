# Development Guide

本文件涵蓋本機開發環境、測試、發布與常見維護任務。架構說明（資料夾、模組、流程、設計決策）請看 [ARCHITECTURE.md](ARCHITECTURE.md)。

---

## 環境需求

| 項目 | 版本 |
|------|------|
| Node.js | 24.x |
| npm | 隨 Node 24 內建 |
| 瀏覽器 | 任一支援 Tampermonkey 的瀏覽器 |
| Tampermonkey | 任一近期版本 |

```bash
# 安裝相依
npm install

# 開發模式（watch）
npm run dev
```

開發時建議在 Tampermonkey 安裝指向本機 `youtube-homepage-cleaner.user.js` 的腳本（`file://`），或將打包後的內容貼到一個本地 user script，便於即時驗證。

---

## 常用指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | Rollup watch 模式 |
| `npm run build` | 打包輸出 `youtube-homepage-cleaner.user.js` |
| `npm run typecheck` | TypeScript 嚴格型別檢查（不輸出檔案） |
| `npm run lint` | ESLint 代碼品質檢查 |
| `npm test` | 所有單元測試（tsx，無需編譯） |
| `npm run test:e2e` | Playwright E2E（公開頁面，免登入） |
| `npm run test:e2e:selectors` | 驗證 CSS 選擇器在真實 YouTube DOM 健康 |
| `npm run check:release` | 驗證版本/URL 跨檔案一致性 |
| `npm run verify` | 完整驗證（type + lint + unit + build + release + e2e） |

---

## 開發前必讀

1. **檢視 [ARCHITECTURE.md](ARCHITECTURE.md)** — 認識資料夾與模組職責。
2. **遵守 CSS-First 原則** — 能用 CSS 隱藏的元素，先用 CSS，再考慮 JS 解析。
3. **所有 CSS 選擇器集中** — 不要在業務模組散落寫死選擇器，一律放在 [src/data/selectors.ts](../src/data/selectors.ts)。
4. **不要直接修改 `youtube-homepage-cleaner.user.js`** — 那是 Rollup 打包輸出。源碼修改一律從 `src/` 開始。

---

## 如何新增一個過濾規則

### 文字型規則（針對 `textContent` 比對）

**Step 1** — [src/data/rules.ts](../src/data/rules.ts)：在 `RULE_DEFINITIONS` 新增一筆。

```ts
{ id: 'my_new_rule', defaultEnabled: true, textRules: [/我的規則關鍵字/i] }
```

**Step 2** — [src/core/config.ts](../src/core/config.ts)：在 `RuleEnables` interface 加入 key。

```ts
export interface RuleEnables {
    // ...existing rules...
    my_new_rule: boolean;
}
```

**Step 3**（選用）— [src/data/rule-names.ts](../src/data/rule-names.ts)：補上各語系顯示名稱。

### CSS 型規則（可直接以 CSS Selector 隱藏）

**Step 1** — `RULE_DEFINITIONS` 新增規則（不需要 `textRules`）。

**Step 2** — `RuleEnables` 加入 key。

**Step 3** — [src/features/style-manager.ts](../src/features/style-manager.ts)：在 `map` 加入對應 CSS 選擇器。

```ts
const map = {
    // ...
    my_new_rule: ['ytd-some-renderer', 'ytd-another-renderer']
};
```

---

## 測試策略

### 單元測試（tsx）

位置：`test/*.ts`。覆蓋：filter、logic、interaction、adblock guard、config manager、filter engine、settings I/O、selectors。

```bash
npm test                         # 全部
tsx test/filter-engine-test.ts   # 單一檔
```

共用 helper 在 [test/helpers/](../test/helpers/)：JSDOM 環境、`GM_*` storage mock、執行 runner。

### E2E 測試（Playwright）

位置：`test/e2e/`。覆蓋公開、穩定頁面：

- **主測**：搜尋頁、公開頻道頁、播放頁（不需登入）。
- **不主測**：登出狀態的 YouTube 首頁（YouTube 常要求登入，不穩定）。
- **登入態測試**：放在 `playwright/.auth/`（`.gitignore`），不提交版本庫。

`npm run test:e2e:selectors` 是 selector 健康檢查：在真實 YouTube DOM 嘗試命中影片容器、標題、頻道與連結候選。任一失敗代表 `selectors.ts` 需要更新。

### 何時跑哪個

| 情境 | 建議 |
|------|------|
| 改了單一模組邏輯 | 跑該模組單元測試 + `npm run typecheck` |
| 改了 `selectors.ts` | `npm run test:e2e:selectors` |
| 改了 `rules.ts` / `config.ts` | `npm test`（unit 覆蓋廣） |
| 發布前 | `npm run verify`（完整） |

---

## 發布流程

```bash
# 1. 提升版本（會自動執行 scripts/update-readme.js，更新 README badge 與 src/meta.json，並 git add）
npm version patch   # 或 minor / major

# 2. 完整驗證
npm run verify

# 3. 提交並推送
git commit -m "release: vX.Y.Z"
git push --follow-tags
```

`npm version` 會自動：

1. 更新 `package.json` 與 `package-lock.json`
2. 執行 [scripts/update-readme.js](../scripts/update-readme.js) 同步 README badge 版本
3. 執行 `npm run build` 重新打包
4. `git add README.md src/meta.json youtube-homepage-cleaner.user.js`

### 發布前人工確認

- [ ] `package.json`、`package-lock.json`、`src/meta.json`、README badge、`youtube-homepage-cleaner.user.js` 版本一致（`npm run check:release` 會自動驗證）
- [ ] `src/meta.json` 的 `downloadURL` / `updateURL` 與 README 安裝連結指向同一個 `main/youtube-homepage-cleaner.user.js`
- [ ] `npm run test:e2e:selectors` 通過
- [ ] CHANGELOG.md 已補上對應版本說明
- [ ] 沒有把 `compiled*` runtime cache 匯出到設定備份

---

## 常見問題排查

| 症狀 | 可能原因 | 排查 |
|------|----------|------|
| 過濾突然失效 | YouTube 改了 DOM 結構 | 開啟 Debug Mode → 看 `Selector Health Check` 警告 → 改 [src/data/selectors.ts](../src/data/selectors.ts) |
| 某些元素沒被過濾 | 選擇器未涵蓋新 HTML tag | 開發者工具查 DOM → 更新 `selectors.ts` |
| 設定沒儲存 | `ConfigManager` defaults 沒新增該 key | 確認 [src/core/config.ts](../src/core/config.ts) 的 `this.defaults` 有該 key |
| 白名單頻道仍被過濾 | 命中的是強規則 | 確認規則類型，或用 `MEMBERS_WHITELIST` |
| 訂閱保護不生效 | 訂閱清單尚未掃描到 | 展開側邊導航觸發掃描，或等自動更新 |
| `npm run check:release` 失敗 | 版本/URL 未同步 | 看錯誤訊息，手動同步對應檔案 |

---

## Commit 慣例

採用 [Conventional Commits](https://www.conventionalcommits.org/)：

- `feat:` 新功能
- `fix:` 修復
- `refactor:` 重構（不改變外部行為）
- `docs:` 文件
- `test:` 測試
- `chore:` 雜項（依賴升級、tooling）
- `release:` 版本發布

Commit 訊息一律使用英文。
