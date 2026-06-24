# 頁面防護、CSS 注入與互動增強

## Responsibility

- 擁有 CSS-First 隱藏規則、基礎 CSS 注入、字型修正、反 Adblock 彈窗處理、YouTube config patch、播放恢復、背景新分頁與通知新分頁點擊邏輯。
- 當未來工作涉及首屏閃爍、CSS 隱藏、Adblock 彈窗、YouTube popup/backdrop、影片播放被擋、點擊行為或通知中心開新分頁時，從這裡開始。

## Scope

- 代表範圍：`src/features/style-manager.ts`、`src/styles/youtube-cleaner.css`、`src/features/adblock-guard.ts`、`src/features/interaction.ts`。
- Public surface：`StyleManager.apply()`、`AdBlockGuard.sync/start/patchConfig/checkAndClean/resumeVideo/destroy()`、`InteractionEnhancer.init()`。
- 相關測試：`test/adblock-guard-test.ts`、`test/interaction-test.ts`，以及 selector test 中的 clickable/link candidate 驗證。

## Dependencies & Impact

- 依賴設定與規則目錄決定哪些 CSS 規則啟用；依賴 selector catalog 找可點擊容器與 link candidates。
- CSS 注入比 JS 過濾更早生效；它影響使用者看到的首屏閃爍與可互動元素。
- 點擊攔截在 capture phase 執行；錯誤擴大命中會破壞 YouTube 原生按鈕、選單、播放控制或頻道導覽。
- AdBlock 防護會修改 YouTube runtime config 並移除彈窗/backdrop；錯誤白名單會誤移除正常對話框。

## Key Flows

- CSS 注入：根據規則開關組合 base styles、字型修正與 selector map，寫入單一 `#yt-cleaner-css` style element。
- AdBlock 防護：關閉 YouTube adblock detection flags → 監聽 popup 容器 → 比對 adblock 關鍵字與 enforcement 元件 → 關閉/移除彈窗 → 清 backdrop → 在冷卻時間外恢復播放。
- 一般點擊：在 document capture click 中排除按鈕/選單/播放器控制 → 找 primary YouTube link → 阻止原事件 → 用 `window.open(..., '_blank')` 背景開啟。
- 通知點擊：通知面板中的 watch link 走專門分支，避免一般容器搜尋干擾。

## Change Entry Points & Routes

- 新 CSS 型規則：先確認規則 catalog 與設定開關，再到 `StyleManager` selector map 增加 CSS。
- Adblock popup 修復：先建立包含 dialog/popup/backdrop 的 DOM fixture，再調整關鍵字、白名單 selector 或 patch target。
- 新分頁 bug：先看 `INTERACTION_EXCLUDE`、`CLICKABLE`、`LINK_CANDIDATES`，再看 `InteractionEnhancer.findPrimaryLink()` 與 click handler。
- 字型修正或 base CSS：先看 CSS 檔，再看 `StyleManager.apply()` 是否依設定注入。

## Known Risks

- `:has()` 規則可能不容易在所有測試 DOM 中重現，且可能過度隱藏內容。
- capture-phase click handler 若排除不足，會破壞 YouTube 原本互動；若 link candidates 不足，則點擊無效。
- Adblock popup 偵測依賴 YouTube 內部 config 與 dialog 結構，這些不是穩定 API。
- `window.open` 行為受瀏覽器與 userscript 執行環境影響；測試需用 mock 驗證呼叫。

## Do Not Do

- 不要在互動增強中直接硬寫新的 selector；先更新 selector catalog。
- 不要讓 AdBlockGuard 移除所有 dialog；必須保留白名單對話框。
- 不要把需要白名單裁決的內容類規則搬到 CSS 強制隱藏。
