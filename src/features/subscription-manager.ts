import { ConfigManager } from '../core/config';
import { Logger } from '../core/logger';
import { Utils } from '../core/utils';

declare global {
    interface Window {
        ytInitialData?: {
            entries?: unknown[];
        };
    }
}

export class SubscriptionManager {
    private config: ConfigManager;
    private subscribedSet: Set<string> = new Set();
    private lastScanTime = 0;
    private observer: MutationObserver | null = null;
    private SCAN_INTERVAL = 1000 * 60 * 15; // 每 15 分鐘最多主動掃描一次
    private MAX_SUBSCRIPTIONS = 500;

    constructor(config: ConfigManager) {
        this.config = config;
        const savedChannels = this.config.get('SUBSCRIBED_CHANNELS');
        const storedChannels = Array.isArray(savedChannels) ? savedChannels.slice(0, this.MAX_SUBSCRIPTIONS) : [];
        this.subscribedSet = new Set(storedChannels);
        if (Array.isArray(savedChannels) && storedChannels.length !== savedChannels.length) {
            this.config.set('SUBSCRIBED_CHANNELS', storedChannels);
        }
    }

    /**
     * 啟動監聽機制
     */
    public init(): void {
        this.tryStaticScan();
        this.setupObserver();
        this.scan(); // 初始嘗試掃描
    }

    public destroy(): void {
        this.observer?.disconnect();
        this.observer = null;
    }

    /**
     * 嘗試從 YouTube 初始數據中提取
     */
    private tryStaticScan(): void {
        try {
            const data = window.ytInitialData;
            if (!data?.entries) return;
            // 遍歷 Guide 數據結構提取頻道 (這部分結構較深且常變動，作為輔助)
        } catch { /* ignore */ }
    }

    /**
     * 設置監聽器，一旦側邊欄展開或載入就掃描
     */
    private setupObserver(): void {
        if (this.observer) return;
        this.observer = new MutationObserver(Utils.debounce(() => {
            const sidebar = document.querySelector('ytd-guide-renderer #sections');
            if (sidebar && sidebar.children.length > 0) {
                this.scan(true);
            }
        }, 2000));

        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * 掃描側邊欄提取訂閱頻道
     */
    public async scan(force = false): Promise<void> {
        if (this.config.get('ENABLE_SUBSCRIPTION_PROTECTION') === false) return;

        const now = Date.now();
        if (!force && now - this.lastScanTime < this.SCAN_INTERVAL) return;

        // 如果在訂閱頁面，直接從主內容區提取更準確
        const isSubPage = window.location.pathname === '/feed/subscriptions';
        const container = isSubPage 
            ? document.querySelector('ytd-browse') 
            : Array.from(document.querySelectorAll('ytd-guide-section-renderer'))
                .find(section => section.querySelector('a[href="/feed/subscriptions"]'));

        if (!container) return;

        const foundChannels = new Set<string>();
        const channelLinks = container.querySelectorAll<HTMLAnchorElement>('a#endpoint, a.ytd-guide-entry-renderer, #main-link');
        
        channelLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            if (!href.startsWith('/@') && !href.startsWith('/channel/')) return;

            // 效能優化：使用 textContent 代替 innerText 避免 Reflow
            const rawName = link.textContent?.split('\n')[0].trim() || link.getAttribute('title')?.trim();
            const name = Utils.cleanChannelName(rawName); // 統一清洗名稱確保匹配一致性

            if (name && !['顯示更多', '顯示較少', 'Show more', 'Show less', 'ShowMore', 'ShowLess'].includes(name)) {
                foundChannels.add(name);
            }
        });

        if (foundChannels.size > 0) {
            this._updateList(foundChannels);
            this.lastScanTime = now;
            if (force) Logger.info(`📡 SubscriptionManager: Dynamic update found ${foundChannels.size} channels`);
        }
    }

    /**
     * 檢查是否為已訂閱頻道
     */
    public isSubscribed(channelName: string): boolean {
        if (this.config.get('ENABLE_SUBSCRIPTION_PROTECTION') === false) return false;
        if (!channelName) return false;
        // 優先精確匹配，未來可考慮模糊匹配
        return this.subscribedSet.has(channelName);
    }

    private _updateList(newList: Set<string>): void {
        const oldSize = this.subscribedSet.size;
        // 增量更新：保留舊的，加入新的（防止 YouTube 因為分頁沒加載完而漏掉）
        for (const name of newList) {
            if (this.subscribedSet.size >= this.MAX_SUBSCRIPTIONS && !this.subscribedSet.has(name)) {
                Logger.warn(`SubscriptionManager: reached ${this.MAX_SUBSCRIPTIONS} channel limit, skip "${name}"`);
                continue;
            }
            this.subscribedSet.add(name);
        }

        if (this.subscribedSet.size !== oldSize) {
            this.config.set('SUBSCRIBED_CHANNELS', Array.from(this.subscribedSet));
        }
    }
}
