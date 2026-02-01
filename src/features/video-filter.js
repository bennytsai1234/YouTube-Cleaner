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
            if (this._liveViewers === null) this._liveViewers = Utils.parseLiveViewers(text);
            if (this._viewCount === null && /view|觀看|次/i.test(text)) this._viewCount = Utils.parseNumeric(text, 'view');
            if (this._timeAgo === null && /ago|前/i.test(text)) this._timeAgo = Utils.parseTimeAgo(text);
        }
    }

    get viewCount() { this._parseMetadata(); return this._viewCount; }
    get liveViewers() { this._parseMetadata(); return this._liveViewers; }
    get timeAgo() { this._parseMetadata(); return this._timeAgo; }

    get duration() {
        if (this._duration === undefined) {
            const el = this.el.querySelector(SELECTORS.METADATA.DURATION);
            this._duration = el ? Utils.parseDuration(el.textContent) : null;
        }
        return this._duration;
    }

    get isShorts() {
        if (this._isShorts === undefined) {
             this._isShorts = !!this.el.querySelector(SELECTORS.BADGES.SHORTS);
        }
        return this._isShorts;
    }

    get isLive() { return this._liveViewers !== null; } // liveViewers 已經有快取機制

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
        if (element.dataset.ypChecked) return;

        // 0. 強制執行原生 hidden 屬性的隱藏 (修復幽靈空白與誤觸問題)
        if (element.hidden || element.hasAttribute('hidden')) {
            return this._hide(element, 'native_hidden');
        }

        // 文字規則檢查 (使用 textContent 避免 Reflow, 效能大幅提升)
        const textRule = this.customRules.check(element, element.textContent);
        if (textRule) return this._hide(element, textRule);

        // 1. 欄位標題過濾 (新增功能)
        if (this._checkSectionFilter(element)) return;

        // 如果是「允許內容」的頁面 (如播放清單、訂閱)，則跳過後續的內容過濾 (但前面已執行廣告/規則檢查)
        if (this.isPageAllowingContent) {
            element.dataset.ypChecked = 'true';
            return;
        }

        // 影片元素處理
        const isVideoElement = /VIDEO|LOCKUP|RICH-ITEM/.test(element.tagName);
        if (isVideoElement) {
            const item = new LazyVideoData(element);

            // 檢查白名單 (若在白名單中，則跳過所有過濾)
            if (this._checkWhitelist(item)) {
                element.dataset.ypChecked = 'true';
                Logger.info(`Keep [whitelist]: ${item.channel}`, element);
                return;
            }

            // 關鍵字過濾
            if (this._checkKeywordFilter(item, element)) return;

            // 頻道過濾
            if (this._checkChannelFilter(item, element)) return;

            // 會員過濾
            if (this.config.get('RULE_ENABLES').members_only && item.isMembers) {
                return this._hide(element, 'members_only_js', item);
            }

            // 觀看數過濾
            if (this._checkViewFilter(item, element)) return;

            // 長度過濾
            if (this._checkDurationFilter(item, element)) return;

            // 專輯過濾
            if (this._checkPlaylistFilter(item, element)) return;
        }

        element.dataset.ypChecked = 'true';
    }

    _checkSectionFilter(element) {
        // 只檢查 Section 容器
        if (!/RICH-SECTION|REEL-SHELF|SHELF-RENDERER/.test(element.tagName)) return false;
        if (!this.config.get('ENABLE_SECTION_FILTER')) return false;

        // 尋找標題
        let titleText = '';
        for (const sel of SELECTORS.SHELF_TITLE) {
            const titleEl = element.querySelector(sel);
            if (titleEl) {
                titleText = titleEl.textContent.trim();
                break;
            }
        }

        if (!titleText) return false;

        const compiled = this.config.get('compiledSections');
        if (compiled && compiled.some(rx => rx.test(titleText))) {
            this._hide(element, 'section_blacklist');
            return true;
        }

        return false;
    }

    _checkWhitelist(item) {
        if (!item.channel) return false;

        const compiled = this.config.get('compiledWhitelist');
        // 無設定白名單則跳過
        if (!compiled || compiled.length === 0) return false;

        if (this.config.get('ENABLE_REGION_CONVERT')) {
            return compiled.some(rx => rx.test(item.channel));
        } else {
            const channel = item.channel.toLowerCase();
            return this.config.get('CHANNEL_WHITELIST').some(k => channel.includes(k.toLowerCase()));
        }
    }

    _checkKeywordFilter(item, element) {
        if (!this.config.get('ENABLE_KEYWORD_FILTER') || !item.title) return false;

        const compiled = this.config.get('compiledKeywords');
        if (this.config.get('ENABLE_REGION_CONVERT') && compiled) {
            if (compiled.some(rx => rx.test(item.title))) {
                this._hide(element, 'keyword_blacklist', item);
                return true;
            }
        } else {
            const title = item.title.toLowerCase();
            if (this.config.get('KEYWORD_BLACKLIST').some(k => title.includes(k.toLowerCase()))) {
                this._hide(element, 'keyword_blacklist', item);
                return true;
            }
        }
        return false;
    }

    _checkChannelFilter(item, element) {
        if (!this.config.get('ENABLE_CHANNEL_FILTER') || !item.channel) return false;

        const compiled = this.config.get('compiledChannels');
        if (this.config.get('ENABLE_REGION_CONVERT') && compiled) {
            if (compiled.some(rx => rx.test(item.channel))) {
                this._hide(element, 'channel_blacklist', item);
                return true;
            }
        } else {
            const channel = item.channel.toLowerCase();
            if (this.config.get('CHANNEL_BLACKLIST').some(k => channel.includes(k.toLowerCase()))) {
                this._hide(element, 'channel_blacklist', item);
                return true;
            }
        }
        return false;
    }

    _checkViewFilter(item, element) {
        if (!this.config.get('ENABLE_LOW_VIEW_FILTER') || item.isShorts) return false;

        const th = this.config.get('LOW_VIEW_THRESHOLD');
        const grace = this.config.get('GRACE_PERIOD_HOURS') * 60;

        if (item.isLive && item.liveViewers !== null && item.liveViewers < th) {
            this._hide(element, 'low_viewer_live', item);
            return true;
        }

        if (!item.isLive && item.viewCount !== null && item.timeAgo !== null &&
            item.timeAgo > grace && item.viewCount < th) {
            this._hide(element, 'low_view', item);
            return true;
        }
        return false;
    }

    _checkDurationFilter(item, element) {
        if (!this.config.get('ENABLE_DURATION_FILTER') || item.isShorts || item.duration === null) return false;

        const min = this.config.get('DURATION_MIN');
        const max = this.config.get('DURATION_MAX');

        if ((min > 0 && item.duration < min) || (max > 0 && item.duration > max)) {
            this._hide(element, 'duration_filter', item);
            return true;
        }
        return false;
    }

    _checkPlaylistFilter(item, element) {
        if (!this.config.get('RULE_ENABLES').recommended_playlists || !item.isPlaylist) return false;
        if (item.isUserPlaylist) return false;
        this._hide(element, 'recommended_playlists', item);
        return true;
    }

    _hide(element, reason, item = null) {
        const container = element.closest('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-playlist-renderer') || element;
        container.style.cssText = 'display: none !important; visibility: hidden !important;';
        container.dataset.ypHidden = reason;
        if (container !== element) element.dataset.ypHidden = reason;
        FilterStats.record(reason);

        // Rich Logging for Debug
        if (item && item.url) {
            Logger.info(`Hidden [${reason}]\nTitle: ${item.title}\nChannel: ${item.channel}\nURL: ${item.url}`, container);
        } else {
            Logger.info(`Hidden [${reason}]`, container);
        }
    }

    clearCache() {
        document.querySelectorAll('[data-yp-checked]').forEach(el => delete el.dataset.ypChecked);
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
