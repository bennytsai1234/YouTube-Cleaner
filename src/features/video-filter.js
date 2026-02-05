import { SELECTORS } from '../data/selectors.js';
import { Utils } from '../core/utils.js';
import { Logger } from '../core/logger.js';
import { FilterStats } from '../core/stats.js';
import { CustomRuleManager } from './custom-rules.js';

// --- 常數定義 ---
const BATCH_SIZE = 50;
const IDLE_TIMEOUT = 500;
const MUTATION_THRESHOLD = 100;  // 超過此數量直接全頁掃描

// --- 延遲載入影片資料 ---
export class LazyVideoData {
    constructor(element) {
        this.el = element;
        this._title = null;
        this._channel = null;
        this._viewCount = undefined;
        this._liveViewers = undefined;
        this._timeAgo = undefined;
        this._duration = undefined;
        // 儲存原始文字以便 Log
        this.raw = { views: '', time: '', duration: '', viewers: '' };
    }

    get title() {
        if (this._title === null) {
            const el = this.el.querySelector(SELECTORS.METADATA.TITLE);
            this._title = el?.title?.trim() || el?.textContent?.trim() || '';
        }
        return this._title;
    }

    get channel() {
        if (this._channel === null) {
            this._channel = this.el.querySelector(SELECTORS.METADATA.CHANNEL)?.textContent?.trim() || '';
        }
        return this._channel;
    }

    get url() {
        if (this._url === undefined) {
             const anchor = this.el.querySelector('a[href*="/watch?"], a[href*="/shorts/"]');
             this._url = anchor ? anchor.href : '';
        }
        return this._url;
    }

