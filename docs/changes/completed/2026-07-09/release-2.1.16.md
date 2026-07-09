# Release 2.1.16 (Timestamp Seek Fix)

## Task Type

Release & Bug Fix

## Confirmed Before

- 目前版本為 2.1.15。
- YouTube 影片下方的留言中，如果點擊同影片的時間軸跳轉連結（例如 `t=123s` 且影片 ID 與當前相同），會被 InteractionEnhancer 誤判為其他影片連結，進而在新分頁中開啟，無法在原分頁直接跳轉時間軸。

## Confirmed After

- 版本升級至 2.1.16。
- 套用 `timestamp-seek-fix.patch`，在 `InteractionEnhancer` 中新增 `isSameVideoTimestampSeek` 判斷：若點擊的是同影片的時間軸連結，則直接不開新分頁，保留 YouTube 原生跳轉行為。
- 補齊 `test/interaction-test.ts` 相關單元測試。
- 重新打包生成 `youtube-homepage-cleaner.user.js`，包含最新的版本資訊。
- 完成 `npm run verify` 所有測試與一致性檢查。

## Expected File Scope

- `package.json`
- `package-lock.json`
- `src/meta.json`
- `README.md`
- `CHANGELOG.md`
- `src/features/interaction.ts`
- `test/interaction-test.ts`
- `youtube-homepage-cleaner.user.js`

## Verification

- `npm run verify` 通過，且發布一致性檢查（check-release-consistency.js）無誤。

## Rollback

- `git reset --hard HEAD`
