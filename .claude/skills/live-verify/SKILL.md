---
name: live-verify
description: 在使用者的 Chrome 裡用真的 YouTube 驗證 YouTube Cleaner 的改動：把本機 build 裝進 Tampermonkey，檢查首頁、搜尋頁、播放頁側欄實際隱藏了什麼。改了 selector、過濾規則或互動行為後、push 之前使用；使用者要求「實際驗證」「在網頁上確認」時也用。
---

# 在真的 YouTube 上驗證

單元測試跑在 jsdom 的假 DOM 上，抓不到 YouTube 改版和實際頁面結構。這個流程把本機 build 裝進使用者 Chrome 的 Tampermonkey，在真實頁面上看腳本實際藏了什麼。驗證通過才 commit 並 push。

這個 repo 是公開的：頁面內容、截圖、token 和使用者的本機路徑只留在對話裡，不寫進 repo 或 commit message。

## 前提

- Playwright MCP 以 `--extension` 模式連到使用者已登入 YouTube 的 Chrome，連線 token（`PLAYWRIGHT_MCP_EXTENSION_TOKEN`）設在使用者本機的 MCP 設定裡。先呼叫一次 `browser_tabs`（`list`）確認連得上；連不上就停下來告訴使用者，不另外開瀏覽器。
- 下面的 PowerShell 腳本用 Windows UI Automation，都放在這個技能的資料夾裡。

## 步驟

1. **Build 並在本機提供打包檔**：`npm run build`，然後在 repo 根目錄背景執行 `python -m http.server 8765 --bind 127.0.0.1`。
   完成：伺服器在跑。

2. **安裝進 Tampermonkey**：`browser_navigate` 到 `http://127.0.0.1:8765/youtube-homepage-cleaner.user.js`，Tampermonkey 會攔截並開出安裝確認頁。確認頁是擴充功能頁面，Playwright 碰不到（導過去會回 `Not allowed`），改執行 `confirm-tampermonkey.ps1`：它找到確認頁、印出內容、按下「安裝／更新／重新安裝」。
   完成：輸出結尾是「確認頁已關閉」，而且印出的「來源」是 `127.0.0.1`、新版本是剛 build 的版本。順便看「已安裝版本」，跟預期的不同就告訴使用者（例如使用者其實裝的是 Greasy Fork 上的舊版）。自動更新網址由檔頭的 `@updateURL` 決定，從本機安裝不會改掉它。

3. **停掉本機伺服器**。

4. **逐頁檢查**：依序看首頁 `https://www.youtube.com/`、一個搜尋結果頁、從搜尋結果點進去的播放頁（看側欄）。每一頁：
   1. `browser_navigate` 過去（播放頁可以在搜尋頁用 `browser_evaluate` 把 `location.href` 設成第一支影片的網址）。
   2. 執行 `show-chrome.ps1` 把 Chrome 拉到前景。Chrome 視窗被其他視窗蓋住時，頁面會被當成在背景，YouTube 只載入三、四張卡片。這一步會短暫搶走使用者的視窗焦點，第一次執行前先跟使用者說一聲。
   3. 讀 `page-check.js`，把整段內容當作 function 傳給 `browser_evaluate`。

   完成：每一頁都符合下面全部條件，不符合的寫進回報。
   - `cardCount` 有十幾張以上；只有個位數表示頁面還在背景，回到第 2 小步。
   - `cssHiddenNonAds` 是空的：CSS 只該藏廣告。
   - `adsVisible` 是 0。
   - `scriptHidden` 每一項的 `reason` 都跟它的標題和 badge 對得上（例如標題開頭是「合輯 -」的卡片是 `mix_only`）。
   - 這次改動影響的卡片或區塊有出現，結果也符合預期。沒出現就記成「沒驗到」。

5. **回報**：逐頁列出結果，以及沒驗到的頁面或情況。

## 驗證不過或放棄這次改動時

使用者的 Tampermonkey 還留著本機 build。照第 2 步重新安裝正式版：網址改用 `src/meta.json` 的 `downloadURL`（main 上的 raw 網址），一樣用 `confirm-tampermonkey.ps1` 按確認。
