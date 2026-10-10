# 寫碼規範

`code-review` 依這份審查；ESLint、型別檢查與 `test/consistency-test.ts` 已經擋下的規則不在這裡重複。

## 規則與過濾

- **CSS 與 JS 的分界看白名單**：白名單不豁免、而且只靠結構 selector 就能判斷的規則（廣告、固定區塊）放 CSS（`src/features/style-manager.ts`）；要讀標題／頻道／觀看數，或要讓白名單豁免的規則（含 Shorts、合輯、會員限定），放 JS（`src/features/filter-engine.ts`）。分界內優先用 CSS。理由見 `docs/adr/0001-css-js-filter-boundary.md`。
- **既有規則 id 不刪除也不改名**：使用者已儲存的設定以 id 為鍵，改了就會遺失。
- **selector 集中在 `src/data/selectors.ts`**，不寫死特定語系的文字；語系相關的比對放 `src/data/i18n-filter-patterns.ts`。

## 設定

- **設定讀寫只透過 `ConfigManager`**（ESLint 擋其他檔案直接呼叫 `GM_getValue`／`GM_setValue`）。唯一的例外是 `src/ui/i18n.ts` 的介面語言 `ui_language`：`ConfigManager` 的預設值要用 `I18N`（`SECTION_TITLE_BLACKLIST` 取 `I18N.defaultSectionBlacklist`），`I18N` 若反過來依賴 `ConfigManager` 會形成循環匯入。其他新設定一律加進 `ConfigState`。
- **`compiled*` 鍵是 `ConfigManager` 自動維護的 regex 快取**：不要把 RegExp 存進 `ConfigState` 的其他鍵；設定匯出會略過 `compiled*`（`src/ui/settings-io.ts`）。

## 文字

- 程式碼註解用繁體中文（台灣用語）。
- 使用者可見文字只放在 `src/ui/i18n-strings.ts`，zh-TW／zh-CN／en／ja 四語系一起加（測試檢查四語系的鍵相同）。
