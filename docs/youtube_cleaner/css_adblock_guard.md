# CSS AdBlock Guard

## 目前狀態

- `src/features/style-manager.ts` 依設定動態組裝 CSS-first 規則並注入 `<style id="yt-cleaner-css">`。
- `src/styles/youtube-cleaner.css` 提供基礎 anti-adblock 與 overlay CSS，經 Rollup string plugin 內嵌。
- `src/features/adblock-guard.ts` patch YouTube config、監聽 popup container、移除 adblock enforcement dialog 與恢復播放。

## 範圍

- 主要檔案：`src/features/style-manager.ts`、`src/features/adblock-guard.ts`、`src/styles/youtube-cleaner.css`。
- 邊界檔案：`src/data/selectors.ts`、`src/data/rules.ts`、`src/core/config.ts`、`src/main.ts`。
- 相關測試：`test/adblock-guard-test.ts`、E2E smoke 行為。

## 上游依賴

- `ConfigManager` 的 `RULE_ENABLES.ad_block_popup`、`FONT_FIX` 與各 selector-based 規則開關。
- `baseStyles` 由 Rollup string plugin 從 CSS 檔匯入。
- YouTube `window.yt.config_` / `window.ytcfg.data_`、popup DOM 與 dialog tag。
- `Utils.throttle()` 控制 popup 清理頻率。

## 下游影響

- CSS-first 規則是避免閃爍的第一層過濾，會先於 JS metadata parsing 生效。
- AdBlockGuard 影響播放是否被 YouTube anti-adblock popup 阻斷。
- CSS selector 過寬會誤藏 YouTube 正常 overlay 或其他 extension UI。

## 關鍵流程

- `StyleManager.apply()` 每次 refresh 重新組裝 rules，復用或建立 `yt-cleaner-css`。
- Selector-based CSS 規則只處理可直接用 CSS 判斷的元素；需要白名單或 metadata 的內容類規則留給 JS。
- `AdBlockGuard.sync()` 根據 `ad_block_popup` rule 開關決定 start 或 destroy。
- `patchConfig()` 關閉 YouTube adblock popup config flags；`checkAndClean()` 找 dialog、避開 whitelisted dialogs、移除 backdrop 並 resume video。

## 常見變更入口

- 新增 CSS-first 規則：先確認不需要白名單，再改 `StyleManager` map 與 `rules.ts`。
- Adblock popup 沒移除：看 `keywords`、`popupSelectors`、`isAdBlockPopup()` 與 YouTube config shape。
- 誤殺正常 dialog：看 `whitelistSelectors` 與 `removeAdBlockBackdrops()`。
- CSS 沒更新：確認 `styleEl.id` 是否存在、build 是否使用 string plugin。

## 已知風險

- CSS `:has()` 在大量影片容器上可能有成本，新增規則要評估範圍。
- YouTube popup tag 與 config flags 可能改名；adblock guard 需要容忍 try/catch 與 selector drift。
- CSS-first 無法知道白名單，因此不能處理需要使用者清單判斷的內容類規則。

## 不要做

- 不要把 members、keyword、channel、low view 等需要資料裁決的規則放進 CSS-first 層。
- 不要移除 `AdBlockGuard.destroy()` 路徑；使用者關閉規則時必須停止 observer。
- 不要擴大 anti-adblock CSS 到所有 overlay，避免影響 YouTube 正常 UI。
