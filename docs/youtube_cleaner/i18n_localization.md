# I18n Localization

## 目前狀態

- `src/ui/i18n.ts` 提供語系偵測、`I18N.t()`、rule name fallback、語言切換與多語資料入口。
- UI 文案放在 `src/ui/i18n-strings.ts`，規則顯示名稱放在 `src/data/rule-names.ts`，過濾偵測正則放在 `src/data/i18n-filter-patterns.ts`。
- 支援語系為 `zh-TW`、`zh-CN`、`en`、`ja`。

## 範圍

- 主要檔案：`src/ui/i18n.ts`、`src/ui/i18n-strings.ts`。
- 資料檔案：`src/data/rule-names.ts`、`src/data/i18n-filter-patterns.ts`、`src/data/default-section-blacklist.ts`。
- 使用端：`src/ui/menu.ts`、`src/ui/list-manager.ts`、`src/ui/settings-io.ts`、`src/features/video-data.ts`、`src/features/style-manager.ts`、`src/core/config.ts`。

## 上游依賴

- YouTube `window.yt.config_.HL`、`ytcfg.get('HL')`、`document.documentElement.lang` 與 `navigator.language`。
- 使用者在選單中設定的 `ui_language` GM storage。
- YouTube metadata 文案，例如 views、live viewers、time ago、members-only 與 playlist 關鍵字。

## 下游影響

- UI 選單所有 label、alert、prompt 與 export/import 訊息。
- `LazyVideoData` 的 metadata parsing 與 members-only / playlist 判斷。
- `StyleManager` 的部分 shelf keyword selector。
- `ConfigManager` 預設 section blacklist 與 `ListManager.restoreDefaults()` 的語系過濾。

## 關鍵流程

- `I18N.lang` 第一次讀取時，優先從 GM storage `ui_language` 取值，否則呼叫 `detectLanguage()`。
- `detectLanguage()` 優先使用 YouTube 內部語系，再 fallback 到 document 或 browser language。
- `I18N.t()` 使用目前語系字串，缺字時 fallback 到 English，再 fallback 到 key。
- `getRuleName()` 使用目前語系 rule name，缺字時 fallback 到 English，再 fallback 到 rule id。

## 常見變更入口

- 新增 UI label：先加 `i18n-strings.ts` 所有語系，並確認呼叫端 key。
- 新增規則：同步 `rule-names.ts` 所有語系，避免 rule menu 顯示裸 id。
- 修正低觀看數、直播、時間解析：先看 `i18n-filter-patterns.ts`，再跑相關 unit/e2e。
- 調整預設 section blacklist：看 `default-section-blacklist.ts` 與 `ConfigManager.defaults`。

## 已知風險

- UI 文案缺 key 會安靜 fallback，容易在測試外漏掉翻譯。
- YouTube metadata 文案會因地區與語系改變，過濾 regex 需避免過窄。
- `I18N.lang` 是 module state，測試和匯入設定時要注意 reset 或覆寫順序。

## 不要做

- 不要在 UI 或 feature 中硬編多語使用者文案。
- 不要只更新一個語系而讓其他語系 fallback 到 key。
- 不要把 product filtering regex 放進 UI strings；偵測模式應放在 `src/data/i18n-filter-patterns.ts`。
