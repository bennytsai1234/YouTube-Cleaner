# Subscription Protection

## 目前責任

- 負責訂閱頻道探索、已訂閱頻道快取、observer lifecycle，以及對訂閱頻道的低觀看數保護。
- 已訂閱頻道被錯誤隱藏或訂閱掃描過期時，從這裡開始。

## 範圍

- `src/features/subscription-manager.ts`
- Config 欄位 `ENABLE_SUBSCRIPTION_PROTECTION` 與 `SUBSCRIBED_CHANNELS`
- `FilterEngine.applyWhitelistDecision()` 中的使用點

## 依賴與影響

- 依賴 `ConfigManager`、`Logger`、`Utils.cleanChannelName` 與 YouTube guide/sidebar DOM。
- 透過 `FilterEngine` 影響 low-view 與 live-viewer filter outcome。
- 透過 config 將找到的訂閱頻道寫回 Tampermonkey storage。

## 關鍵流程

- constructor 載入 stored channels，套用 `MAX_SUBSCRIPTIONS` 上限並正規化狀態。
- `init()` 嘗試 static scan、建立 debounced observer，並執行 initial scan。
- `scan()` 一般最多 15 分鐘執行一次，force 時可立即掃描；資料來源是 subscriptions feed 或 guide section。
- `isSubscribed()` 只在保護啟用且清理後 channel name 命中 cache 時回傳 true。

## 變更入口

- scanning、caching、limits、observer：`src/features/subscription-manager.ts`。
- 修改哪些規則可被訂閱保護 bypass：`src/features/filter-engine.ts`。
- 儲存資料形狀變更：檢查 config import/export。

## 變更路線

- DOM selector 變更需對照公開 YouTube navigation/sidebar 行為。
- Protection scope 變更需要 filter-engine tests 覆蓋 low-view、keyword、channel blacklist 與 strong rules。
- Storage shape 變更需要 review SettingsIO 相容性。

## 已知風險

- Sidebar 可能尚未載入、收合或不完整，因此 cache 採增量更新。
- 過度寬鬆的 protection 可能誤放行使用者黑名單。
- 500 channel 上限避免 storage 無限成長，但達上限後會略過新發現頻道。

## 參考備註

- 無。

## 不要做

- 沒有明確產品決策時，不要讓 subscription protection bypass strong rules。
- 不要在未證明 YouTube 資料完整前，把增量更新改成 destructive full replacement。
- 不要用未清理的 raw channel name 做匹配儲存。
