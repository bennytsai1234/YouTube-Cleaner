# 使用者介面（ui）

## 當前職責

管理所有使用者可見的選單、設定操作、語系翻譯與黑白名單編輯功能。當你需要修改 Tampermonkey 選單行為、調整設定匯出/匯入、新增語系翻譯或修改使用者互動流程時，從這裡開始。

## 範圍

- `src/ui/menu.ts`：UIManager，選單流程編排（Tampermonkey 選單註冊與路由）
- `src/ui/menu-renderer.ts`：選單渲染邏輯（prompt/alert 封裝）
- `src/ui/menu-types.ts`：MenuContext / MenuItem 型別定義
- `src/ui/list-manager.ts`：ListManager，黑白名單 CRUD（含精確模式 `=名稱`）
- `src/ui/settings-io.ts`：SettingsIO，JSON 設定匯出/匯入
- `src/ui/i18n.ts`：語系偵測與 `t()` 翻譯函式
- `src/ui/i18n-strings.ts`：各語系 UI 文案

## 依賴與影響

- 上游：`core/config.ts`（讀寫設定）、`data/rules.ts`（規則定義）、`data/rule-names.ts`（規則名稱）、`data/i18n-filter-patterns.ts`（語系偵測）
- 下游：無（ui 是最上層，不被其他模組依賴）
- 外部：Tampermonkey GM_registerMenuCommand、GM 儲存 API

## 關鍵流程

1. UIManager 在 App.init() 最後階段註冊 Tampermonkey 選單
2. 使用者點選選單項目 → UIManager 路由到對應處理函式
3. 設定變更後寫回 ConfigManager，觸發 features 模組重新讀取
4. 設定匯出/匯入透過 SettingsIO，需避免 runtime cache 汙染

## 變更入口點

- 新增選單項目：從 `menu.ts` 的 UIManager 開始
- 修改選單外觀或互動：從 `menu-renderer.ts` 開始
- 新增語系翻譯：從 `i18n-strings.ts` 開始
- 修改黑白名單編輯邏輯：從 `list-manager.ts` 開始
- 調整設定匯出/匯入：從 `settings-io.ts` 開始

## 變更路徑

- Menu 新增項目 → 需同步檢查 `menu-types.ts` 的型別
- 規則名稱變更 → 需同步 `data/rule-names.ts`
- 設定結構變更 → 需同步 `core/config.ts` 和 `settings-io.ts`
- 語系新增 → 需同步 `data/i18n-filter-patterns.ts` 和 `i18n-strings.ts`

## 已知風險

- Tampermonkey 選單 API 限制（選單項目數量、只支援 prompt/alert）
- 設定匯入時需拒絕明顯錯誤的型別，避免汙染 runtime
- 語系偵測依賴 navigator.language，部分使用者可能使用非預期語系

## 參考筆記

無（獨立模式）

## 禁止事項

- 不要在 ui 中直接操作 DOM 過濾（應由 features 模組處理）
- 不要在 ui 中實作過濾邏輯（應放在 features 模組）
- 不要跳過 ConfigManager 直接讀寫 GM 儲存
