import { ConfigManager } from '../core/config';
import { Logger } from '../core/logger';
import { Utils } from '../core/utils';

export class SubscriptionManager {
    private config: ConfigManager;
    private subscribedSet: Set<string> = new Set();
    private lastScanTime = 0;
    private SCAN_INTERVAL = 1000 * 60 * 30; // 每小時最多主動掃描兩次

    constructor(config: ConfigManager) {
        this.config = config;
        this.subscribedSet = new Set(this.config.get('SUBSCRIBED_CHANNELS'));
    }

    /**
     * 掃描側邊欄提取訂閱頻道
     * @param force 是否強制掃描（忽略間隔）
     */
    public async scan(force = false): Promise<void> {
        const now = Date.now();
        if (!force && now - this.lastScanTime < this.SCAN_INTERVAL) return;

        // 延遲執行，確保 YouTube 側邊欄 DOM 已渲染
        await new Promise(resolve => setTimeout(resolve, 3000));

        const subSection = Array.from(document.querySelectorAll('ytd-guide-section-renderer'))
            .find(section => section.querySelector('a[href="/feed/subscriptions"]'));

        if (!subSection) {
            Logger.info('📡 SubscriptionManager: Sidebar not found or collapsed, skipping scan');
            return;
        }

        const channelItems = subSection.querySelectorAll('ytd-guide-entry-renderer');
        const foundChannels = new Set<string>();
        const excludes = ['顯示更多', '顯示較少', 'Show more', 'Show less'];

        channelItems.forEach(item => {
            const link = item.querySelector<HTMLAnchorElement>('a#endpoint');
            if (!link) return;

            const href = link.getAttribute('href') || '';
            if (!href.startsWith('/@') && !href.startsWith('/channel/')) return;

            const titleEl = item.querySelector('.title, #formatted-string');
            const name = titleEl?.textContent?.trim() || link.getAttribute('title')?.trim();

            if (name && !excludes.includes(name)) {
                foundChannels.add(name);
            }
        });

        if (foundChannels.size > 0) {
            this._updateList(foundChannels);
            this.lastScanTime = now;
            Logger.info(`📡 SubscriptionManager: Successfully updated ${foundChannels.size} subscribed channels`);
        }
    }

    /**
     * 檢查是否為已訂閱頻道
     */
    public isSubscribed(channelName: string): boolean {
        if (!channelName) return false;
        // 優先精確匹配，未來可考慮模糊匹配
        return this.subscribedSet.has(channelName);
    }

    private _updateList(newList: Set<string>): void {
        const oldSize = this.subscribedSet.size;
        // 增量更新：保留舊的，加入新的（防止 YouTube 因為分頁沒加載完而漏掉）
        newList.forEach(name => this.subscribedSet.add(name));

        if (this.subscribedSet.size !== oldSize) {
            this.config.set('SUBSCRIBED_CHANNELS', Array.from(this.subscribedSet));
        }
    }
}
