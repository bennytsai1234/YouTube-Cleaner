# CSS And Adblock Guard

## 目前責任

- 負責 CSS-first hiding rules、靜態 stylesheet injection、可選 font fix、anti-adblock popup mitigation、YouTube config patch、popup cleanup、backdrop removal 與恢復播放。
- 零閃爍過濾、adblock warning 或 CSS-based rule 變更，從這裡開始。

## 範圍

- `src/features/style-manager.ts`
- `src/features/adblock-guard.ts`
- `src/styles/youtube-cleaner.css`
- `src/core/types.ts`
- `test/adblock-guard-test.ts`

## 依賴與影響

- 依賴 `ConfigManager`、`SELECTORS`、`I18N`、`Logger`、`Utils.throttle` 與 YouTube internal config object。
- CSS injection 會在 JavaScript scanning 完成前影響內容可見性。
- Adblock guard 會移除 popup DOM 並恢復影片播放，false positive 會影響正常 dialog。

## 關鍵流程

- `StyleManager.apply()` 依 enabled rules 組 CSS、匯入 base CSS、套用 font fix，並寫入單一 `style#yt-cleaner-css`。
- CSS map 處理可不解析內容就隱藏的 ad、premium、survey、playables、Shorts shelf、news、movies 與 fundraiser。
- `AdBlockGuard.patchConfig()` 在可用時停用已知 YouTube adblock detection flags。
- `AdBlockGuard.start()` 對 popup surface 掛載 throttled observer，移除符合 adblock 特徵且不在白名單中的 dialog。

## 變更入口

- Selector-based CSS hiding 或 font behavior：`src/features/style-manager.ts`。
- Anti-adblock popup detection 或 cleanup：`src/features/adblock-guard.ts`。
- 靜態 base CSS：`src/styles/youtube-cleaner.css`。

## 變更路線

- 新 CSS rule 先判斷 selector 是否應放在 `src/data/selectors.ts`。
- Popup detection 變更需要測試 false positive 與 whitelisted dialog。
- Config patch 變更需檢查 `src/core/types.ts` 與 graceful failure。

## 已知風險

- `:has()` selector 可能成本高或在 YouTube DOM 變動時脆弱。
- Anti-adblock keyword 可能誤中正常 dialog，需維持 whitelist。
- YouTube internal config object 名稱不穩定。

## 參考備註

- 無。

## 不要做

- 需要 JavaScript whitelist decision 的內容規則，不要移進 CSS。
- 不要移除 YouTube internal config patch 的 try/catch。
- 不要從 popup cleanup 移除 whitelisted dialog 檢查。
