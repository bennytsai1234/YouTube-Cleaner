---
name: youtube-cleaner-atlas
description: "YouTube Cleaner 的 Codebase Atlas：導覽地圖與變更紀律。調查或修改此專案程式碼前使用。"
---

# YouTube Cleaner Codebase Atlas

這是本專案日常工作的自足入口與路由器。它內建調查與變更紀律，不需要另外讀 workflow 文件。

## Entry

1. 保留使用者的原始需求。
2. 先讀 `../../../docs/youtube_cleaner_index.md` 一次，然後用一句白話確認這個專案的功能。
3. 只挑選 index 指向的相關模組文件；不要全部讀完。若不熟悉範圍，先用模組摘要縮小，再讀一到兩個相關模組。
4. 依意圖路由：**知道**（解釋、定位、可行性、所有權、行為檢查、審查、重現、效能分析、CI 失敗、風險）→ Investigate；**改變**（任何程式碼或文件編輯）→ Change；混合或不明確 → 先 Investigate，再判斷是否需要 Change。
5. 組合任務時，把已得到的結論往下傳；除非缺少必要脈絡，否則不要重讀 index 或同一份模組文件。

## Investigate（唯讀）

從 atlas 加上最少必要程式碼回答；明確分開已確認事實、合理推論與未知。不要編輯檔案；若需要修復，先把調查結論交給 Change，並等使用者同意。依問題套用紀律：除錯 = 重現 → 排序假設 → 驗證；審查 = 對 diff 讀 owning 與 boundary 模組；設計問題 = 一次問一個問題，並附建議答案。

## Change（任何編輯）

先判斷紀律層級，再縮放工作量：

- **T0 trivial**（無邏輯變更、可逆、單檔）：一行 Before/After；跳過計畫檔；跑最相關的一個檢查。
- **T1 normal**（範圍集中、可逆、診斷清楚）：若有便宜且正確的 seam，補一個聚焦測試；編輯 source 前先寫 scratch plan：`docs/changes/planning/{{DATE}}-{{SLUG}}.md`。
- **T2 hard/risky**（非同步或狀態 bug、多模組、外部 API、不可逆、效能風險、診斷不確定）：完整紀律；同樣寫 plan；通常需要 Decision Gate。

**硬性下限**：不可逆、跨模組、外部 API、migration 類工作至少是 T2。可接受使用者要求「快一點」或「徹底一點」，但不能低於硬性下限。

**Before / After gate** 是唯一確認介面；任何編輯前必須等待使用者明確確認：

- **Before**：目前狀態與已診斷的根因，用白話說明。
- **After**：修改後會成為什麼狀態，以及如何驗證。

**Decision Gate**：若變更會改模組邊界、外部 API、不可逆或 migration，或存在兩個以上合理方案，先提出 Context / Options（含取捨）/ Recommendation，等待使用者選擇，再進入 Before/After。跨模組決策記到 index 的 Architecture Decisions 表；模組層級決策記到對應模組的 Known Risks。

編輯後按層級驗證；驗證結果一定要出現在回報中，不得在檢查失敗時宣稱完成。完成後將 plan 移到 `docs/changes/completed/{{DATE}}-{{SLUG}}.md`。只有當模組邊界、所有權或外部 API 改變時，才增量更新相關 atlas 文件，不做完整重掃。

## Reporting & delivery

- Reporting level: plain。使用者面向報告只用白話，不提模組名、檔案路徑或程式片段；驗證結果仍需明確報告。
- Delivery policy: commit and push。
- 除非使用者明確要求完整 rebuild、refresh、regenerate 或 rescan，否則不要重新執行 Codebase Atlas 初始化。
