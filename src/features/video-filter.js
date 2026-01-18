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
        if (this._title === null) {
             const el = this.el.querySelector(SELECTORS.METADATA.TITLE);
             // 優先讀取 title 屬性 (針對被截斷或隱藏的標題)
             if (el?.title) {
                 this._title = el.title.trim();
             } else {
                 this._title = el?.textContent?.trim() || '';
             }
        }
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

    // 優化：針對 MutationObserver 的增量處理
    processMutations(mutations) {
        // 效能防護：如果變更量過大 (例如切換分類 Chip)，直接進行全頁掃描比遍歷 Mutation 更快且不卡頓
        if (mutations.length > 100) {
            this.processPage();
            return;
        }

        const candidates = new Set();
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;

                // 檢查節點本身
                if (node.matches && node.matches(SELECTORS.allContainers)) {
                    candidates.add(node);
                }

                // 檢查子節點 (只在容器內搜尋，範圍更小)
                if (node.querySelectorAll) {
                    const children = node.querySelectorAll(SELECTORS.allContainers);
                    for (const child of children) candidates.add(child);
                }
            }
        }

        if (candidates.size > 0) {
            this._processBatch(Array.from(candidates), 0);
        }
    }

    // 全頁掃描 (初始化或重設時使用)
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
            if (this.config.get('ENABLE_KEYWORD_FILTER') && item.title) {
                const convert = this.config.get('ENABLE_REGION_CONVERT');
                // Regex-based check (Zero Allocation)
                if (convert && this.config.get('compiledKeywords')) {
                    if (this.config.get('compiledKeywords').some(rx => rx.test(item.title))) {
                        return this._hide(element, 'keyword_blacklist');
                    }
                } else {
                    // Fallback to simple includes (for regex gen fail or disabled convert)
                    const title = item.title.toLowerCase();
                    if (this.config.get('KEYWORD_BLACKLIST').some(k => title.includes(k.toLowerCase()))) {
                         return this._hide(element, 'keyword_blacklist');
                    }
                }
            }
            if (this.config.get('ENABLE_CHANNEL_FILTER') && item.channel) {
                const convert = this.config.get('ENABLE_REGION_CONVERT');
                // Regex-based check
                if (convert && this.config.get('compiledChannels')) {
                     if (this.config.get('compiledChannels').some(rx => rx.test(item.channel))) {
                        return this._hide(element, 'channel_blacklist');
                    }
                } else {
                    const channel = item.channel.toLowerCase();
                    if (this.config.get('CHANNEL_BLACKLIST').some(k => channel.includes(k.toLowerCase()))) {
                        return this._hide(element, 'channel_blacklist');
                    }
                }
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
        // 優化：嘗試向上尋找 Grid Item 容器，確保隱藏整個格子而不留白
        const container = element.closest('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer') || element;
        
        container.style.display = 'none';
        container.dataset.ypHidden = reason;
        
        // 如果隱藏的是容器，也要標記原始元素，避免重複處理
        if (container !== element) {
            element.dataset.ypHidden = reason;
        }

        FilterStats.record(reason);  // 記錄統計
        Logger.info(`Hidden [${reason}]`, container);
    }

    // 清除所有檢查標記 (用於頁面導航後，防止 DOM 重用導致的過濾失效)
    clearCache() {
        document.querySelectorAll('[data-yp-checked]').forEach(el => {
            delete el.dataset.ypChecked;
        });
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