    _parseMetadata() {
        if (this._viewCount !== undefined) return;

        const texts = Array.from(this.el.querySelectorAll(SELECTORS.METADATA.TEXT));
        let aria = '';

        for (const sel of SELECTORS.METADATA.TITLE_LINKS) {
            const el = this.el.querySelector(`:scope ${sel}`);
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

        for (const t of texts) {
            const text = t.textContent;
            const isLive = /正在觀看|觀眾|watching|viewers/i.test(text);
            const isView = /view|觀看|次/i.test(text);
            const isAgo = /ago|前/i.test(text);

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

    get viewCount() { this._parseMetadata(); return this._viewCount; }
    get liveViewers() { this._parseMetadata(); return this._liveViewers; }
    get timeAgo() { this._parseMetadata(); return this._timeAgo; }

    get duration() {
        if (this._duration === undefined) {
            const el = this.el.querySelector(SELECTORS.METADATA.DURATION);
            if (el) {
                this.raw.duration = el.textContent.trim();
                this._duration = Utils.parseDuration(this.raw.duration);
            } else {
                this._duration = null;
            }
        }
        return this._duration;
    }

    get isShorts() {
        if (this._isShorts === undefined) {
             this._isShorts = !!this.el.querySelector(SELECTORS.BADGES.SHORTS);
        }
        return this._isShorts;
    }

    get isLive() { return this.liveViewers !== null; }

    get isMembers() {
        if (this._isMembers === undefined) {
            this._isMembers = !!this.el.querySelector(SELECTORS.BADGES.MEMBERS) ||
                /會員專屬|Members only/.test(this.el.innerText);
        }
        return this._isMembers;
    }

    get isUserPlaylist() {
        if (this._isUserPlaylist === undefined) {
            const link = this.el.querySelector('a[href*="list="]');
            if (link && /list=(LL|WL|FL)/.test(link.href)) {
                this._isUserPlaylist = true;
            } else {
                const texts = Array.from(this.el.querySelectorAll(SELECTORS.METADATA.TEXT));
                const ownershipKeywords = /Private|Unlisted|Public|私人|不公開|不公开|公開|公开/i;
                this._isUserPlaylist = texts.some(t => ownershipKeywords.test(t.textContent));
            }
        }
        return this._isUserPlaylist;
    }

    get isPlaylist() {
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
            if (title && /^(合輯|Mix)/i.test(title)) {
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
    constructor(config) {
        this.config = config;
        this.customRules = new CustomRuleManager(config);
        this.observer = null;
        this.hasValidatedSelectors = false;
    }

    start() {
        if (this.observer) return;
        
        // 優化：使用單一隊列處理 Mutation，由 Filter 內部狀態機管理進度
        this.observer = new MutationObserver((mutations) => this.processMutations(mutations));
        this.observer.observe(document.body, { childList: true, subtree: true });
        
        Logger.info('👁️ VideoFilter observer started');
    }

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    _validateSelectors(elements) {
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
        let issues = [];

        // Check Critical Selectors
        if (!sample.querySelector(SELECTORS.METADATA.CHANNEL)) issues.push('METADATA.CHANNEL');
        
        if (issues.length > 0) {
            Logger.warn(`⚠️ Selector Health Check Failed: ${issues.join(', ')} not found in active element`, sample);
        } else {
            Logger.info('✅ Selector Health Check Passed');
        }
    }

    get isPageAllowingContent() {
        // 在這些頁面不執行內容過濾 (但仍執行廣告過濾)
        // 1. /feed/playlists (播放清單頁)
        // 2. /feed/library (媒體庫)
        // 3. /feed/subscriptions (訂閱內容) - 通常使用者想看所有訂閱
        // 4. /@xxx (頻道首頁)、/channel/xxx 等頻道頁面 - 使用者主動瀏覽特定頻道
        const path = window.location.pathname;

        // 頻道頁面判斷
        if (this.config.get('DISABLE_FILTER_ON_CHANNEL') && /^\/(@|channel\/|c\/|user\/)/.test(path)) return true;

        return /^\/feed\/(playlists|library|subscriptions)/.test(path) ||
               /\/playlists$/.test(path);
    }

    processMutations(mutations) {
        if (mutations.length > MUTATION_THRESHOLD) {
            this.processPage();
            return;
        }

        const candidates = new Set();
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                if (node.matches?.(SELECTORS.allContainers)) candidates.add(node);
                node.querySelectorAll?.(SELECTORS.allContainers).forEach(c => candidates.add(c));
            }
        }

        if (candidates.size > 0) this._processBatch(Array.from(candidates), 0);
    }

    processPage() {
        const elements = Array.from(document.querySelectorAll(SELECTORS.allContainers));
        
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

    _processBatch(elements, startIndex) {
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

    processElement(element) {
        // 1. 鎖定容器：所有操作都以最外層容器為準
        const container = element.closest('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-playlist-renderer, ytd-rich-section-renderer, ytd-reel-shelf-renderer, ytd-playlist-panel-video-renderer') || element;

        // 2. 基本檢查：容器已檢查過、或已隱藏，則跳過
        if (container.dataset.ypChecked || container.dataset.ypHidden) {
            element.dataset.ypChecked = 'true';
            return;
        }

        // 0. 強制執行原生 hidden 屬性的隱藏 (修復幽靈空白與誤觸問題)
        if (element.hidden || element.hasAttribute('hidden')) {
            return this._hide(element, { reason: 'native_hidden' });
        }

        // 文字規則檢查 (使用 textContent 避免 Reflow, 效能大幅提升)
        const textMatch = this.customRules.check(element, element.textContent);
        if (textMatch) return this._hide(element, { reason: textMatch.key, trigger: textMatch.trigger });

        // 1. 欄位標題過濾 (不套用頻道白名單，因為 Section 通常無特定頻道)
        const sectionMatch = this._checkSectionFilter(element);
        if (sectionMatch) return this._hide(element, sectionMatch);

        // 如果是「允許內容」的頁面 (如播放清單、訂閱)，則跳過後續的內容過濾
        if (this.isPageAllowingContent) {
            container.dataset.ypChecked = 'true';
            element.dataset.ypChecked = 'true';
            return;
        }

        // 影片元素處理
        const isVideoElement = /VIDEO|LOCKUP|RICH-ITEM|PLAYLIST-PANEL-VIDEO/.test(element.tagName);
        if (isVideoElement) {
            // ❗ 關鍵修正：如果是播放清單面板中的項目，強制放行
            if (element.tagName === 'YTD-PLAYLIST-PANEL-VIDEO-RENDERER') {
                container.dataset.ypChecked = 'true';
                element.dataset.ypChecked = 'true';
                return;
            }

            const item = new LazyVideoData(element);
            
            // --- 核心邏輯重構：找出過濾原因 ---
            let filterDetail = null;

            // 1. 檢查關鍵字
            filterDetail = filterDetail || this._getFilterKeyword(item);
            // 2. 檢查頻道黑名單
            filterDetail = filterDetail || this._getFilterChannel(item);
            // 2.5 檢查單個 Shorts 項目
            if (!filterDetail && this.config.get('RULE_ENABLES').shorts_item && item.isShorts) {
                filterDetail = { reason: 'shorts_item_js', trigger: 'Shorts video detected' };
            }
            // 3. 檢查會員過濾
            if (!filterDetail && this.config.get('RULE_ENABLES').members_only && item.isMembers) {
                filterDetail = { reason: 'members_only_js' };
            }
            // 4. 檢查觀看數
            filterDetail = filterDetail || this._getFilterView(item);
            // 5. 檢查長度
            filterDetail = filterDetail || this._getFilterDuration(item);
            // 6. 檢查專輯過濾
            filterDetail = filterDetail || this._getFilterPlaylist(item);

            // --- 判斷執行動作 ---
            if (filterDetail) {
                // 定義「強規則」：不論是否在白名單，一律隱藏 (如會員影片、Shorts、合輯)
                const strongReasons = ['members_only_js', 'shorts_item_js', 'recommended_playlists'];
                const isStrong = strongReasons.includes(filterDetail.reason);

                // 如果不是強規則，才去檢查白名單
                const whitelistReason = isStrong ? null : this._checkWhitelist(item);

                if (whitelistReason) {
                    const savedBy = whitelistReason === 'channel_whitelist' ? 'Channel' : 'Keyword';
                    const trigger = filterDetail.trigger ? ` [${filterDetail.trigger}]` : '';
                    const ruleInfo = filterDetail.rule ? ` {Rule: ${filterDetail.rule}}` : '';
                    
                    Logger.info(`✅ Keep [Saved by ${savedBy} Whitelist]: ${item.channel} | ${item.title}\n(Originally Triggered: ${filterDetail.reason}${trigger}${ruleInfo})`);
                    
                    container.dataset.ypChecked = 'true';
                    element.dataset.ypChecked = 'true';
                } else {
                    this._hide(element, filterDetail, item);
                }
                return;
            }
        }

        container.dataset.ypChecked = 'true';
        element.dataset.ypChecked = 'true';
    }

    _checkSectionFilter(element) {
        // 只檢查 Section 容器
        if (!/RICH-SECTION|REEL-SHELF|SHELF-RENDERER/.test(element.tagName)) return null;
        if (!this.config.get('ENABLE_SECTION_FILTER')) return null;

        // 尋找標題
        let titleText = '';
        for (const sel of SELECTORS.SHELF_TITLE) {
            const titleEl = element.querySelector(sel);
            if (titleEl) {
                titleText = titleEl.textContent.trim();
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

    _checkWhitelist(item) {
        const channel = item.channel;
        const title = item.title;
        const config = this.config;

        // 1. 頻道白名單檢查
        const compiledChannels = config.get('compiledChannelWhitelist');
        if (compiledChannels && compiledChannels.length > 0 && channel) {
            const isMatch = compiledChannels.some(rx => rx.test(channel));
            if (isMatch) return 'channel_whitelist';
        }

        // 2. 關鍵字白名單檢查
        const compiledKeywords = config.get('compiledKeywordWhitelist');
        if (compiledKeywords && compiledKeywords.length > 0) {
            if (config.get('ENABLE_REGION_CONVERT')) {
                if (compiledKeywords.some(rx => rx.test(title))) return 'keyword_whitelist';
            } else if (title) {
                const tLower = title.toLowerCase();
                if (config.get('KEYWORD_WHITELIST').some(k => tLower.includes(k.toLowerCase()))) return 'keyword_whitelist';
            }
        }

        return null;
    }

    _getFilterKeyword(item) {
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

    _getFilterChannel(item) {
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

    _getFilterView(item) {
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

    _getFilterDuration(item) {
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

    _getFilterPlaylist(item) {
        if (!this.config.get('RULE_ENABLES').recommended_playlists || !item.isPlaylist) return null;
        if (item.isUserPlaylist) return null;
        return { reason: 'recommended_playlists', trigger: 'Detected as algorithmic Mix/Playlist' };
    }

    _hide(element, detail, item = null) {
        const reason = detail.reason;
        const trigger = detail.trigger ? ` [${detail.trigger}]` : '';
        const ruleInfo = detail.rule ? ` {Rule: ${detail.rule}}` : '';

        const container = element.closest('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-playlist-renderer, ytd-rich-section-renderer, ytd-reel-shelf-renderer, ytd-playlist-panel-video-renderer') || element;
        
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
            Logger.info(`${logMsg}\nTitle: ${item.title}\nChannel: ${item.channel}\nURL: ${item.url}`);
        } else {
            Logger.info(logMsg);
        }
    }

    clearCache() {
        // 徹底還原所有被隱藏或檢查過的元素狀態，確保白名單能正確生效
        document.querySelectorAll('[data-yp-checked], [data-yp-hidden]').forEach(el => {
            if (el.dataset.ypHidden) {
                el.style.display = '';
                el.style.visibility = '';
                delete el.dataset.ypHidden;
            }
            delete el.dataset.ypChecked;
        });
        this.hasValidatedSelectors = false;
    }

    reset() {
        document.querySelectorAll('[data-yp-hidden]').forEach(el => {
            el.style.display = '';
            delete el.dataset.ypHidden;
            delete el.dataset.ypChecked;
        });
        FilterStats.reset();
    }
}
