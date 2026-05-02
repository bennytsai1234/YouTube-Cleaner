# Subscription Protection

## 目前狀態

- `src/features/subscription-manager.ts` 從 YouTube 側邊欄或 `/feed/subscriptions` 掃描訂閱頻道，保存在 `SUBSCRIBED_CHANNELS`。
- `FilterEngine.applyWhitelistDecision()` 使用 `SubscriptionManager.isSubscribed()` 保護已訂閱頻道的低觀看數與低直播觀看數規則。
- 訂閱保護預設啟用，並由 `ENABLE_SUBSCRIPTION_PROTECTION` 控制。

## 範圍

- 主要檔案：`src/features/subscription-manager.ts`。
- 邊界檔案：`src/features/filter-engine.ts`、`src/core/config.ts`、`src/ui/menu.ts`、`src/ui/list-manager.ts`。
- 相關測試：`test/filter-engine-test.ts`、`test/config-manager-test.ts`、白名單與 low views e2e。

## 上游依賴

- YouTube 側邊欄 DOM：`ytd-guide-renderer #sections`、`ytd-guide-section-renderer`、`a#endpoint`、`#main-link`。
- `/feed/subscriptions` 的 `ytd-browse` 主內容。
- `Utils.cleanChannelName()` 保證掃描名稱與影片卡片名稱一致。
- `ConfigManager` 提供 `SUBSCRIBED_CHANNELS`、保護開關與儲存。

## 下游影響

- 只影響 low view 與 low live viewer 類規則豁免；不應放行 keyword blacklist、channel blacklist、duration 或 members-only。
- 掃描結果會顯示在 UI 名單管理中，可被使用者查看或清空。
- `VideoFilter.start()`、`stop()` 與 `scanSubscriptions()` 管理 subscription observer lifecycle。

## 關鍵流程

- constructor 從設定載入最多 500 筆訂閱頻道，超過時截斷並寫回設定。
- `init()` 嘗試 static scan、建立 sidebar observer，並做初始 `scan()`。
- `scan(force)` 受 15 分鐘 interval 限制；force 由 sidebar observer 觸發。
- `_updateList()` 增量加入新頻道，不因一次掃描不完整而刪除舊項目。

## 常見變更入口

- 訂閱頻道沒有被保護：看掃描 container selector、`Utils.cleanChannelName()` 與 `isSubscribed()`。
- 訂閱名單過大或儲存污染：看 `MAX_SUBSCRIPTIONS` 與 `_updateList()`。
- 想改保護範圍：先看 `FilterEngine.applyWhitelistDecision()` 的 `isLowViewRule` guard。
- 側邊欄展開後未更新：看 `setupObserver()` 的 debounce 與 selector。

## 已知風險

- YouTube 側邊欄不是完整訂閱資料來源；掃描採增量策略避免誤刪。
- 頻道名稱清洗若改變，舊 cache 可能和新抽取名稱不一致。
- 讓訂閱保護豁免更多規則會提高誤放行風險，尤其是使用者明確加入的黑名單。

## 不要做

- 不要把訂閱保護擴大到所有弱規則，除非 product 規則明確要求並補測試。
- 不要在一次掃描少於 cache 時自動刪除既有訂閱。
- 不要保存超過上限的大量頻道資料到 GM storage。
