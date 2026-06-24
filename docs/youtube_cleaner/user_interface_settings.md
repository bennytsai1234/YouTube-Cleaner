# 使用者選單、名單管理與設定匯入匯出

## Responsibility

- 擁有 Tampermonkey 原生選單、選單渲染、過濾/名單/體驗/系統四大類設定流程、黑白名單 CRUD、精確匹配輸入、語系偵測與切換、設定 JSON 匯出/匯入與型別驗證。
- 當未來工作涉及使用者看得到的設定流程、選單文字、語系文案、名單操作、備份還原或匯入安全性時，從這裡開始。

## Scope

- 代表範圍：`src/ui/menu.ts`、`src/ui/menu-renderer.ts`、`src/ui/menu-types.ts`、`src/ui/list-manager.ts`、`src/ui/settings-io.ts`、`src/ui/i18n.ts`、`src/ui/i18n-strings.ts`。
- Public surface：`UIManager.showMainMenu()` 與各子選單、`ListManager` 名單操作、`SettingsIO.exportSettings/importSettings()`、`I18N.t/getRuleName/detectLanguage`。
- 相關測試：`test/settings-io-test.ts`；選單流程本身主要透過設定與匯入匯出 seam 間接覆蓋。

## Dependencies & Impact

- 依賴設定模組讀寫所有使用者可調選項；onRefresh 回呼會重新套用過濾、防護與樣式。
- I18N 聚合 UI 文案、規則名稱、過濾 pattern 與預設區塊黑名單；語系變更會影響 UI 與部分過濾解析。
- 匯入設定會寫入多個設定 key；型別驗證不足會污染 runtime state 或破壞過濾流程。

## Key Flows

- 主選單：Tampermonkey menu command 開啟四大類：過濾、名單、體驗、系統。
- 規則切換：讀 `RULE_ENABLES` key 列表，分頁顯示規則名稱，切換後 refresh。
- 名單管理：新增可逗號分隔；頻道與會員白名單可選精確匹配，透過 `=` 前綴保存；移除可用索引或完整字串。
- 設定匯出：排除 `compiled*` runtime cache，加入版本、timestamp、settings 與 language，優先寫入剪貼簿。
- 設定匯入：JSON parse → 驗證資料形狀 → 只接受 defaults 中存在的 key → 正規化規則 map → 驗證語系 → refresh。

## Change Entry Points & Routes

- 新增設定 UI：先確認設定 defaults 與型別，再加入對應選單項、文案與必要測試。
- 新增語系或文案：同步 `i18n-strings`、`rule-names`、filter patterns 與可用語系。
- 修改匯入格式：先看 `SettingsIO.normalizeImportedValue()`，並補 settings I/O 測試。
- 修改名單操作：檢查 ListManager、ConfigManager compiled list 與 FilterEngine 使用點是否一致。

## Known Risks

- 使用原生 prompt/alert，流程簡單但互動狀態依賴使用者輸入字串；錯誤驗證會直接影響設定。
- I18N 同時服務 UI 與過濾 pattern；只改文案時要避免意外改到過濾行為。
- 匯出備份不得包含 compiled regex；這些不能 JSON 序列化成可移植設定。
- 新規則若缺少規則名稱，選單會顯示 raw key，降低可用性。

## Do Not Do

- 不要引入大型前端框架到 YouTube 頁面；專案刻意使用 Tampermonkey 原生 UI 降低衝突與維護成本。
- 不要讓匯入流程接受未知設定 key 或錯誤型別。
- 不要在 UI 層直接操作 DOM 過濾；透過設定與 refresh 交給 feature 模組。
