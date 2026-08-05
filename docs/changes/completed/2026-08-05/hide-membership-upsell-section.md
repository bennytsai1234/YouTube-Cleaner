# 隱藏首頁會員招募區塊

## 原始請求

移除首頁中由 `ytd-rich-section-renderer` 包住的會員招募／推薦頻道區塊。

## Before

附件中的區塊包含 `ytd-brand-video-shelf-renderer[has-sponsorships-channel-upsell-view-model]`，外層雖然已被 VideoFilter 標記為 `data-yp-checked="true"`，但仍會顯示。現有依賴文字內容的規則可能在 YouTube 動態內容完成前就檢查完畢，無法穩定處理此區塊。

## 方案

使用結構 selector 精準選取整個外層 `ytd-rich-section-renderer`，由既有 `members_only` CSS 開關注入 `display: none !important`。selector 放在 `src/data/selectors.ts`，由 `StyleManager` 使用；不增加新的設定鍵，也不改變影片內容的白名單流程。

## After

只要會員招募元件出現在該首頁區塊內，整個區塊即時隱藏；正常的影片區塊與其他 `YouTube 精選` 內容不受影響。關閉 `members_only` 規則時，該 CSS 也會同步移除。

## 實作

- 在 `SELECTORS.MEMBERSHIP_UPSELL_SECTION` 集中定義結構 selector。
- 在 `StyleManager` 的 `members_only` CSS map 加入該 selector。
- 新增 JSDOM 回歸測試，確認只命中會員招募區塊的外層 section。
- 重新建置 `youtube-homepage-cleaner.user.js`。

## 驗證

- `TMPDIR=/tmp/youtube-cleaner-tsx npm run verify`：通過。
- typecheck、lint、全部單元測試、build、release consistency：通過。
- selector 測試：56 通過、0 失敗。
- `git diff --check`：通過。

## 風險與回滾

此變更只新增可逆的 CSS 隱藏規則。回滾時移除 selector、StyleManager map 項目與測試即可；不涉及資料格式、外部 API 或 DOM 移除。
