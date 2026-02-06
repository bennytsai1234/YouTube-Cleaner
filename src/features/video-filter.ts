import { SELECTORS } from '../data/selectors';
import { Utils } from '../core/utils';
import { Logger } from '../core/logger';
import { FilterStats } from '../core/stats';
import { CustomRuleManager } from './custom-rules';
import { ConfigManager } from '../core/config';
import { I18N } from '../ui/i18n';

// --- 常數定義 ---
const BATCH_SIZE = 50;
const IDLE_TIMEOUT = 500;
const MUTATION_THRESHOLD = 100;  // 超過此數量直接全頁掃描

interface FilterDetail {
    reason: string;
    trigger?: string;
    rule?: string;
}

declare global {
    interface HTMLElement {
        dataset: DOMStringMap & {
            ypChecked?: string;
            ypHidden?: string;
        };
    }
    function requestIdleCallback(callback: (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void, options?: { timeout: number }): number;
}

// --- 延遲載入影片資料 ---
export class LazyVideoData {
    public el: HTMLElement;
    private _title: string | null = null;
    private _channel: string | null = null;
    private _url: string | undefined = undefined;
    private _viewCount: number | null | undefined = undefined;
    private _liveViewers: number | null | undefined = undefined;
    private _timeAgo: number | null | undefined = undefined;
    private _duration: number | null | undefined = undefined;
    private _isShorts: boolean | undefined = undefined;
    private _isMembers: boolean | undefined = undefined;
    private _isUserPlaylist: boolean | undefined = undefined;
    private _isPlaylist: boolean | undefined = undefined;
    
    // 儲存原始文字以便 Log
    public raw = { views: '', time: '', duration: '', viewers: '' };

    constructor(element: HTMLElement) {
        this.el = element;
    }

    get title(): string {
        if (this._title === null) {
            const el = this.el.querySelector<HTMLElement>(SELECTORS.METADATA.TITLE);
            this._title = el?.title?.trim() || el?.textContent?.trim() || '';
        }
        return this._title;
    }

    get channel(): string {
        if (this._channel === null) {
            const el = this.el.querySelector(SELECTORS.METADATA.CHANNEL);
            if (!el) return '';

            let rawName = '';
            if (el.tagName === 'YT-DECORATED-AVATAR-VIEW-MODEL') {
                const avatarBtn = el.querySelector('[aria-label]');
                rawName = avatarBtn?.getAttribute('aria-label') || '';
            } else {
                rawName = el.textContent?.trim() || '';
            }

            this._channel = Utils.cleanChannelName(rawName);
        }
        return this._channel;
    }

    get url(): string {
        if (this._url === undefined) {
             const anchor = this.el.querySelector<HTMLAnchorElement>('a[href*="/watch?"], a[href*="/shorts/"]');
             this._url = anchor ? anchor.href : '';
        }
        return this._url;
    }

    private _parseMetadata(): void {
        if (this._viewCount !== undefined) return;

        const texts = Array.from(this.el.querySelectorAll(SELECTORS.METADATA.TEXT));
        let aria = '';

        for (const sel of SELECTORS.METADATA.TITLE_LINKS) {
            const el = this.el.querySelector<HTMLElement>(`:scope ${sel}`);
            if (el?.ariaLabel) { aria = el.ariaLabel; break; }
        }

        if (texts.length === 0 && aria) {
            this.raw.views = aria;
            this._viewCount = Utils.parseNumeric(aria, 'view');
            this._liveViewers = Utils.parseLiveViewers(aria);
            this._timeAgo = Utils.parseTimeAgo(aria);
            return;
        }

        this._viewCount = null;
        this._liveViewers = null;
        this._timeAgo = null;

        const patterns = I18N.filterPatterns[I18N.lang];

        for (const t of texts) {
            const text = t.textContent || '';
            const isLive = patterns.live.test(text);
            const isView = patterns.views.test(text);
            const isAgo = patterns.ago.test(text);

            if (this._liveViewers === null && isLive) {
                this.raw.viewers = text;
                this._liveViewers = Utils.parseLiveViewers(text);
            }
            if (this._viewCount === null && isView && !isLive) {
                this.raw.views = text;
                this._viewCount = Utils.parseNumeric(text, 'view');
            }
            if (this._timeAgo === null && isAgo) {
                this.raw.time = text;
                this._timeAgo = Utils.parseTimeAgo(text);
            }
        }
    }

    get viewCount(): number | null { this._parseMetadata(); return this._viewCount!; }
    get liveViewers(): number | null { this._parseMetadata(); return this._liveViewers!; }
    get timeAgo(): number | null { this._parseMetadata(); return this._timeAgo!; }

    get duration(): number | null {
        if (this._duration === undefined) {
            const el = this.el.querySelector(SELECTORS.METADATA.DURATION);
            if (el) {
                this.raw.duration = el.textContent?.trim() || '';
                this._duration = Utils.parseDuration(this.raw.duration);
            } else {
                this._duration = null;
            }
        }
        return this._duration;
    }

    get isShorts(): boolean {
        if (this._isShorts === undefined) {
             this._isShorts = !!this.el.querySelector(SELECTORS.BADGES.SHORTS);
        }
        return this._isShorts;
    }

    get isLive(): boolean { return this.liveViewers !== null; }

    get isMembers(): boolean {
        if (this._isMembers === undefined) {
            const pattern = I18N.filterPatterns[I18N.lang]?.members_only || /Members only/i;
            this._isMembers = !!this.el.querySelector(SELECTORS.BADGES.MEMBERS) ||
                pattern.test((this.el as HTMLElement).innerText);
        }
        return this._isMembers;
    }

    get isUserPlaylist(): boolean {
        if (this._isUserPlaylist === undefined) {
            const link = this.el.querySelector<HTMLAnchorElement>('a[href*="list="]');
            if (link && /list=(LL|WL|FL)/.test(link.href)) {
                this._isUserPlaylist = true;
            } else {
                const texts = Array.from(this.el.querySelectorAll(SELECTORS.METADATA.TEXT));
                const ownershipKeywords = /Private|Unlisted|Public|私人|不公開|不公开|公開|公开/i;
                this._isUserPlaylist = texts.some(t => ownershipKeywords.test(t.textContent || ''));
            }
        }
        return this._isUserPlaylist;
    }

    get isPlaylist(): boolean {
        if (this._isPlaylist === undefined) {
            const link = this.el.querySelector('a[href*="list="], [content-id^="PL"]');
            if (link) {
                this._isPlaylist = true;
                return true;
            }
            // 檢查 Badge
            if (this.el.querySelector(SELECTORS.BADGES.MIX)) {
                this._isPlaylist = true;
                return true;
            }
            // 檢查 Title
            const title = this.title;
            const pattern = I18N.filterPatterns[I18N.lang]?.playlist || /Mix/i;
            if (title && pattern.test(title)) {
                this._isPlaylist = true;
                return true;
            }
            this._isPlaylist = false;
        }
        return this._isPlaylist;
    }
}

// --- 影片過濾器 ---
export class VideoFilter {
    private config: ConfigManager;
    private customRules: CustomRuleManager;
    private observer: MutationObserver | null = null;
    private hasValidatedSelectors: boolean = false;

    constructor(config: ConfigManager) {
        this.config = config;
        this.customRules = new CustomRuleManager(config);
    }

    public start(): void {
        if (this.observer) return;
        
        // 優化：使用單一隊列處理 Mutation，由 Filter 內部狀態機管理進度
        this.observer = new MutationObserver((mutations) => this.processMutations(mutations));
        this.observer.observe(document.body, { childList: true, subtree: true });
        
        Logger.info('👁️ VideoFilter observer started');
    }

    public stop(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    private _validateSelectors(elements: HTMLElement[]): void {
        if (this.hasValidatedSelectors || !this.config.get('DEBUG_MODE')) return;
        if (!elements || elements.length === 0) return;

        // 尋找一個已經渲染完成且「可見」的影片元素作為樣本
        const sample = elements.find(el => 
            /VIDEO|LOCKUP|RICH-ITEM/.test(el.tagName) && 
            !el.hidden && 
            el.offsetParent !== null &&
            el.querySelector(SELECTORS.METADATA.TITLE) // 至少要看到標題才算渲染完成
        );
        
        if (!sample) return; // 頁面可能還在載入中，下次 processPage 再試

        this.hasValidatedSelectors = true;
        const issues: string[] = [];

        // Check Critical Selectors
        if (!sample.querySelector(SELECTORS.METADATA.CHANNEL)) issues.push('METADATA.CHANNEL');
        
        if (issues.length > 0) {
            Logger.warn(`⚠️ Selector Health Check Failed: ${issues.join(', ')} not found in active element`, sample);
        } else {
            Logger.info('✅ Selector Health Check Passed');
        }
    }

    get isPageAllowingContent(): boolean {
        const path = window.location.pathname;

        // 頻道頁面判斷
        if (this.config.get('DISABLE_FILTER_ON_CHANNEL') && /^\/(@|channel\/|c\/|user\/)/.test(path)) return true;

        return /^\/feed\/(playlists|library|subscriptions)/.test(path) ||
               /\/playlists$/.test(path);
    }

    public processMutations(mutations: MutationRecord[]): void {
        if (mutations.length > MUTATION_THRESHOLD) {
            this.processPage();
            return;
        }

        const candidates = new Set<HTMLElement>();
        for (const mutation of mutations) {
            for (const node of Array.from(mutation.addedNodes)) {
                if (node.nodeType !== 1) continue;
                const el = node as HTMLElement;
                if (el.matches?.(SELECTORS.allContainers)) candidates.add(el);
                el.querySelectorAll?.(SELECTORS.allContainers).forEach(c => candidates.add(c as HTMLElement));
            }
        }

        if (candidates.size > 0) this._processBatch(Array.from(candidates), 0);
    }

    public processPage(): void {
        const elements = Array.from(document.querySelectorAll<HTMLElement>(SELECTORS.allContainers));
        
        // Debug Health Check (Run once per page load)
        this._validateSelectors(elements);

        const unprocessed = elements.filter(el => !el.dataset.ypChecked);
        if (unprocessed.length === 0) return;

        if ('requestIdleCallback' in window) {
            this._processBatch(unprocessed, 0);
        } else {
            unprocessed.forEach(el => this.processElement(el));
        }
    }

    private _processBatch(elements: HTMLElement[], startIndex: number): void {
        requestIdleCallback((deadline) => {
            let i = startIndex;
            while (i < elements.length && (deadline.timeRemaining() > 0 || deadline.didTimeout)) {
                this.processElement(elements[i]);
                i++;
                if (i - startIndex >= BATCH_SIZE) break;
            }
            if (i < elements.length) this._processBatch(elements, i);
        }, { timeout: IDLE_TIMEOUT });
    }

    public processElement(element: HTMLElement): void {
        // 1. 鎖定容器：所有操作都以最外層容器為準
        const container = element.closest<HTMLElement>('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-playlist-renderer, ytd-rich-section-renderer, ytd-reel-shelf-renderer, ytd-playlist-panel-video-renderer') || element;

        // 2. 基本檢查：容器已檢查過、或已隱藏，則跳過
        if (container.dataset.ypChecked || container.dataset.ypHidden) {
            element.dataset.ypChecked = 'true';
            return;
        }

        // 0. 強制執行原生 hidden 屬性的隱藏 (修復幽靈空白與誤觸問題)
        if (element.hidden || element.hasAttribute('hidden')) {
            return this._hide(element, { reason: 'native_hidden' });
        }

        let filterDetail: FilterDetail | null = null;
        const item = new LazyVideoData(element);

        // --- 第一階段：過濾判定 (收集原因) ---

        // A. 文字規則檢查 (Custom Rules)
        const textMatch = this.customRules.check(element, element.textContent || '');
        if (textMatch) filterDetail = { reason: textMatch.key, trigger: textMatch.trigger };

        // B. 欄位標題過濾
        if (!filterDetail) {
            const sectionMatch = this._checkSectionFilter(element);
            if (sectionMatch) filterDetail = sectionMatch;
        }

        // C. 影片內容過濾 (僅在非豁免頁面執行)
        const isVideoElement = /VIDEO|LOCKUP|RICH-ITEM|PLAYLIST-PANEL-VIDEO/.test(element.tagName);
        if (!filterDetail && isVideoElement && !this.isPageAllowingContent) {
            // ❗ 關鍵修正：如果是播放清單面板中的項目，強制放行
            if (element.tagName === 'YTD-PLAYLIST-PANEL-VIDEO-RENDERER') {
                container.dataset.ypChecked = 'true';
                element.dataset.ypChecked = 'true';
                return;
            }

            filterDetail = filterDetail || this._getFilterKeyword(item);
            filterDetail = filterDetail || this._getFilterChannel(item);
            
            if (!filterDetail && this.config.get('RULE_ENABLES').shorts_item && item.isShorts) {
                filterDetail = { reason: 'shorts_item_js', trigger: 'Shorts video detected' };
            }
            if (!filterDetail && this.config.get('RULE_ENABLES').members_only && item.isMembers) {
                filterDetail = { reason: 'members_only_js' };
            }
            
            filterDetail = filterDetail || this._getFilterView(item);
            filterDetail = filterDetail || this._getFilterDuration(item);
            filterDetail = filterDetail || this._getFilterPlaylist(item);
        }

                // --- 第二階段：執行決策 (白名單審核) ---

        

                if (filterDetail) {

                    // 1. 會員專屬特殊處理：檢查是否有會員白名單護體

                    if (filterDetail.reason === 'members_only' || filterDetail.reason === 'members_only_js') {

                        const compiledMembers = this.config.get('compiledMembersWhitelist');

                        if (compiledMembers && compiledMembers.some(rx => rx.test(item.channel))) {

                            Logger.info(`✅ Keep [Saved by Members Whitelist]: ${item.channel} | ${item.title}`); 

                            this._markChecked(container, element);

                            return;

                        }

                    }

        

                    // 2. 獲取規則優先級

                    const priorities = this.config.get('RULE_PRIORITIES');

                    const isStrong = priorities[filterDetail.reason] === 'strong';

        

                    // 3. 弱規則檢查：檢查普通頻道/關鍵字白名單

                    const whitelistReason = isStrong ? null : this._checkWhitelist(item);

            if (whitelistReason) {
                const savedBy = whitelistReason === 'channel_whitelist' ? 'Channel' : 'Keyword';
                const trigger = filterDetail.trigger ? ` [${filterDetail.trigger}]` : '';
                const ruleInfo = filterDetail.rule ? ` {Rule: ${filterDetail.rule}}` : '';
                
                Logger.info(`✅ Keep [Saved by ${savedBy} Whitelist]: ${item.channel} | ${item.title}
(Originally Triggered: ${filterDetail.reason}${trigger}${ruleInfo})`);
                this._markChecked(container, element);
            } else {
                this._hide(element, filterDetail, item);
            }
            return;
        }

        this._markChecked(container, element);
    }

    private _markChecked(container: HTMLElement, element: HTMLElement): void {
        container.dataset.ypChecked = 'true';
        element.dataset.ypChecked = 'true';
    }

    private _checkSectionFilter(element: HTMLElement): FilterDetail | null {
        // 只檢查 Section 容器
        if (!/RICH-SECTION|REEL-SHELF|SHELF-RENDERER/.test(element.tagName)) return null;
        if (!this.config.get('ENABLE_SECTION_FILTER')) return null;

        // 尋找標題
        let titleText = '';
        for (const sel of SELECTORS.SHELF_TITLE) {
            const titleEl = element.querySelector(sel);
            if (titleEl) {
                titleText = titleEl.textContent?.trim() || '';
                break;
            }
        }

        if (!titleText) return null;

        const compiled = this.config.get('compiledSectionBlacklist');
        if (compiled) {
            for (const rx of compiled) {
                if (rx.test(titleText)) return { reason: 'section_blacklist', trigger: `Title: "${titleText}"`, rule: rx.toString() };
            }
        }

        return null;
    }

    private _checkWhitelist(item: LazyVideoData): string | null {
        const channel = item.channel;
        const title = item.title;
        const config = this.config;

        // 1. 頻道白名單檢查
        const compiledChannels = config.get('compiledChannelWhitelist');
        const rawChannels = config.get('CHANNEL_WHITELIST') || [];
        
        if (channel) {
            // 優先使用編譯後的 Regex
            if (compiledChannels && compiledChannels.length > 0) {
                if (compiledChannels.some(rx => rx.test(channel))) return 'channel_whitelist';
            } else if (rawChannels.length > 0) {
                // 安全回退：直接字串比對
                const cLower = channel.toLowerCase();
                if (rawChannels.some(k => cLower.includes(k.toLowerCase()))) return 'channel_whitelist';
            }
        }

        // 2. 關鍵字白名單檢查
        const compiledKeywords = config.get('compiledKeywordWhitelist');
        const rawKeywords = config.get('KEYWORD_WHITELIST') || [];
        
        if (title) {
            if (compiledKeywords && compiledKeywords.length > 0) {
                if (compiledKeywords.some(rx => rx.test(title))) return 'keyword_whitelist';
            } else if (rawKeywords.length > 0) {
                const tLower = title.toLowerCase();
                if (rawKeywords.some(k => tLower.includes(k.toLowerCase()))) return 'keyword_whitelist';
            }
        }

        return null;
    }

    private _getFilterKeyword(item: LazyVideoData): FilterDetail | null {
        if (!this.config.get('ENABLE_KEYWORD_FILTER') || !item.title) return null;

        const compiled = this.config.get('compiledKeywords');
        if (this.config.get('ENABLE_REGION_CONVERT') && compiled) {
            for (const rx of compiled) {
                if (rx.test(item.title)) return { reason: 'keyword_blacklist', trigger: `Title: "${item.title}"`, rule: rx.toString() };
            }
        } else {
            const title = item.title.toLowerCase();
            const rawList = this.config.get('KEYWORD_BLACKLIST');
            for (const k of rawList) {
                if (title.includes(k.toLowerCase())) return { reason: 'keyword_blacklist', trigger: `Keyword: "${k}"` };
            }
        }
        return null;
    }

    private _getFilterChannel(item: LazyVideoData): FilterDetail | null {
        if (!this.config.get('ENABLE_CHANNEL_FILTER') || !item.channel) return null;

        const compiled = this.config.get('compiledChannels');
        if (this.config.get('ENABLE_REGION_CONVERT') && compiled) {
            for (const rx of compiled) {
                if (rx.test(item.channel)) return { reason: 'channel_blacklist', trigger: `Channel: "${item.channel}"`, rule: rx.toString() };
            }
        } else {
            const channel = item.channel.toLowerCase();
            const rawList = this.config.get('CHANNEL_BLACKLIST');
            for (const k of rawList) {
                if (channel.includes(k.toLowerCase())) return { reason: 'channel_blacklist', trigger: `Channel Keyword: "${k}"` };
            }
        }
        return null;
    }

    private _getFilterView(item: LazyVideoData): FilterDetail | null {
        if (!this.config.get('ENABLE_LOW_VIEW_FILTER') || item.isShorts) return null;

        const th = this.config.get('LOW_VIEW_THRESHOLD');
        const grace = this.config.get('GRACE_PERIOD_HOURS') * 60;

        if (item.isLive && item.liveViewers !== null && item.liveViewers < th) {
            return { reason: 'low_viewer_live', trigger: `Viewers: ${item.liveViewers} < Threshold: ${th} | Raw: "${item.raw.viewers}"` };
        }

        if (!item.isLive && item.viewCount !== null && item.timeAgo !== null &&
            item.timeAgo > grace && item.viewCount < th) {
            return { reason: 'low_view', trigger: `Views: ${item.viewCount} < Threshold: ${th} | Age: ${Math.floor(item.timeAgo/60)}h (Grace: ${this.config.get('GRACE_PERIOD_HOURS')}h) | Raw: "${item.raw.views}"` };
        }
        return null;
    }

    private _getFilterDuration(item: LazyVideoData): FilterDetail | null {
        if (!this.config.get('ENABLE_DURATION_FILTER') || item.isShorts || item.duration === null) return null;

        const min = this.config.get('DURATION_MIN');
        const max = this.config.get('DURATION_MAX');

        if (min > 0 && item.duration < min) {
            return { reason: 'duration_filter', trigger: `Duration: ${item.duration}s < Min: ${min}s | Raw: "${item.raw.duration}"` };
        }
        if (max > 0 && item.duration > max) {
            return { reason: 'duration_filter', trigger: `Duration: ${item.duration}s > Max: ${max}s | Raw: "${item.raw.duration}"` };
        }
        return null;
    }

    private _getFilterPlaylist(item: LazyVideoData): FilterDetail | null {
        if (!this.config.get('RULE_ENABLES').recommended_playlists || !item.isPlaylist) return null;
        if (item.isUserPlaylist) return null;
        return { reason: 'recommended_playlists', trigger: 'Detected as algorithmic Mix/Playlist' };
    }

    private _hide(element: HTMLElement, detail: FilterDetail, item: LazyVideoData | null = null): void {
        const reason = detail.reason;
        const trigger = detail.trigger ? ` [${detail.trigger}]` : '';
        const ruleInfo = detail.rule ? ` {Rule: ${detail.rule}}` : '';

        const container = element.closest<HTMLElement>('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-playlist-renderer, ytd-rich-section-renderer, ytd-reel-shelf-renderer, ytd-playlist-panel-video-renderer') || element;
        
        // 如果已經隱藏過了，直接標記並退出，防止重複 Log
        if (container.dataset.ypHidden) {
            element.dataset.ypChecked = 'true';
            return;
        }

        container.style.cssText = 'display: none !important; visibility: hidden !important;';
        container.dataset.ypHidden = reason;
        container.dataset.ypChecked = 'true';
        if (container !== element) {
            element.dataset.ypHidden = reason;
            element.dataset.ypChecked = 'true';
        }
        FilterStats.record(reason);

        // ❗ 關鍵修正：隱藏 native_hidden 的日誌，減少控制台雜訊
        if (reason === 'native_hidden') return;

        // Rich Logging for Debug
        const logMsg = `Hidden [${reason}]${trigger}${ruleInfo}`;
        if (item && item.url) {
            Logger.info(`${logMsg}
Title: ${item.title}
Channel: "${item.channel}"
URL: ${item.url}`);
        } else {
            Logger.info(logMsg);
        }
    }

    public clearCache(): void {
        // 徹底還原所有被隱藏或檢查過的元素狀態，確保白名單能正確生效
        document.querySelectorAll<HTMLElement>('[data-yp-checked], [data-yp-hidden]').forEach(el => {
            if (el.dataset.ypHidden) {
                el.style.display = '';
                el.style.visibility = '';
                delete el.dataset.ypHidden;
            }
            delete el.dataset.ypChecked;
        });
        this.hasValidatedSelectors = false;
    }

    public reset(): void {
        document.querySelectorAll<HTMLElement>('[data-yp-hidden]').forEach(el => {
            el.style.display = '';
            delete el.dataset.ypHidden;
            delete el.dataset.ypChecked;
        });
        FilterStats.reset();
    }
}
