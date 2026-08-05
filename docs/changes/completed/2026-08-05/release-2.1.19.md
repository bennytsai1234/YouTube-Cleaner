# Release 2.1.19（會員招募區塊修正）

## Task Type

Release & Bug Fix

## Confirmed Before

- 目前版本為 `2.1.18`，最新正式 GitHub Release 為 `v2.1.18`。
- 工作樹乾淨，上一個會員招募區塊修正已推送至 `main`。
- GitHub CLI 已登入，遠端為 `https://github.com/bennytsai1234/YouTube-Cleaner.git`。

## Confirmed After

- 版本升級至 `2.1.19`。
- 更新 `package.json`、`package-lock.json`、`src/meta.json`、README badge、CHANGELOG 與 userscript metadata。
- 重新打包生成 `youtube-homepage-cleaner.user.js`。
- 完成完整驗證、一致性檢查與 selector 回歸測試。
- 推送 `main` 與 `v2.1.19` tag。
- 建立 GitHub Release `v2.1.19`。

## Release Notes

- 隱藏首頁動態載入的會員招募／推薦頻道區塊。
- 使用結構 selector 避免 YouTube 文字內容延遲載入造成過濾遺漏。
- 保持一般 `YouTube 精選` shelf 的命中範圍不變。

## Verification

- `TMPDIR=/tmp/youtube-cleaner-tsx npm run verify` 通過。
- typecheck、lint、全部單元測試、build、release consistency 通過。
- selector 測試：56 通過、0 失敗。
- `git diff --check` 通過。
- 遠端 `main`、`v2.1.19` tag 與 GitHub Release 對位確認。

## Rollback

若內容需要修正，發布新的 patch 版本；不刪除已公開的 `v2.1.19` tag 或 release。
