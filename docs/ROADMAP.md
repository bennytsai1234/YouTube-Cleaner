# Roadmap

本專案目前的方向是 **持續優化現有功能**，不預先規劃大型新功能。目標是在 YouTube 持續改版的情況下，仍維持穩定、快速、易維護，並守住「只保留真正必要的過濾與體驗改善」這個核心定位。

---

## 維護方向

- 維持現有過濾規則的穩定性與準確度
- 配合 YouTube DOM 結構變更，持續修正 selector 與判斷邏輯
- 優化 MutationObserver、批次處理與 DOM 查詢效能
- 降低誤判與過度過濾
- 補強單元與 E2E 測試覆蓋
- 改善文件，讓設定、除錯、發布流程更清楚
- 維持腳本輕量，避免不必要的外部依賴或複雜 UI

## 維護基線

- `npm run verify` 為主要驗證入口，涵蓋 typecheck、lint、單元測試、build、版本一致性檢查、E2E
- `npm run check:release` 驗證 `package.json`、`package-lock.json`、`src/meta.json`、README badge 與 userscript 的版本/URL 一致
- Selector 風險分兩層：單元測試檢查語法與來源；Playwright `test:e2e:selectors` 檢查真實 YouTube DOM
- 設定匯出/匯入需避免 runtime cache 汙染，並拒絕明顯錯誤的設定型別

## 優先順序

1. 修正既有功能失效或誤過濾
2. 改善效能與長時間使用穩定性
3. 補強測試與文件
4. 在不顯著增加維護成本的前提下，小幅改善使用體驗

## 新功能評估原則

新功能不是目前主要方向。若未來要加入，需同時符合：

- 能明確改善現有使用體驗
- 不顯著增加維護成本
- 不依賴不穩定或高風險的 YouTube 內部 API
- 預設關閉或能被使用者清楚控制
