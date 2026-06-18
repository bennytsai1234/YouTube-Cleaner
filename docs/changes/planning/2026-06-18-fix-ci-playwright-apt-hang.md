# 修復 CI 安裝 Playwright 時卡住

## 任務類型
Bug

## 已確認的 Before
`YouTube Cleaner CI`（push 觸發）與 `E2E YouTube Selector Health Check`（排程觸發）兩個工作流程，在「Install Playwright Browsers」步驟執行 `npx playwright install --with-deps chromium` 時會卡住，最終被系統依各自的逾時上限強制取消（前者卡到 job 的 15 分鐘上限；後者因為 job 沒有設定 `timeout-minutes`，卡到 GitHub 預設的 6 小時上限才停止）。

在沙箱環境重現確認：`--with-deps` 會觸發 `apt-get update`，更新對象包含執行環境內建的 `deadsnakes`（Python PPA）與 `ondrej/php`（PHP PPA）兩個第三方來源，這兩個來源目前無法連線（沙箱中為立即 403，推測在 GitHub Actions 的網路條件下表現為長時間卡住而非快速失敗）。移除這兩個來源後，`apt-get` 在沙箱中順利完成，證實它們是卡住的根因；專案本身的程式碼與相關 commit 範圍內沒有變更，問題來自外部執行環境。

## 已確認的 After
在兩個工作流程的「Install Playwright Browsers」步驟之前，新增一個步驟移除 `deadsnakes` 與 `ondrej/php` 兩個來源，讓 `apt-get update` 只對接專案實際需要的官方 Ubuntu 來源。另外為 `e2e-selector-check.yml` 的 job 補上 `timeout-minutes`（與 `ci.yml` 對齊的合理上限），避免未來若再卡住會被迫等到 GitHub 預設的 6 小時上限。

## 預期檔案範圍
- `.github/workflows/ci.yml`
- `.github/workflows/e2e-selector-check.yml`

## 驗證步驟
- 沙箱重現：移除問題來源前後各跑一次 `npx playwright install --with-deps chromium`，確認移除後 apt 安裝階段成功完成（已完成，屬於診斷階段）。
- 推送後，透過 `workflow_dispatch` 實際觸發 `e2e-selector-check.yml`，確認「Install Playwright Browsers」步驟能真正成功完成、不再卡住。
- 確認兩個工作流程的 YAML 語法正確（之後在 Actions 上能被解析、實際排程）。

## 回滾路徑
還原此次 commit，兩個工作流程檔案恢復原樣；新增的步驟為純增量變更，不影響其他既有步驟。
