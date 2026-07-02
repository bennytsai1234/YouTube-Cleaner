---
name: youtube-cleaner-atlas
description: "YouTube Cleaner Codebase Atlas — 導航地圖與變更紀律。在調查或編輯此專案程式碼前使用。"
---

# YouTube Cleaner Codebase Atlas

此專案的自給自足入口與路由器，用於日常工作。它自帶紀律——沒有獨立的 workflow 文件需要閱讀。

## Entry

1. 保留使用者的原始請求。
2. 讀取 `../../../docs/youtube-cleaner_index.md` 一次，然後用一句白話確認此專案的功能。
3. 從索引中只選取相關的模組文件——不要全部讀取。若不熟悉該領域，先縮放到模組地圖，再收窄。
4. 依意圖路由：**know**（解釋、定位、可行性、所有權、行為檢查、審查、重現、profile、CI 失敗、風險）→ Investigate；**change**（任何程式碼編輯）→ Change；混合/不明確 → 先 investigate，再決定。
5. 向前傳遞結論；除非需要尚未收集的上下文，否則不要跨步驟重讀索引或模組文件。

## Investigate（唯讀）

從 atlas 加上最少必要程式碼來回答；區分已確認事實與假設/未知。絕不編輯——若需要修復，在使用者同意後移交給 Change。依問題類型應用紀律：debugging = 重現 → 排序假設 → 二分法；review = 對照 owning 與 boundary 模組閱讀 diff；開放式設計問題 = 一次訪談一個問題，每個附上推薦答案，並與索引及架構決策表對照——標記任何與已記錄職責或邊界矛盾、或重新開啟已記錄決策的提案。

## Change（任何編輯）

判斷紀律層級，然後按比例投入：

- **T0 trivial**（無邏輯變更、可逆、單一檔案）：一行 Before/After；跳過計劃檔；執行最相關的一項檢查。
- **T1 normal**（可控範圍、可逆、診斷明確）：若有便宜的測試縫隙則加入一個聚焦測試；在編輯原始碼前撰寫暫存計劃 `docs/changes/planning/{{DATE}}-{{SLUG}}.md`（`{{DATE}}` = 今天的本地日期，ISO `YYYY-MM-DD`）。
- **T2 hard/risky**（async/stateful bug、跨模組、外部 API、不可逆、效能回歸、診斷不明確）：完整紀律；同樣的計劃檔；通常需要 Decision Gate。

**硬底線：** 不可逆、跨模組、外部 API、或遷移工作至少是 T2。尊重明確的「快一點 / 徹底一點」覆蓋，但絕不低於底線。

**Before / After 關卡**（唯一的確認介面）：
- **Before**：目前狀態與為何需要變更——若是 bug，則是已診斷的根因——用白話說明。
- **After**：將變成什麼狀態，以及如何驗證。

T1/T2 時，在編輯任何檔案前等待明確確認。T0（trivial、可逆、單一檔案）時，陳述一行 Before/After 後直接執行不需等待，然後回報——若 Before 判斷錯誤則可逆。

**Decision Gate** — 當變更會改變模組邊界、外部 API、為不可逆或遷移、或有兩個以上可行方案時：先檢查提案是否與索引或架構決策表中已記錄的內容矛盾或重新開啟——若是，指出並確認該先前決策正在被重新開啟。然後呈現 Context / Options（A/B 含取捨）/ Recommendation，等待選擇後再進入 Before/After。跨模組決策記錄在索引的架構決策表中；模組層級決策記錄在該模組的已知風險中。

編輯後，按層級比例驗證；驗證結果永遠出現在回報中——絕不在檢查失敗時宣稱完成。完成後，將計劃移至 `docs/changes/completed/{{DATE}}/{{SLUG}}.md`，並在當日的 `docs/changes/completed/{{DATE}}/summary.md`（每日工作摘要）中為該變更附加一行條目。僅在模組邊界、所有權、或外部 API 變更時更新 atlas 文件——增量更新，不重新掃描。

## Reporting & delivery

- 回報層級：technical — 在使用者面向的回報中包含模組名稱、檔案路徑與程式碼上下文。
- 交付政策：no commit
- 除非使用者明確要求完整重建，否則不要重新執行 Codebase Atlas 初始化。
