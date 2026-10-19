---
name: live-diagnose
description: 不刷新、直接讀使用者 Chrome 裡正開著的 YouTube 分頁，查 YouTube Cleaner 為什麼沒藏（或藏錯）畫面上的某個卡片或區塊：撈腳本的主控台紀錄、存區塊快照、用 repo 的過濾引擎離線重播。使用者說「這個沒擋掉」「為什麼這個被藏了」「看一下主控台／F12」時使用。
---

# 診斷使用者畫面上的現場

YouTube 只偶爾推某些卡片，一刷新就可能再也看不到，所以整個流程只讀現場，不導頁、不刷新、不重裝腳本。要驗證改好的版本，改用 `live-verify`。

這個 repo 是公開的：頁面內容、頻道名、標題和使用者的本機路徑只留在對話裡；做成測資時換成假資料。

## 前提

Playwright MCP 以 `--extension` 模式連到使用者的 Chrome。這個模式只掛在擴充功能自己的連線頁，`browser_snapshot`、`browser_navigate` 碰不到使用者的分頁，`chrome.scripting` 也沒有；能用的是連線頁的 `chrome.debugger` 權限。先呼叫一次 `browser_tabs`（`list`）確認連得上。

## 步驟

1. **接上分頁、讀腳本紀錄**：讀 `attach.js`，整段當 function 傳給 `browser_evaluate`。接上時 Chrome 會顯示「正在偵錯此瀏覽器」的提示列，先跟使用者說一聲。
   完成：回傳有 `target`，而且你看過這幾項：
   - `started`：腳本有啟動，並帶版本號。是空的就表示腳本沒跑，或使用者關了 Debug Mode（設定裡的系統 → Debug Mode），請使用者確認。
   - `kept`：目標元素如果被白名單或訂閱保護救回，這裡會寫出原本命中的規則和救回它的名單。紀錄只有到這一步，使用者的設定值（白名單內容）讀不到，靠這幾行推回來。
   - `errors`：有沒有腳本相關的錯誤。
   - 回傳的 `tabs` 不只一個 YouTube 分頁時，確認接的是使用者說的那個；不是就設 `window.ycTarget = { tabId }` 再跑一次。

2. **找到目標元素**：用 `browser_evaluate` 執行 `async () => await window.ycEval(\`...\`)`，在分頁裡找使用者說的卡片或區塊，看它的 tag、`data-yp-checked`（腳本判斷過）、`data-yp-hidden`（被藏的原因）和 `getComputedStyle(el).display`。
   完成：知道目標元素的 selector，以及腳本對它的結論（沒判斷過、判斷過但保留、藏了）。

3. **存快照**：用 `browser_evaluate` 回傳目標的 `outerHTML`（區塊就存整個區塊），加上 `filename` 參數存到 Playwright MCP 允許的暫存資料夾 `%LOCALAPPDATA%\Temp\playwright-mcp\`，存到其他地方會被拒。
   完成：檔案存在，大小合理（區塊通常幾十 KB）。

4. **離線重播**：在 repo 根目錄執行 `node --import tsx .claude/skills/live-diagnose/replay-snapshot.mts <快照檔>`。worktree 裡沒有 `node_modules` 時先 `npm ci`。用 `--config` 帶入第 1 步推回來的設定（例如 `--config '{"KEYWORD_WHITELIST":["ASMR"]}'`），`--lang` 用第 1 步 `page.lang` 的語系（預設 `zh-TW`）。
   完成：重播結果和現場一致（`result` 跟第 2 步的結論對得上）。對不上就是設定還沒推對，或差異在時機（內容晚到），回到第 1、2 步。

5. **斷開**：`browser_evaluate` 執行 `async () => await window.ycDetach()`。
   完成：回傳沒有錯誤，提示列消失。

6. **做成測試**：要修的話，把快照精簡成 `test/filter-engine-test.ts` 的測資：保留結構和判斷用得到的屬性，頻道名、標題換成假資料。先確認測試在修之前會失敗，修完再用第 4 步的指令重播原始快照一次。快照用完移到垃圾桶。
   完成：測試在修之前失敗、修完通過，原始快照的重播結果符合預期。
