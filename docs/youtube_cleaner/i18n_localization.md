# I18n And Localization

## 目前責任

- 負責 language detection、supported language state、UI strings、localized filter patterns、rule display names 與 default section blacklist text。
- 翻譯更新、語言敏感過濾 bug 或新增支援語言時，從這裡開始。

## 範圍

- `src/ui/i18n.ts`
- `src/ui/i18n-strings.ts`
- `src/data/i18n-filter-patterns.ts`
- `src/data/rule-names.ts`
- `src/data/default-section-blacklist.ts`
- `Utils.generateCnRegex()` 的繁簡轉換支援

## 依賴與影響

- `ConfigManager` 使用 `I18N.defaultSectionBlacklist` 建立 defaults。
- `FilterEngine` 與 `LazyVideoData` 依賴 localized patterns 進行 text rule 與 metadata parsing。
- `UIManager`、`MenuRenderer`、`ListManager`、`SettingsIO` 使用 `I18N.t()` 顯示文字。

## 關鍵流程

- `I18N.detectLanguage()` 讀取 YouTube language config、document language，最後 fallback 到 navigator language。
- `I18N.lang` 透過 `GM_setValue('ui_language')` 保存手動語言選擇。
- `I18N.t()` 先取 active language string，再 fallback 到 English。
- Rule names 與 filter patterns 分成不同資料表，讓邏輯與顯示文字可分開演進。

## 變更入口

- Menu 與 alert text：`src/ui/i18n-strings.ts`。
- Metadata、members、live、age、playlist detection：`src/data/i18n-filter-patterns.ts`。
- Rule display labels：`src/data/rule-names.ts`。
- 新語言 code：`src/ui/i18n.ts`。

## 變更路線

- 新語言：新增 `SupportedLang` -> language name -> UI strings -> filter patterns -> rule names -> default section blacklist -> tests。
- Pattern 變更需檢查 `LazyVideoData` parsing 與 `FilterEngine` text rules。
- 繁簡 matching 必須保留 OpenCC graceful fallback。

## 已知風險

- 缺翻譯會 fallback 到 English；對 UI 可接受，但對語言特定過濾可能不足。
- YouTube metadata text 依 locale 不同，會影響 view/time parsing。
- 手動語言選擇會影響 menu 與部分 matching，但不會重寫既有 stored list values。

## 參考備註

- 無。

## 不要做

- 不要在 i18n data 外硬編碼使用者可見 menu text，除非是既有 internal-only 文字。
- 不要新增語言卻沒有 metadata parsing filter patterns。
- 不要假設繁簡中文可互通而忽略 OpenCC fallback。
