import { SELECTORS } from '../data/selectors.js';
import { Utils } from '../core/utils.js';
import { Logger } from '../core/logger.js';
import { FilterStats } from '../core/stats.js';
import { CustomRuleManager } from './custom-rules.js';

// --- 7. Module: Video Filter (Lazy Evaluator) ---
class LazyVideoData {
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
        if (this._title === null) this._title = this.el.querySelector(SELECTORS.METADATA.TITLE)?.textContent?.trim() || '';
        return this._title;
    }
    get channel() {
        if (this._channel === null) this._channel = this.el.querySelector(SELECTORS.METADATA.CHANNEL)?.textContent?.trim() || '';
        return this._channel;
    }
    _parseMetadata() {
        if (this._viewCount !== undefined) return;

        // 使用集中管理的選擇器
        const texts = Array.from(this.el.querySelectorAll(SELECTORS.METADATA.TEXT));

        // 嘗試從 aria-label 提取
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
            // 直播觀看數優先檢查
            if (this._liveViewers === null) this._liveViewers = Utils.parseLiveViewers(text);
            // 一般觀看數
            if (this._viewCount === null && /view|觀看|次/i.test(text)) this._viewCount = Utils.parseNumeric(text, 'view');
            // 時間
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
    get isShorts() { return !!this.el.querySelector(SELECTORS.BADGES.SHORTS); }
    get isLive() { return this._liveViewers !== null; }
    get isMembers() {
        return this.el.querySelector(SELECTORS.BADGES.MEMBERS) ||
            this.el.innerText.includes('會員專屬') ||
            this.el.innerText.includes('Members only');
    }
}

export class VideoFilter {
    constructor(config) {
        this.config = config;
        this.customRules = new CustomRuleManager(config);
    }
    // 使用 requestIdleCallback 分批處理以優化效能
    processPage() {
        const elements = Array.from(document.querySelectorAll(SELECTORS.allContainers));
        const unprocessed = elements.filter(el => !el.dataset.ypChecked);

        if (unprocessed.length === 0) return;

        // 如果瀏覽器支援 requestIdleCallback，使用分批處理
        if ('requestIdleCallback' in window) {
            this._processBatch(unprocessed, 0);
        } else {
            // Fallback: 直接處理
            for (const el of unprocessed) this.processElement(el);
        }
    }

    _processBatch(elements, startIndex, batchSize = 20) {
        requestIdleCallback((deadline) => {
            let i = startIndex;
            // 在空閒時間內處理盡可能多的元素
            while (i < elements.length && (deadline.timeRemaining() > 0 || deadline.didTimeout)) {
                this.processElement(elements[i]);
                i++;
                // 每批最多處理 batchSize 個
                if (i - startIndex >= batchSize) break;
            }
            // 如果還有未處理的元素，繼續排程
            if (i < elements.length) {
                this._processBatch(elements, i, batchSize);
            }
        }, { timeout: 500 }); // 500ms 超時保證
    }

    processElement(element) {
        if (element.dataset.ypChecked) return;
        if (element.offsetParent === null) return;

        // 7.2 Custom Text Rules Check (Extensible)
        const textRule = this.customRules.check(element, element.innerText);
        if (textRule) return this._hide(element, textRule);

        // 7.3 Base Logic
        if (element.tagName.includes('VIDEO') || element.tagName.includes('LOCKUP') || element.tagName.includes('RICH-ITEM')) {
            const item = new LazyVideoData(element);

            // Advanced Filters
            // Advanced Filters
            if (this.config.get('ENABLE_KEYWORD_FILTER') && item.title) {
                const convert = this.config.get('ENABLE_REGION_CONVERT');
                const title = convert ? Utils.toSimplified(item.title) : item.title;
                if (this.config.get('KEYWORD_BLACKLIST').some(k => {
                    const key = convert ? Utils.toSimplified(k) : k;
                    return title.toLowerCase().includes(key.toLowerCase());
                })) return this._hide(element, 'keyword_blacklist');
            }
            if (this.config.get('ENABLE_CHANNEL_FILTER') && item.channel) {
                const convert = this.config.get('ENABLE_REGION_CONVERT');
                const channel = convert ? Utils.toSimplified(item.channel) : item.channel;
                if (this.config.get('CHANNEL_BLACKLIST').some(k => {
                    const key = convert ? Utils.toSimplified(k) : k;
                    return channel.toLowerCase().includes(key.toLowerCase());
                })) return this._hide(element, 'channel_blacklist');
            }

            // 強化會員過濾 (JS補刀)：若開啟成員過濾且偵測到是會員影片，直接隱藏
            if (this.config.get('RULE_ENABLES').members_only && item.isMembers) {
                return this._hide(element, 'members_only_js');
            }

            if (this.config.get('ENABLE_LOW_VIEW_FILTER') && !item.isShorts) {
                const th = this.config.get('LOW_VIEW_THRESHOLD');
                const grace = this.config.get('GRACE_PERIOD_HOURS') * 60;

                // 直播觀看數過濾 (不受豁免期限制)
                if (item.isLive && item.liveViewers !== null && item.liveViewers < th) {
                    return this._hide(element, 'low_viewer_live');
                }

                // 一般影片觀看數過濾 (受豁免期限制)
                if (!item.isLive && item.viewCount !== null && item.timeAgo !== null && item.timeAgo > grace && item.viewCount < th) {
                    return this._hide(element, 'low_view');
                }
            }

            if (this.config.get('ENABLE_DURATION_FILTER') && !item.isShorts && item.duration !== null) {
                const min = this.config.get('DURATION_MIN');
                const max = this.config.get('DURATION_MAX');
                if ((min > 0 && item.duration < min) || (max > 0 && item.duration > max)) return this._hide(element, 'duration_filter');
            }
        }
        element.dataset.ypChecked = 'true';
    }

    _hide(element, reason) {
        element.style.display = 'none';
        element.dataset.ypHidden = reason;
        FilterStats.record(reason);  // 記錄統計
        Logger.info(`Hidden [${reason}]`, element);
    }

    reset() {
        document.querySelectorAll('[data-yp-hidden]').forEach(el => {
            el.style.display = '';
            delete el.dataset.ypHidden;
            delete el.dataset.ypChecked;
        });
        FilterStats.reset();  // 重設統計
    }
}
