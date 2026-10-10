# CSS 與 JS 過濾的分界看白名單能不能豁免

2026-02-06 `a265467`，2026-10-02 `c882dc9` 寫明分界。CSS 的 `display:none !important` 白名單救不回來：Shorts、合輯、會員限定原本放在 CSS，`a265467` 把這三類搬回 JS 才修好。所以只有白名單不豁免、而且只靠結構 selector 就能判斷的規則（廣告、固定區塊）放 CSS（`src/features/style-manager.ts`）；要讀標題、頻道、觀看數，或要讓白名單豁免的規則放 JS（`src/features/filter-engine.ts`）。在分界內優先用 CSS，因為 JS 過濾要等 MutationObserver 加上 `requestIdleCallback`，元素會先出現一下。

## Considered Options

- 全部先用 CSS（`c882dc9` 之前的「CSS 優先」原則）：白名單豁免不了 CSS 藏掉的元素。
- 全部用 JS：白名單都能豁免，但廣告和固定區塊會先閃一下再消失。
