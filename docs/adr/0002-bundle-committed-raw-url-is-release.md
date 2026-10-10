# 打包檔進版控，main 的 raw URL 就是發布通道

腳本從 2025-06-21 `04b5054` 起就放在 repo 根目錄，2026-01-06 `830017c` 起改由 Rollup 從 `src/` 打包產生。使用者從 main 分支的 raw URL 安裝與自動更新（`src/meta.json` 的 `downloadURL`／`updateURL`），所以打包檔 `youtube-homepage-cleaner.user.js` 留在 repo 根目錄、跟著原始碼一起 commit，push 到 main 就是正式發布；GitHub Release 只是附上同一個檔案。後果：打包檔必須和 `src/` 一致，CI 在 build 後用 `git diff --exit-code` 檢查；改 `downloadURL`／`updateURL` 或檔名，已安裝的使用者會收不到更新。

## Considered Options

- 只從 GitHub Release 發布、打包檔不進版控：已安裝的使用者都指向 raw URL，改了就斷掉自動更新。
