// ==UserScript==
// @name        YouTube Cleaner - Remove Shorts, Recommendations & Clutter
// @description Clean YouTube interface by hiding Shorts, suggestions, and clutter elements. 20+ custom rules.
// @namespace   http://tampermonkey.net/
// @version     2.0.0
// @author      Benny & AI Collaborators
// @match       https://www.youtube.com/*
// @exclude     https://www.youtube.com/embed/*
// @require     https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.js
// @run-at      document-start
// @license     MIT
// @icon        https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @downloadURL https://raw.githubusercontent.com/bennytsai1234/YouTube-Cleaner/main/youtube-homepage-cleaner.user.js
// @updateURL   https://raw.githubusercontent.com/bennytsai1234/YouTube-Cleaner/main/youtube-homepage-cleaner.user.js
// @grant       GM_info
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_setClipboard
// @grant       GM_registerMenuCommand
// @grant       GM_unregisterMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    const TIME_UNITS = {
        MINUTE: 1,
        HOUR: 60,
        DAY: 1440,
        WEEK: 10080,
        MONTH: 43200,
        YEAR: 525600
    };
    const MULTIPLIERS = {
        'k': 1e3, 'm': 1e6, 'b': 1e9,
        '千': 1e3, '萬': 1e4, '億': 1e8,
        '万': 1e4, '亿': 1e8
    };
    const RX_NUMERIC = /([\d.]+)\s*([kmb千萬万億亿])?/i;
    const RX_TIME_AGO_CHECK = /(ago|前|hour|minute|day|week|month|year|秒|分|時|天|週|月|年)/i;
    const RX_TIME_AGO_PARSE = /([\d.]+)\s*(second|minute|min|hour|hr|day|week|month|year|秒|分|小時|時|天|日|週|周|月|年)s?/i;
    const RX_ZERO_TIME = /second|秒/i;
    const TIME_UNIT_KEYS = {
        'minute': TIME_UNITS.MINUTE, 'min': TIME_UNITS.MINUTE, '分': TIME_UNITS.MINUTE,
        'hour': TIME_UNITS.HOUR, 'hr': TIME_UNITS.HOUR, '時': TIME_UNITS.HOUR, '小時': TIME_UNITS.HOUR,
        'day': TIME_UNITS.DAY, '天': TIME_UNITS.DAY, '日': TIME_UNITS.DAY,
        'week': TIME_UNITS.WEEK, '週': TIME_UNITS.WEEK, '周': TIME_UNITS.WEEK,
        'month': TIME_UNITS.MONTH, '月': TIME_UNITS.MONTH,
        'year': TIME_UNITS.YEAR, '年': TIME_UNITS.YEAR
    };
    const Utils = {
        _openccToSimp: null,
        _openccToTrad: null,
        debounce: (func, delay) => {
            let t;
            return (...args) => { clearTimeout(t); t = setTimeout(() => func(...args), delay); };
        },
        throttle: (func, limit) => {
            let inThrottle;
            return function(...args) {
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },
        parseNumeric: (text, type = 'any') => {
            if (!text) return null;
            if (type === 'view' && RX_TIME_AGO_CHECK.test(text)) return null;
            const clean = text.replace(/,/g, '').trim();
            const match = clean.match(RX_NUMERIC);
            if (!match) return null;
            let num = parseFloat(match[1]);
            const unit = match[2]?.toLowerCase();
            if (unit && MULTIPLIERS[unit]) {
                num *= MULTIPLIERS[unit];
            }
            return Math.floor(num);
        },
        parseDuration: (text) => {
            if (!text) return null;
            const parts = text.trim().split(':').map(Number);
            if (parts.some(isNaN)) return null;
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            if (parts.length === 2) return parts[0] * 60 + parts[1];
            if (parts.length === 1) return parts[0];
            return null;
        },
        parseTimeAgo: (text) => {
            if (!text) return null;
            if (RX_ZERO_TIME.test(text)) return 0;
            const match = text.match(RX_TIME_AGO_PARSE);
            if (!match) return null;
            const val = parseFloat(match[1]);
            const unitStr = match[2].toLowerCase();
            if (TIME_UNIT_KEYS[unitStr]) return val * TIME_UNIT_KEYS[unitStr];
            for (const [key, multiplier] of Object.entries(TIME_UNIT_KEYS)) {
                if (unitStr.includes(key)) return val * multiplier;
            }
            return null;
        },
        parseLiveViewers: (text) => {
            if (!text) return null;
            if (!/(正在觀看|觀眾|watching|viewers)/i.test(text)) return null;
            return Utils.parseNumeric(text, 'any');
        },
        _initOpenCC: () => {
            if (Utils._openccToSimp) return true;
            if (typeof OpenCC === 'undefined') return false;
            try {
                Utils._openccToSimp = OpenCC.Converter({ from: 'tw', to: 'cn' });
                Utils._openccToTrad = OpenCC.Converter({ from: 'cn', to: 'tw' });
                return true;
            } catch (e) {
                console.warn('[YT Cleaner] OpenCC init failed');
                return false;
            }
        },
        toSimplified: (str) => {
            if (!str) return '';
            if (Utils._initOpenCC()) {
                try { return Utils._openccToSimp(str); } catch (e) {  }
            }
            return str;
        },
        generateCnRegex: (text) => {
            if (!text) return null;
            const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (Utils._initOpenCC()) {
                const simp = Utils._openccToSimp(text);
                const trad = Utils._openccToTrad(text);
                const escSimp = escape(simp);
                const escTrad = escape(trad);
                try {
                    if (escSimp === escTrad) return new RegExp(escSimp, 'i');
                    return new RegExp(`(?:${escSimp}|${escTrad})`, 'i');
                } catch (e) {
                    return null;
                }
            }
            try {
                return new RegExp(escape(text), 'i');
            } catch (e) {
                return null;
            }
        }
    };

    let instance = null;
    class ConfigManager {
        constructor() {
            if (instance) return instance;
            instance = this;
            this.defaults = {
                OPEN_IN_NEW_TAB: true,
                OPEN_NOTIFICATIONS_IN_NEW_TAB: true,
                ENABLE_LOW_VIEW_FILTER: true,
                LOW_VIEW_THRESHOLD: 1000,
                DEBUG_MODE: true,
                ENABLE_REGION_CONVERT: true,
                DISABLE_FILTER_ON_CHANNEL: true,
                ENABLE_KEYWORD_FILTER: true,
                KEYWORD_BLACKLIST: ['預告', 'Teaser', 'Trailer', 'PV', 'CM', 'MV', 'Cover', '翻唱'],
                ENABLE_CHANNEL_FILTER: true,
                CHANNEL_BLACKLIST: [],
                CHANNEL_WHITELIST: [],
                EXACT_CHANNEL_WHITELIST: false,
                KEYWORD_WHITELIST: [],
                ENABLE_SECTION_FILTER: true,
                SECTION_TITLE_BLACKLIST: [
                    '耳目一新', '重溫舊愛', '合輯', '最新貼文', '發燒影片', '熱門', '為您推薦', '推薦', '先前搜尋內容', '相關內容',
                    'New to you', 'Relive', 'Mixes', 'Latest posts', 'Trending', 'Recommended', 'People also watched', 'From your search', 'Related to', 'Previously watched',
                    'おすすめ', 'ミックス', '新着', 'トレンド', 'あなたへの', '関連'
                ],
                ENABLE_DURATION_FILTER: true,
                DURATION_MIN: 0,
                DURATION_MAX: 0,
                GRACE_PERIOD_HOURS: 4,
                RULE_ENABLES: {
                    ad_block_popup: true, ad_sponsor: true, members_only: true, shorts_item: true,
                    mix_only: true, premium_banner: true, news_block: true, shorts_block: true,
                    posts_block: true, playables_block: true, fundraiser_block: true,
                    shorts_grid_shelf: true, movies_shelf: true,
                    youtube_featured_shelf: true, popular_gaming_shelf: true,
                    more_from_game_shelf: true, trending_playlist: true,
                    inline_survey: true, clarify_box: true, explore_topics: true,
                    recommended_playlists: true, members_early_access: true
                }
            };
            this.state = this._load();
        }
        _load() {
            const get = (k, d) => GM_getValue(k, d);
            const snake = str => str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
            const loaded = {};
            for (const key in this.defaults) {
                if (key === 'RULE_ENABLES') {
                    const saved = get('ruleEnables', {});
                    loaded[key] = { ...this.defaults.RULE_ENABLES, ...saved };
                } else {
                    loaded[key] = get(snake(key), this.defaults[key]);
                    if (Array.isArray(this.defaults[key]) && !Array.isArray(loaded[key])) {
                        loaded[key] = [...this.defaults[key]];
                    }
                }
            }
            loaded.compiledKeywords = (loaded.KEYWORD_BLACKLIST || []).map(k => Utils.generateCnRegex(k)).filter(Boolean);
            loaded.compiledChannels = (loaded.CHANNEL_BLACKLIST || []).map(k => Utils.generateCnRegex(k)).filter(Boolean);
            loaded.compiledChannelWhitelist = (loaded.CHANNEL_WHITELIST || []).map(k => Utils.generateCnRegex(k)).filter(Boolean);
            loaded.compiledKeywordWhitelist = (loaded.KEYWORD_WHITELIST || []).map(k => Utils.generateCnRegex(k)).filter(Boolean);
            loaded.compiledSectionBlacklist = (loaded.SECTION_TITLE_BLACKLIST || []).map(k => Utils.generateCnRegex(k)).filter(Boolean);
            return loaded;
        }
        get(key) { return this.state[key]; }
        set(key, value) {
            this.state[key] = value;
            const snake = str => str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
            if (key === 'RULE_ENABLES') GM_setValue('ruleEnables', value);
            else GM_setValue(snake(key), value);
            if (key === 'KEYWORD_BLACKLIST') {
                this.state.compiledKeywords = value.map(k => Utils.generateCnRegex(k)).filter(Boolean);
            }
            if (key === 'CHANNEL_BLACKLIST') {
                this.state.compiledChannels = value.map(k => Utils.generateCnRegex(k)).filter(Boolean);
            }
            if (key === 'CHANNEL_WHITELIST') {
                this.state.compiledChannelWhitelist = value.map(k => Utils.generateCnRegex(k)).filter(Boolean);
            }
            if (key === 'KEYWORD_WHITELIST') {
                this.state.compiledKeywordWhitelist = value.map(k => Utils.generateCnRegex(k)).filter(Boolean);
            }
            if (key === 'SECTION_TITLE_BLACKLIST') {
                this.state.compiledSectionBlacklist = value.map(k => Utils.generateCnRegex(k)).filter(Boolean);
            }
        }
        toggleRule(ruleId) {
            this.state.RULE_ENABLES[ruleId] = !this.state.RULE_ENABLES[ruleId];
            this.set('RULE_ENABLES', this.state.RULE_ENABLES);
        }
    }

    const Logger = {
        enabled: false,
        prefix: `[Purifier]`,
        info(msg, ...args) { if (this.enabled) console.log(`%c${this.prefix} ${msg}`, 'color:#3498db;font-weight:bold', ...args); },
        warn(msg, ...args) { if (this.enabled) console.warn(`${this.prefix} ${msg}`, ...args); }
    };

    const VIDEO_CONTAINERS = [
        'ytd-rich-item-renderer',
        'ytd-video-renderer',
        'ytd-compact-video-renderer',
        'ytd-grid-video-renderer',
        'yt-lockup-view-model',
        'ytd-compact-radio-renderer',
        'ytd-playlist-panel-video-renderer',
        'ytd-playlist-video-renderer'
    ];
    const SECTION_CONTAINERS = [
        'ytd-rich-section-renderer',
        'ytd-rich-shelf-renderer',
        'ytd-reel-shelf-renderer',
        'grid-shelf-view-model'
    ];
    const ALL_CONTAINERS_STR = [...VIDEO_CONTAINERS, ...SECTION_CONTAINERS].join(', ');
    const SELECTORS = {
        VIDEO_CONTAINERS,
        METADATA: {
            TEXT: '.inline-metadata-item, #metadata-line span, .yt-content-metadata-view-model__metadata-text, yt-content-metadata-view-model .yt-core-attributed-string',
            TITLE_LINKS: [
                'a#video-title-link[aria-label]',
                'a#thumbnail[aria-label]',
                'a.yt-lockup-metadata-view-model__title[aria-label]',
                'a[href*="/watch?"][aria-label]'
            ],
            DURATION: 'ytd-thumbnail-overlay-time-status-renderer, span.ytd-thumbnail-overlay-time-status-renderer, badge-shape .yt-badge-shape__text, yt-thumbnail-badge-view-model .yt-badge-shape__text',
            CHANNEL: 'ytd-channel-name, .ytd-channel-name, a[href^="/@"]',
            TITLE: '#video-title, #title, .yt-lockup-metadata-view-model__title, .yt-lockup-metadata-view-model__heading-reset, h3'
        },
        SHELF_TITLE: [
            '#rich-shelf-header #title',
            'ytd-reel-shelf-renderer #title',
            'h2#title',
            '.ytd-shelf-renderer #title'
        ],
        BADGES: {
            MEMBERS: '.badge-style-type-members-only, [aria-label*="會員專屬"], [aria-label*="Members only"]',
            SHORTS: 'a[href*="/shorts/"]',
            MIX: 'a[aria-label*="合輯"], a[aria-label*="Mix"]'
        },
        INTERACTION_EXCLUDE: 'button, yt-icon-button, #menu, ytd-menu-renderer, ytd-toggle-button-renderer, yt-chip-cloud-chip-renderer, .yt-spec-button-shape-next, .yt-core-attributed-string__link, #subscribe-button, .ytp-progress-bar, .ytp-chrome-bottom',
        CLICKABLE: [
            'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-compact-video-renderer',
            'yt-lockup-view-model', 'ytd-playlist-renderer', 'ytd-compact-playlist-renderer',
            'ytd-video-owner-renderer', 'ytd-grid-video-renderer', 'ytd-playlist-video-renderer',
            'ytd-playlist-panel-video-renderer'
        ],
        PREVIEW_PLAYER: 'ytd-video-preview',
        LINK_CANDIDATES: [
            'a#thumbnail[href*="/watch?"]', 'a#thumbnail[href*="/shorts/"]', 'a#thumbnail[href*="/playlist?"]',
            'a#video-title-link', 'a#video-title', 'a.yt-simple-endpoint#video-title', 'a.yt-lockup-view-model-wiz__title'
        ],
        allContainers: ALL_CONTAINERS_STR};

    class StyleManager {
        constructor(config) { this.config = config; }
        apply() {
            const rules = [];
            const enables = this.config.get('RULE_ENABLES');
            rules.push('body, html { font-family: "YouTube Noto", Roboto, Arial, "PingFang SC", "Microsoft YaHei", sans-serif !important; }');
            if (enables.ad_block_popup) {
                rules.push(`
                tp-yt-paper-dialog:has(ytd-enforcement-message-view-model),
                ytd-enforcement-message-view-model,
                #immersive-translate-browser-popup,
                tp-yt-iron-overlay-backdrop:has(~ tp-yt-paper-dialog ytd-enforcement-message-view-model),
                tp-yt-iron-overlay-backdrop.opened,
                yt-playability-error-supported-renderers:has(ytd-enforcement-message-view-model) { display: none !important; }

                ytd-app:has(ytd-enforcement-message-view-model), body:has(ytd-enforcement-message-view-model), html:has(ytd-enforcement-message-view-model) {
                    overflow: auto !important; overflow-y: auto !important; position: static !important;
                    pointer-events: auto !important; height: auto !important; top: 0 !important;
                    margin-right: 0 !important; overscroll-behavior: auto !important;
                }

                ytd-app[aria-hidden="true"]:has(ytd-enforcement-message-view-model) {
                    display: block !important;
                }

                ytd-app { --ytd-app-scroll-offset: 0 !important; }
            `);
            }
            const map = {
                ad_sponsor: [
                    'ytd-ad-slot-renderer',
                    'ytd-promoted-sparkles-text-search-renderer',
                    '#masthead-ad',
                    'ytd-rich-item-renderer:has(.ytd-ad-slot-renderer)',
                    'feed-ad-metadata-view-model',
                    'ad-badge-view-model'
                ],
                premium_banner: ['ytd-statement-banner-renderer', 'ytd-rich-section-renderer:has(ytd-statement-banner-renderer)'],
                clarify_box: ['ytd-info-panel-container-renderer'],
                inline_survey: ['ytd-rich-section-renderer:has(ytd-inline-survey-renderer)'],
                playables_block: ['ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-playables])', 'ytd-game-card-renderer'],
                shorts_block: ['ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])']
            };
            for (const [key, selectors] of Object.entries(map)) {
                if (enables[key]) rules.push(`${selectors.join(', ')} { display: none !important; }`);
            }
            const hasRules = [
                { key: 'ad_sponsor', selector: '[aria-label*="廣告"], [aria-label*="Sponsor"], [aria-label="贊助商廣告"], ad-badge-view-model, feed-ad-metadata-view-model' },
                { key: 'members_only', selector: '[aria-label*="會員專屬"]' },
                { key: 'shorts_item', selector: 'a[href*="/shorts/"]' },
                { key: 'mix_only', selector: 'a[aria-label*="合輯"], a[aria-label*="Mix"]' }
            ];
            hasRules.forEach(({ key, selector }) => {
                if (enables[key]) {
                    const containersList = SELECTORS.VIDEO_CONTAINERS || [];
                    containersList.forEach(c => rules.push(`${c}:has(${selector}) { display: none !important; }`));
                }
            });
            let styleEl = document.getElementById('yt-cleaner-css');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'yt-cleaner-css';
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = rules.join('\n');
            Logger.info('Static CSS rules updated');
        }
    }

    const TIMING = {
        RESUME_COOLDOWN: 3000
    };
    class AdBlockGuard {
        constructor() {
            this.keywords = [
                'Ad blockers', '廣告攔截器',
                'Video player will be blocked', '影片播放器將被封鎖',
                'Allow YouTube', '允許 YouTube',
                "YouTube doesn't allow ad blockers"
            ];
            this.whitelistSelectors = [
                'ytd-sponsorships-offer-renderer',
                'ytd-about-channel-renderer',
                'ytd-report-form-modal-renderer',
                'ytd-multi-page-menu-renderer',
                'ytd-playlist-add-to-option-renderer'
            ];
            this.lastTrigger = 0;
            this.observer = null;
        }
        patchConfig() {
            try {
                const config = window.yt?.config_ || window.ytcfg?.data_;
                if (config?.openPopupConfig?.supportedPopups?.adBlockMessageViewModel) {
                    config.openPopupConfig.supportedPopups.adBlockMessageViewModel = false;
                }
                if (config?.EXPERIMENT_FLAGS) {
                    config.EXPERIMENT_FLAGS.ad_blocker_notifications_disabled = true;
                    config.EXPERIMENT_FLAGS.web_enable_adblock_detection_block_playback = false;
                }
            } catch (e) {
            }
        }
        start() {
            this.patchConfig();
            this.checkAndCleanThrottled = Utils.throttle(() => this.checkAndClean(), 250);
            this.observer = new MutationObserver(() => this.checkAndCleanThrottled());
            this.observer.observe(document.body, {
                childList: true,
                subtree: false
            });
            const tryConnect = (attempts = 0) => {
                const popupContainer = document.querySelector('ytd-popup-container');
                if (popupContainer && !popupContainer._adGuardObserved) {
                    popupContainer._adGuardObserved = true;
                    this.observer.observe(popupContainer, { childList: true, subtree: true });
                    Logger.info('🛡️ AdBlockGuard attached to popup container');
                } else if (attempts < 10) {
                    setTimeout(() => tryConnect(attempts + 1), 500);
                }
            };
            tryConnect();
            this.checkAndClean();
        }
        isWhitelisted(dialog) {
            return this.whitelistSelectors.some(sel => dialog.querySelector(sel));
        }
        isAdBlockPopup(dialog) {
            if (dialog.tagName === 'YTD-ENFORCEMENT-MESSAGE-VIEW-MODEL') return true;
            if (dialog.querySelector('ytd-enforcement-message-view-model')) return true;
            if (dialog.textContent && this.keywords.some(k => dialog.textContent.includes(k))) return true;
            return false;
        }
        checkAndClean() {
            const popupSelectors = [
                'tp-yt-paper-dialog',
                'ytd-enforcement-message-view-model',
                'yt-playability-error-supported-renderers'
            ];
            const dialogs = document.querySelectorAll(popupSelectors.join(', '));
            let detected = false;
            for (const dialog of dialogs) {
                if (this.isWhitelisted(dialog)) continue;
                if (this.isAdBlockPopup(dialog)) {
                    dialog.querySelectorAll('[aria-label="Close"], #dismiss-button').forEach(btn => btn.click());
                    dialog.remove();
                    detected = true;
                    Logger.info(`🚫 Removed AdBlock Popup: ${dialog.tagName}`);
                }
            }
            if (detected) {
                document.querySelectorAll('tp-yt-iron-overlay-backdrop.opened').forEach(b => b.remove());
                this.resumeVideo();
            }
        }
        resumeVideo() {
            if (Date.now() - this.lastTrigger > TIMING.RESUME_COOLDOWN) {
                this.lastTrigger = Date.now();
                const video = document.querySelector('video');
                if (video?.paused && !video.ended) {
                    video.play().catch(() => {});
                }
            }
        }
        destroy() {
            this.observer?.disconnect();
        }
    }

    const FilterStats = {
        counts: {},
        session: { total: 0, byRule: {} },
        record(reason) {
            this.counts[reason] = (this.counts[reason] || 0) + 1;
            this.session.total++;
            this.session.byRule[reason] = (this.session.byRule[reason] || 0) + 1;
        },
        getSummary() {
            return `已過濾 ${this.session.total} 個項目
` +
                Object.entries(this.session.byRule)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => `  ${k}: ${v}`)
                    .join('\n');
        },
        reset() {
            this.session = { total: 0, byRule: {} };
        }
    };

    class CustomRuleManager {
        constructor(config) {
            this.config = config;
            this.definitions = [
                { key: 'members_only', rules: [/頻道會員專屬|Members only/i] },
                { key: 'mix_only', rules: [/(^|\s)(合輯|Mix)([\s\-–]|$)/i] },
                { key: 'news_block', rules: [/新聞快報|Breaking News|ニュース/i] },
                { key: 'posts_block', rules: [/貼文|Posts|投稿|Publicaciones|最新 YouTube 貼文/i] },
                { key: 'playables_block', rules: [/Playables|遊戲角落/i] },
                { key: 'fundraiser_block', rules: [/Fundraiser|募款/i] },
                { key: 'popular_gaming_shelf', rules: [/熱門遊戲直播/i] },
                { key: 'explore_topics', rules: [/探索更多主題|Explore more topics/i] },
                { key: 'movies_shelf', rules: [/為你推薦的特選電影|featured movies|YouTube 精選/i] },
                { key: 'trending_playlist', rules: [/發燒影片|Trending/i] },
                { key: 'youtube_featured_shelf', rules: [/YouTube 精選/i] },
                { key: 'shorts_block', rules: [/^Shorts$/i] },
                { key: 'shorts_grid_shelf', rules: [/^Shorts$/i] },
                { key: 'more_from_game_shelf', rules: [/^更多此遊戲相關內容$/i] },
                { key: 'members_early_access', rules: [/會員優先|Members Early Access|Early access for members/i] }
            ];
        }
        check(element, textContent) {
            const enables = this.config.get('RULE_ENABLES');
            for (const def of this.definitions) {
                if (enables[def.key]) {
                    for (const rule of def.rules) {
                        if (rule instanceof RegExp) {
                            if (rule.test(textContent)) return def.key;
                        } else if (textContent.includes(rule)) {
                            return def.key;
                        }
                    }
                }
            }
            return null;
        }
    }

    const BATCH_SIZE = 50;
    const IDLE_TIMEOUT = 500;
    const MUTATION_THRESHOLD = 100;
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
        get isLive() { return this._liveViewers !== null; }
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
                if (this.el.querySelector(SELECTORS.BADGES.MIX)) {
                    this._isPlaylist = true;
                    return true;
                }
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
    class VideoFilter {
        constructor(config) {
            this.config = config;
            this.customRules = new CustomRuleManager(config);
            this.observer = null;
            this.hasValidatedSelectors = false;
        }
        start() {
            if (this.observer) return;
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
            const sample = elements.find(el =>
                /VIDEO|LOCKUP|RICH-ITEM/.test(el.tagName) &&
                !el.hidden &&
                el.offsetParent !== null &&
                el.querySelector(SELECTORS.METADATA.TITLE)
            );
            if (!sample) return;
            this.hasValidatedSelectors = true;
            let issues = [];
            if (!sample.querySelector(SELECTORS.METADATA.CHANNEL)) issues.push('METADATA.CHANNEL');
            if (issues.length > 0) {
                Logger.warn(`⚠️ Selector Health Check Failed: ${issues.join(', ')} not found in active element`, sample);
            } else {
                Logger.info('✅ Selector Health Check Passed');
            }
        }
        get isPageAllowingContent() {
            const path = window.location.pathname;
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
            const container = element.closest('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-playlist-renderer, ytd-rich-section-renderer, ytd-reel-shelf-renderer, ytd-playlist-panel-video-renderer') || element;
            if (container.dataset.ypChecked || container.dataset.ypHidden) {
                element.dataset.ypChecked = 'true';
                return;
            }
            if (element.hidden || element.hasAttribute('hidden')) {
                return this._hide(element, 'native_hidden');
            }
            const textRule = this.customRules.check(element, element.textContent);
            if (textRule) return this._hide(element, textRule);
            if (this._checkSectionFilter(element)) return;
            if (this.isPageAllowingContent) {
                container.dataset.ypChecked = 'true';
                element.dataset.ypChecked = 'true';
                return;
            }
            const isVideoElement = /VIDEO|LOCKUP|RICH-ITEM|PLAYLIST-PANEL-VIDEO/.test(element.tagName);
            if (isVideoElement) {
                if (element.tagName === 'YTD-PLAYLIST-PANEL-VIDEO-RENDERER') {
                    container.dataset.ypChecked = 'true';
                    element.dataset.ypChecked = 'true';
                    return;
                }
                const item = new LazyVideoData(element);
                let filterReason = null;
                filterReason = filterReason || this._getFilterKeyword(item);
                filterReason = filterReason || this._getFilterChannel(item);
                if (!filterReason && this.config.get('RULE_ENABLES').members_only && item.isMembers) {
                    filterReason = 'members_only_js';
                }
                filterReason = filterReason || this._getFilterView(item);
                filterReason = filterReason || this._getFilterDuration(item);
                filterReason = filterReason || this._getFilterPlaylist(item);
                if (filterReason) {
                    const whitelistReason = this._checkWhitelist(item);
                    if (whitelistReason) {
                        const savedBy = whitelistReason === 'channel_whitelist' ? 'Channel' : 'Keyword';
                        Logger.info(`✅ Keep [Saved by ${savedBy} Whitelist]: ${item.channel} | ${item.title} (Triggered: ${filterReason})`, container);
                        container.dataset.ypChecked = 'true';
                        element.dataset.ypChecked = 'true';
                    } else {
                        this._hide(element, filterReason, item);
                    }
                    return;
                }
            }
            container.dataset.ypChecked = 'true';
            element.dataset.ypChecked = 'true';
        }
        _checkSectionFilter(element) {
            if (!/RICH-SECTION|REEL-SHELF|SHELF-RENDERER/.test(element.tagName)) return false;
            if (!this.config.get('ENABLE_SECTION_FILTER')) return false;
            let titleText = '';
            for (const sel of SELECTORS.SHELF_TITLE) {
                const titleEl = element.querySelector(sel);
                if (titleEl) {
                    titleText = titleEl.textContent.trim();
                    break;
                }
            }
            if (!titleText) return false;
            const compiled = this.config.get('compiledSectionBlacklist');
            if (compiled && compiled.some(rx => rx.test(titleText))) {
                this._hide(element, 'section_blacklist');
                return true;
            }
            return false;
        }
        _checkWhitelist(item) {
            const channel = item.channel;
            const title = item.title;
            const config = this.config;
            const compiledChannels = config.get('compiledChannelWhitelist');
            if (compiledChannels && compiledChannels.length > 0 && channel) {
                const isMatch = compiledChannels.some(rx => rx.test(channel));
                if (isMatch) return 'channel_whitelist';
            }
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
                if (compiled.some(rx => rx.test(item.title))) return 'keyword_blacklist';
            } else {
                const title = item.title.toLowerCase();
                if (this.config.get('KEYWORD_BLACKLIST').some(k => title.includes(k.toLowerCase()))) return 'keyword_blacklist';
            }
            return null;
        }
        _getFilterChannel(item) {
            if (!this.config.get('ENABLE_CHANNEL_FILTER') || !item.channel) return null;
            const compiled = this.config.get('compiledChannels');
            if (this.config.get('ENABLE_REGION_CONVERT') && compiled) {
                if (compiled.some(rx => rx.test(item.channel))) return 'channel_blacklist';
            } else {
                const channel = item.channel.toLowerCase();
                if (this.config.get('CHANNEL_BLACKLIST').some(k => channel.includes(k.toLowerCase()))) return 'channel_blacklist';
            }
            return null;
        }
        _getFilterView(item) {
            if (!this.config.get('ENABLE_LOW_VIEW_FILTER') || item.isShorts) return null;
            const th = this.config.get('LOW_VIEW_THRESHOLD');
            const grace = this.config.get('GRACE_PERIOD_HOURS') * 60;
            if (item.isLive && item.liveViewers !== null && item.liveViewers < th) {
                return 'low_viewer_live';
            }
            if (!item.isLive && item.viewCount !== null && item.timeAgo !== null &&
                item.timeAgo > grace && item.viewCount < th) {
                return 'low_view';
            }
            return null;
        }
        _getFilterDuration(item) {
            if (!this.config.get('ENABLE_DURATION_FILTER') || item.isShorts || item.duration === null) return null;
            const min = this.config.get('DURATION_MIN');
            const max = this.config.get('DURATION_MAX');
            if ((min > 0 && item.duration < min) || (max > 0 && item.duration > max)) {
                return 'duration_filter';
            }
            return null;
        }
        _getFilterPlaylist(item) {
            if (!this.config.get('RULE_ENABLES').recommended_playlists || !item.isPlaylist) return null;
            if (item.isUserPlaylist) return null;
            return 'recommended_playlists';
        }
        _hide(element, reason, item = null) {
            const container = element.closest('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-playlist-renderer, ytd-rich-section-renderer, ytd-reel-shelf-renderer, ytd-playlist-panel-video-renderer') || element;
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
            if (reason === 'native_hidden') return;
            if (item && item.url) {
                Logger.info(`Hidden [${reason}]\nTitle: ${item.title}\nChannel: ${item.channel}\nURL: ${item.url}`, container);
            } else {
                Logger.info(`Hidden [${reason}]`, container);
            }
        }
        clearCache() {
            document.querySelectorAll('[data-yp-checked]').forEach(el => delete el.dataset.ypChecked);
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

    class InteractionEnhancer {
        constructor(config) {
            this.config = config;
        }
        findPrimaryLink(container) {
            if (!container) return null;
            for (const sel of SELECTORS.LINK_CANDIDATES) {
                const a = container.querySelector(sel);
                if (a?.href) return a;
            }
            return container.querySelector('a[href*="/watch?"], a[href*="/shorts/"], a[href*="/playlist?"]');
        }
        init() {
            document.addEventListener('click', (e) => {
                if (e.target.closest('[data-yp-hidden]')) return;
                if (this.config.get('OPEN_NOTIFICATIONS_IN_NEW_TAB')) {
                    const notificationPanel = e.target.closest('ytd-notification-renderer, ytd-comment-video-thumbnail-header-renderer, #sections.ytd-multi-page-menu-renderer');
                    if (notificationPanel) {
                        const link = e.target.closest('a.yt-simple-endpoint, a[href*="/watch?"]');
                        if (link && link.href && !e.target.closest('yt-icon-button, button')) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            window.open(link.href, '_blank');
                            return;
                        }
                    }
                }
                if (!this.config.get('OPEN_IN_NEW_TAB')) return;
                if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
                if (e.target.closest(SELECTORS.INTERACTION_EXCLUDE)) return;
                let targetLink = null;
                const previewPlayer = e.target.closest(SELECTORS.PREVIEW_PLAYER);
                if (previewPlayer) {
                    targetLink = this.findPrimaryLink(previewPlayer) || this.findPrimaryLink(previewPlayer.closest(SELECTORS.CLICKABLE.join(',')));
                } else {
                    const container = e.target.closest(SELECTORS.CLICKABLE.join(', '));
                    if (!container) return;
                    const channelLink = e.target.closest('a#avatar-link, .ytd-channel-name a, a[href^="/@"], a[href^="/channel/"]');
                    targetLink = channelLink?.href ? channelLink : this.findPrimaryLink(container);
                }
                if (!targetLink) return;
                try {
                    const hostname = new URL(targetLink.href, location.origin).hostname;
                    const isValidTarget = targetLink.href && /(^|\.)youtube\.com$/.test(hostname);
                    if (isValidTarget) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        window.open(targetLink.href, '_blank');
                    }
                } catch (err) {  }
            }, { capture: true });
        }
    }

    const I18N = {
        _lang: null,
        strings: {
            'zh-TW': {
                title: 'YouTube 淨化大師',
                menu_rules: '📂 設定過濾規則',
                menu_low_view: '低觀看數過濾 (含直播)',
                menu_threshold: '🔢 設定閾值',
                menu_grace: '⏳ 設定豁免期',
                menu_advanced: '🚫 進階過濾',
                menu_new_tab: '強制新分頁 (影片)',
                menu_notification_new_tab: '強制新分頁 (通知)',
                menu_debug: 'Debug',
                menu_reset: '🔄 恢復預設',
                menu_stats: '📊 過濾統計',
                menu_export: '💾 匯出/匯入設定',
                menu_lang: '🌐 語言',
                menu_input: '輸入選項:',
                stats_title: '【 過濾統計 】',
                stats_empty: '尚未過濾任何內容',
                stats_filtered: '已過濾 {0} 個項目',
                export_title: '【 設定管理 】',
                export_export: '📤 匯出設定',
                export_import: '📥 匯入設定',
                export_success: '✅ 設定已複製到剪貼簿！',
                export_copy: '請複製以下設定 (Ctrl+C):',
                import_prompt: '請貼上設定 JSON:',
                import_success: '✅ 設定已成功匯入！',
                import_fail: '❌ 匯入失敗: ',
                rules_title: '【 過濾規則 】',
                rules_back: '(0 返回)',
                threshold_prompt: '請輸入「觀看數閾值」 (低於此數將被過濾):',
                grace_prompt: '請輸入「豁免時間 (小時)」 (設為 0 則不豁免):',
                adv_exact_prompt: '是否需精準匹配頻道名稱？ (1. 是 / 2. 否)\n\n※精準匹配：必須完全一致\n※模糊匹配：包含關鍵字即可',
                reset_confirm: '重設?',
                lang_title: '【 選擇語言 】',
                back: '返回',
                adv_keyword_filter: '關鍵字過濾',
                adv_keyword_list: '✏️ 關鍵字清單',
                adv_channel_filter: '頻道過濾',
                adv_channel_list: '✏️ 頻道黑名單',
                adv_channel_whitelist: '🛡️ 頻道白名單 (例外放行)',
                adv_exact_match: '🎯 頻道白名單需精準匹配',
                adv_keyword_whitelist: '🛡️ 關鍵字白名單 (例外放行)',
                adv_section_filter: '欄位過濾',
                adv_section_list: '✏️ 欄位標題清單',
                adv_duration_filter: '長度過濾',
                adv_duration_set: '⏱️ 設定長度',
                adv_min: '最短(分):',
                adv_max: '最長(分):',
                adv_add: '新增',
                adv_remove: '刪除',
                adv_clear: '🧹 清空全部',
                adv_restore: '✨ 恢復預設',
                adv_region_convert: '繁簡通用過濾',
                adv_disable_channel: '頻道頁面停止過濾 (保留內容)'
            },
            'zh-CN': {
                title: 'YouTube 净化大师',
                menu_rules: '📂 设置过滤规则',
                menu_low_view: '低观看数过滤 (含直播)',
                menu_threshold: '🔢 设置阈值',
                menu_grace: '⏳ 设置豁免期',
                menu_advanced: '🚫 高级过滤',
                menu_new_tab: '强制新标签页 (视频)',
                menu_notification_new_tab: '强制新标签页 (通知)',
                menu_debug: 'Debug',
                menu_reset: '🔄 恢复默认',
                menu_stats: '📊 过滤统计',
                menu_export: '💾 导出/导入设置',
                menu_lang: '🌐 语言',
                menu_input: '输入选项:',
                stats_title: '【 过滤统计 】',
                stats_empty: '尚未过滤任何内容',
                stats_filtered: '已过滤 {0} 个项目',
                export_title: '【 设置管理 】',
                export_export: '📤 导出设置',
                export_import: '📥 导入设置',
                export_success: '✅ 设置已复制到剪贴板！',
                export_copy: '请复制以下设置 (Ctrl+C):',
                import_prompt: '请粘贴设置 JSON:',
                import_success: '✅ 设置已成功导入！',
                import_fail: '❌ 导入失败: ',
                rules_title: '【 过滤规则 】',
                rules_back: '(0 返回)',
                threshold_prompt: '请输入「观看数阈值」 (低于此数将被过滤):',
                grace_prompt: '请输入「豁免时间 (小时)」 (设为 0 则不豁免):',
                adv_exact_prompt: '是否需精準匹配频道名称？ (1. 是 / 2. 否)\n\n※精準匹配：必须完全一致\n※模糊匹配：包含关键字即可',
                reset_confirm: '重置?',
                lang_title: '【 选择语言 】',
                back: '返回',
                adv_keyword_filter: '关键字过滤',
                adv_keyword_list: '✏️ 关键字列表',
                adv_channel_filter: '频道过滤',
                adv_channel_list: '✏️ 频道黑名单',
                adv_channel_whitelist: '🛡️ 频道白名单 (例外放行)',
                adv_exact_match: '🎯 频道白名单需精准匹配',
                adv_keyword_whitelist: '🛡️ 关键字白名单 (例外放行)',
                adv_section_filter: '栏位过滤',
                adv_section_list: '✏️ 栏位标题列表',
                adv_duration_filter: '时长过滤',
                adv_duration_set: '⏱️ 设置时长',
                adv_min: '最短(分):',
                adv_max: '最长(分):',
                adv_add: '新增',
                adv_remove: '删除',
                adv_clear: '🧹 清空全部',
                adv_restore: '✨ 恢复默认',
                adv_region_convert: '繁简通用过滤',
                adv_disable_channel: '频道页面停止过滤 (保留内容)'
            },
            'en': {
                title: 'YouTube Cleaner',
                menu_rules: '📂 Filter Rules',
                menu_low_view: 'Low View Count Filter (Live included)',
                menu_threshold: '🔢 Set Threshold',
                menu_grace: '⏳ Set Grace Period',
                menu_advanced: '🚫 Advanced Filtering',
                menu_new_tab: 'Force New Tab (Video)',
                menu_notification_new_tab: 'Force New Tab (Notif)',
                menu_debug: 'Debug',
                menu_reset: '🔄 Reset to Default',
                menu_stats: '📊 Filter Stats',
                menu_export: '💾 Export/Import Settings',
                menu_lang: '🌐 Language',
                menu_input: 'Enter option:',
                stats_title: '【 Filter Statistics 】',
                stats_empty: 'No content filtered yet',
                stats_filtered: 'Filtered {0} items',
                export_title: '【 Settings Management 】',
                export_export: '📤 Export Settings',
                export_import: '📥 Import Settings',
                export_success: '✅ Settings copied to clipboard!',
                export_copy: 'Copy settings (Ctrl+C):',
                import_prompt: 'Paste settings JSON:',
                import_success: '✅ Settings imported successfully!',
                import_fail: '❌ Import failed: ',
                rules_title: '【 Filter Rules 】',
                rules_back: '(0 Back)',
                threshold_prompt: 'Enter View Threshold:',
                grace_prompt: 'Enter Grace Period (Hours) (0 to disable):',
                adv_exact_prompt: 'Use exact match for this channel? (1. Yes / 2. No)\n\n※Exact: Must be identical\n※Partial: Contains keyword',
                reset_confirm: 'Reset?',
                lang_title: '【 Select Language 】',
                back: 'Back',
                adv_keyword_filter: 'Keyword Filter',
                adv_keyword_list: '✏️ Keyword List',
                adv_channel_filter: 'Channel Filter',
                adv_channel_list: '✏️ Channel Blacklist',
                adv_channel_whitelist: '🛡️ Channel Whitelist',
                adv_exact_match: '🎯 Exact Channel Match',
                adv_keyword_whitelist: '🛡️ Keyword Whitelist',
                adv_section_filter: 'Section Filter',
                adv_section_list: '✏️ Section Title List',
                adv_duration_filter: 'Duration Filter',
                adv_duration_set: '⏱️ Set Duration',
                adv_min: 'Min (min):',
                adv_max: 'Max (min):',
                adv_add: 'Add',
                adv_remove: 'Remove',
                adv_clear: '🧹 Clear All',
                adv_restore: '✨ Restore Defaults',
                adv_region_convert: 'Region Agnostic Filter',
                adv_disable_channel: 'Disable on Channel Pages'
            },
            'ja': {
                title: 'YouTube 浄化大師',
                menu_rules: '📂 フィルタールール設定',
                menu_low_view: '低視聴回数フィルター (ライブ含む)',
                menu_threshold: '🔢 閾値を設定',
                menu_grace: '⏳ 猶予期間を設定',
                menu_advanced: '🚫 詳細設定',
                menu_new_tab: '強制新タブ (動画)',
                menu_notification_new_tab: '強制新タブ (通知)',
                menu_debug: 'デバッグ',
                menu_reset: '🔄 デフォルトに戻す',
                menu_stats: '📊 統計情報',
                menu_export: '💾 設定のエクスポート/インポート',
                menu_lang: '🌐 言語',
                menu_input: '選んでください:',
                stats_title: '【 統計情報 】',
                stats_empty: 'まだ何もフィルタリングされていません',
                stats_filtered: '{0} 個の項目をフィルタリングしました',
                export_title: '【 設定管理 】',
                export_export: '📤 設定をエクスポート',
                export_import: '📥 設定をインポート',
                export_success: '✅ 設定をクリップボードにコピーしました！',
                export_copy: '以下の設定をコピーしてください (Ctrl+C):',
                import_prompt: '設定 JSON を貼り付けてください:',
                import_success: '✅ 設定をインポートしました！',
                import_fail: '❌ インポート失敗: ',
                rules_title: '【 フィルタールール 】',
                rules_back: '(0 戻る)',
                threshold_prompt: '「視聴回数閾値」を入力してください (これ未満は非表示):',
                grace_prompt: '「猶予期間 (時間)」を入力してください (0 は猶予なし):',
                adv_exact_prompt: 'このチャンネルを完全一致で追加しますか？ (1. はい / 2. いいえ)\n\n※完全一致：名前が完全に同じ\n※部分一致：名前の一部を含む',
                reset_confirm: 'リセットしますか？',
                lang_title: '【 言語を選択 】',
                back: '戻る',
                adv_keyword_filter: 'キーワードフィルター',
                adv_keyword_list: '✏️ キーワードリスト',
                adv_channel_filter: 'チャンネルフィルター',
                adv_channel_list: '✏️ チャンネルブラックリスト',
                adv_channel_whitelist: '🛡️ チャンネルホワイトリスト',
                adv_exact_match: '🎯 チャンネル名の完全一致が必要',
                adv_keyword_whitelist: '🛡️ キーワードホワイトリスト',
                adv_section_filter: 'セクションフィルター',
                adv_section_list: '✏️ セクションタイトルリスト',
                adv_duration_filter: '動画の長さフィルター',
                adv_duration_set: '⏱️ 長さを設定',
                adv_min: '最短(分):',
                adv_max: '最長(分):',
                adv_add: '追加',
                adv_remove: '削除',
                adv_clear: '🧹 全てクリア',
                adv_restore: '✨ デフォルトに戻す',
                adv_region_convert: '繁体字/簡体字共通フィルター',
                adv_disable_channel: 'チャンネルページではフィルターを無効にする'
            }
        },
        ruleNames: {
            'zh-TW': {
                ad_block_popup: '廣告阻擋彈窗',
                ad_sponsor: '廣告/贊助',
                members_only: '會員專屬',
                shorts_item: 'Shorts 項目',
                mix_only: '合輯',
                premium_banner: 'Premium 橫幅',
                news_block: '新聞區塊',
                shorts_block: 'Shorts 區塊',
                posts_block: '社群貼文',
                playables_block: '可玩內容',
                fundraiser_block: '募款活動',
                shorts_grid_shelf: 'Shorts 網格',
                movies_shelf: '電影推薦',
                youtube_featured_shelf: 'YouTube 精選',
                popular_gaming_shelf: '熱門遊戲',
                more_from_game_shelf: '更多遊戲內容',
                trending_playlist: '熱門播放清單',
                inline_survey: '問卷調查',
                clarify_box: '資訊框',
                explore_topics: '探索主題',
                recommended_playlists: '推薦播放清單',
                members_early_access: '會員搶先看'
            },
            'zh-CN': {
                ad_block_popup: '广告拦截弹窗',
                ad_sponsor: '广告/赞助',
                members_only: '会员专属',
                shorts_item: 'Shorts 项目',
                mix_only: '合辑',
                premium_banner: 'Premium 横幅',
                news_block: '新闻区块',
                shorts_block: 'Shorts 区块',
                posts_block: '社区帖子',
                playables_block: '可玩内容',
                fundraiser_block: '募款活动',
                shorts_grid_shelf: 'Shorts 网格',
                movies_shelf: '电影推荐',
                youtube_featured_shelf: 'YouTube 精选',
                popular_gaming_shelf: '热门游戏',
                more_from_game_shelf: '更多游戏内容',
                trending_playlist: '热门播放列表',
                inline_survey: '问卷调查',
                clarify_box: '信息框',
                explore_topics: '探索主题',
                recommended_playlists: '推荐播放列表',
                members_early_access: '会员抢先看'
            },
            'en': {
                ad_block_popup: 'Ad-block Popup',
                ad_sponsor: 'Ads / Sponsors',
                members_only: 'Members Only',
                shorts_item: 'Shorts Items',
                mix_only: 'Mix Playlists',
                premium_banner: 'Premium Banner',
                news_block: 'News Section',
                shorts_block: 'Shorts Section',
                posts_block: 'Community Posts',
                playables_block: 'Playables',
                fundraiser_block: 'Fundraiser',
                shorts_grid_shelf: 'Shorts Grid',
                movies_shelf: 'Movies Shelf',
                youtube_featured_shelf: 'YouTube Featured',
                popular_gaming_shelf: 'Popular Gaming',
                more_from_game_shelf: 'More from Games',
                trending_playlist: 'Trending Playlist',
                inline_survey: 'Surveys',
                clarify_box: 'Clarify Box',
                explore_topics: 'Explore Topics',
                recommended_playlists: 'Recommended Playlists',
                members_early_access: 'Members Early Access'
            },
            'ja': {
                ad_block_popup: '広告ブロックポップアップ',
                ad_sponsor: '広告/スポンサー',
                members_only: 'メンバー限定',
                shorts_item: 'Shorts 項目',
                mix_only: 'ミックスリスト',
                premium_banner: 'Premium バナー',
                news_block: 'ニュースセクション',
                shorts_block: 'Shorts セクション',
                posts_block: 'コミュニティ投稿',
                playables_block: 'プレイアブル',
                fundraiser_block: '募金活動',
                shorts_grid_shelf: 'Shorts グリッド',
                movies_shelf: '映画の推奨',
                youtube_featured_shelf: 'YouTube 特選',
                popular_gaming_shelf: '人気のゲーム',
                more_from_game_shelf: 'このゲームの関連コンテンツ',
                trending_playlist: '急上昇プレイリスト',
                inline_survey: 'アンケート',
                clarify_box: '情報パネル',
                explore_topics: 'トピックを探索',
                recommended_playlists: 'おすすめのプレイリスト',
                members_early_access: 'メンバー限定先行公開'
            }
        },
        getRuleName(ruleKey) {
            return this.ruleNames[this.lang]?.[ruleKey] || this.ruleNames['en'][ruleKey] || ruleKey;
        },
        detectLanguage() {
            const ytLang = document.documentElement.lang || navigator.language || 'zh-TW';
            if (ytLang.startsWith('zh-CN') || ytLang.startsWith('zh-Hans')) return 'zh-CN';
            if (ytLang.startsWith('zh')) return 'zh-TW';
            if (ytLang.startsWith('ja')) return 'ja';
            return 'en';
        },
        get lang() {
            if (!this._lang) {
                this._lang = GM_getValue('ui_language', null) || this.detectLanguage();
            }
            return this._lang;
        },
        set lang(value) {
            this._lang = value;
            GM_setValue('ui_language', value);
        },
        t(key, ...args) {
            const str = this.strings[this.lang]?.[key] || this.strings['en'][key] || key;
            return str.replace(/\{(\d+)\}/g, (_, i) => args[i] ?? '');
        },
        get availableLanguages() {
            return {
                'zh-TW': '繁體中文',
                'zh-CN': '简体中文',
                'en': 'English',
                'ja': '日本語'
            };
        }
    };

    class UIManager {
        constructor(config, onRefresh) {
            this.config = config;
            this.onRefresh = onRefresh;
        }
        t(key, ...args) {
            return I18N.t(key, ...args);
        }
        _renderMenu(title, items, backAction = null) {
            const visibleItems = items.filter(item => item.show !== false);
            const menuString = visibleItems
                .map((item, idx) => `${idx + 1}. ${item.label}`)
                .join('\n');
            const footer = backAction ? `\n0. ${this.t('back')}` : '';
            const promptText = `【 ${title} 】\n\n${menuString}${footer}\n\n${this.t('menu_input')}`;
            const choice = prompt(promptText);
            if (choice === '0' && backAction) {
                backAction();
                return;
            }
            const selected = visibleItems[parseInt(choice) - 1];
            if (selected && selected.action) {
                selected.action();
            }
        }
        showMainMenu() {
            const i = (k) => this.config.get(k) ? '✅' : '❌';
            const statsInfo = FilterStats.session.total > 0 ? ` (${FilterStats.session.total})` : '';
            const langName = I18N.availableLanguages[I18N.lang];
            const items = [
                { label: this.t('menu_rules'), action: () => this.showRuleMenu() },
                { label: `${i('ENABLE_LOW_VIEW_FILTER')} ${this.t('menu_low_view')}`, action: () => this.toggle('ENABLE_LOW_VIEW_FILTER') },
                { label: `${this.t('menu_threshold')} (${this.config.get('LOW_VIEW_THRESHOLD')})`, action: () => this.promptNumber('LOW_VIEW_THRESHOLD', 'threshold_prompt') },
                { label: `${this.t('menu_grace')} (${this.config.get('GRACE_PERIOD_HOURS')}h)`, action: () => this.promptNumber('GRACE_PERIOD_HOURS', 'grace_prompt') },
                { label: this.t('menu_advanced'), action: () => this.showAdvancedMenu() },
                { label: `${i('OPEN_IN_NEW_TAB')} ${this.t('menu_new_tab')}`, action: () => this.toggle('OPEN_IN_NEW_TAB') },
                { label: `${i('OPEN_NOTIFICATIONS_IN_NEW_TAB')} ${this.t('menu_notification_new_tab')}`, action: () => this.toggle('OPEN_NOTIFICATIONS_IN_NEW_TAB') },
                { label: `${i('DEBUG_MODE')} ${this.t('menu_debug')}`, action: () => this.toggle('DEBUG_MODE') },
                { label: this.t('menu_reset'), action: () => this.resetSettings() },
                { label: `${this.t('menu_stats')}${statsInfo}`, action: () => this.showStats() },
                { label: this.t('menu_export'), action: () => this.showExportImportMenu() },
                { label: `${this.t('menu_lang')} [${langName}]`, action: () => this.showLanguageMenu() }
            ];
            this._renderMenu(`${this.t('title')} v${GM_info.script.version}`, items);
        }
        showAdvancedMenu() {
            const i = (k) => this.config.get(k) ? '✅' : '❌';
            const items = [
                { label: `${i('ENABLE_KEYWORD_FILTER')} ${this.t('adv_keyword_filter')}`, action: () => this.toggle('ENABLE_KEYWORD_FILTER', true) },
                { label: this.t('adv_keyword_list'), action: () => this.manage('KEYWORD_BLACKLIST') },
                { label: `${i('ENABLE_CHANNEL_FILTER')} ${this.t('adv_channel_filter')}`, action: () => this.toggle('ENABLE_CHANNEL_FILTER', true) },
                { label: this.t('adv_channel_list'), action: () => this.manage('CHANNEL_BLACKLIST') },
                { label: this.t('adv_channel_whitelist'), action: () => this.manage('CHANNEL_WHITELIST') },
                { label: `${i('EXACT_CHANNEL_WHITELIST')} ${this.t('adv_exact_match')}`, action: () => this.toggle('EXACT_CHANNEL_WHITELIST', true) },
                { label: this.t('adv_keyword_whitelist'), action: () => this.manage('KEYWORD_WHITELIST') },
                { label: `${i('ENABLE_SECTION_FILTER')} ${this.t('adv_section_filter')}`, action: () => this.toggle('ENABLE_SECTION_FILTER', true) },
                { label: this.t('adv_section_list'), action: () => this.manage('SECTION_TITLE_BLACKLIST') },
                { label: `${i('ENABLE_DURATION_FILTER')} ${this.t('adv_duration_filter')}`, action: () => this.toggle('ENABLE_DURATION_FILTER', true) },
                { label: this.t('adv_duration_set'), action: () => this.promptDuration() },
                { label: `${i('ENABLE_REGION_CONVERT')} ${this.t('adv_region_convert')}`, action: () => this.toggle('ENABLE_REGION_CONVERT', true) },
                { label: `${i('DISABLE_FILTER_ON_CHANNEL')} ${this.t('adv_disable_channel')}`, action: () => this.toggle('DISABLE_FILTER_ON_CHANNEL', true) }
            ];
            this._renderMenu(this.t('menu_advanced'), items, () => this.showMainMenu());
        }
        showRuleMenu() {
            const r = this.config.get('RULE_ENABLES');
            const keys = Object.keys(r);
            const items = keys.map(key => ({
                label: `[${r[key] ? '✅' : '❌'}] ${I18N.getRuleName(key)}`,
                action: () => {
                    this.config.toggleRule(key);
                    this.onRefresh();
                    this.showRuleMenu();
                }
            }));
            this._renderMenu(this.t('rules_title'), items, () => this.showMainMenu());
        }
        manage(k) {
            const l = this.config.get(k);
            const title = `[ ${k} ]\n${l.join(', ') || '(Empty)'}`;
            const items = [
                { label: this.t('adv_add'), action: () => this.addItem(k, l) },
                { label: this.t('adv_remove'), action: () => this.removeItem(k, l) },
                { label: this.t('adv_clear'), action: () => this.clearList(k) },
                { label: this.t('adv_restore'), action: () => this.restoreDefaults(k) }
            ];
            this._renderMenu(title, items, () => this.showAdvancedMenu());
        }
        toggle(k, isAdvanced = false) {
            this.config.set(k, !this.config.get(k));
            this.onRefresh();
            isAdvanced ? this.showAdvancedMenu() : this.showMainMenu();
        }
        promptNumber(key, promptKey) {
            const v = prompt(this.t(promptKey), this.config.get(key));
            const num = Number(v);
            if (v !== null && !isNaN(num)) {
                this.config.set(key, num);
                this.onRefresh();
            } else if (v !== null) {
                alert('❌ ' + this.t('invalid_number'));
            }
            this.showMainMenu();
        }
        promptDuration() {
            const min = prompt(this.t('adv_min'), this.config.get('DURATION_MIN') / 60);
            const max = prompt(this.t('adv_max'), this.config.get('DURATION_MAX') / 60);
            if (min !== null) {
                const m = Number(min);
                if (!isNaN(m)) this.config.set('DURATION_MIN', m * 60);
            }
            if (max !== null) {
                const m = Number(max);
                if (!isNaN(m)) this.config.set('DURATION_MAX', m * 60);
            }
            this.onRefresh();
            this.showAdvancedMenu();
        }
        addItem(k, currentList) {
            const v = prompt(`${this.t('adv_add')}:`);
            if (!v) { this.manage(k); return; }
            let itemsToAdd = v.split(',').map(s => s.trim()).filter(Boolean);
            if (k === 'CHANNEL_WHITELIST' && itemsToAdd.length > 0) {
                const mode = prompt(this.t('adv_exact_prompt'), '1');
                if (mode === '1') itemsToAdd = itemsToAdd.map(item => '=' + item);
            }
            this.config.set(k, [...new Set([...currentList, ...itemsToAdd])]);
            this.onRefresh();
            this.manage(k);
        }
        removeItem(k, currentList) {
            const v = prompt(`${this.t('adv_remove')}:`);
            if (v) {
                this.config.set(k, currentList.filter(i => i !== v.trim()));
                this.onRefresh();
            }
            this.manage(k);
        }
        clearList(k) {
            if (confirm(this.t('adv_clear') + '?')) {
                this.config.set(k, []);
                this.onRefresh();
            }
            this.manage(k);
        }
        restoreDefaults(k) {
            if (confirm(this.t('adv_restore') + '?')) {
                const allDefaults = this.config.defaults[k];
                if (Array.isArray(allDefaults) && k === 'SECTION_TITLE_BLACKLIST') {
                    const currentLang = I18N.lang;
                    const filtered = allDefaults.filter(item => {
                        const isEnglish = /[a-zA-Z]/.test(item);
                        const isChinese = /[\u4e00-\u9fa5]/.test(item);
                        const isJapanese = /[\u3040-\u30ff]/.test(item);
                        if (currentLang.startsWith('zh')) return isChinese || isEnglish;
                        if (currentLang === 'ja') return isJapanese || isEnglish;
                        return isEnglish;
                    });
                    this.config.set(k, filtered);
                } else {
                    this.config.set(k, [...allDefaults]);
                }
                this.onRefresh();
            }
            this.manage(k);
        }
        resetSettings() {
            if (confirm(this.t('reset_confirm'))) {
                Object.keys(this.config.defaults).forEach(k => {
                    this.config.set(k, this.config.defaults[k]);
                });
                this.onRefresh();
                alert('✅ ' + this.t('import_success'));
            }
            this.showMainMenu();
        }
        showStats() {
            const summary = FilterStats.getSummary();
            alert(`${this.t('stats_title')}\n\n${summary || this.t('stats_empty')}`);
            this.showMainMenu();
        }
        showLanguageMenu() {
            const langs = I18N.availableLanguages;
            const keys = Object.keys(langs);
            const current = I18N.lang;
            const items = keys.map(k => ({
                label: `${k === current ? '✅' : '⬜'} ${langs[k]}`,
                action: () => {
                    I18N.lang = k;
                    alert(`✅ ${langs[k]}`);
                    this.showMainMenu();
                }
            }));
            this._renderMenu(this.t('lang_title'), items, () => this.showMainMenu());
        }
        showExportImportMenu() {
            const items = [
                { label: this.t('export_export'), action: () => this.exportSettings() },
                { label: this.t('export_import'), action: () => this.importSettings() }
            ];
            this._renderMenu(this.t('export_title'), items, () => this.showMainMenu());
        }
        exportSettings() {
            const exportData = {
                version: GM_info.script.version,
                timestamp: new Date().toISOString(),
                settings: this.config.state,
                language: I18N.lang
            };
            const json = JSON.stringify(exportData, null, 2);
            try {
                GM_setClipboard(json);
                alert(this.t('export_success'));
            } catch (e) {
                prompt(this.t('export_copy'), json);
            }
            this.showExportImportMenu();
        }
        importSettings() {
            const json = prompt(this.t('import_prompt'));
            if (!json) { this.showExportImportMenu(); return; }
            try {
                const data = JSON.parse(json);
                if (!data.settings) throw new Error('Invalid format');
                for (const key in data.settings) {
                    if (key in this.config.defaults) {
                        this.config.set(key, data.settings[key]);
                    }
                }
                if (data.language) I18N.lang = data.language;
                alert(this.t('import_success'));
                this.onRefresh();
            } catch (e) {
                alert(this.t('import_fail') + e.message);
            }
            this.showExportImportMenu();
        }
    }

    class App {
        constructor() {
            this.config = new ConfigManager();
            this.styleManager = new StyleManager(this.config);
            this.adGuard = new AdBlockGuard();
            this.filter = new VideoFilter(this.config);
            this.enhancer = new InteractionEnhancer(this.config);
            this.ui = new UIManager(this.config, () => this.refresh());
        }
        init() {
            Logger.enabled = this.config.get('DEBUG_MODE');
            this.styleManager.apply();
            this.adGuard.start();
            this.filter.start();
            this.enhancer.init();
            GM_registerMenuCommand('⚙️ 淨化大師設定', () => this.ui.showMainMenu());
            window.addEventListener('yt-navigate-finish', () => {
                this.adGuard.patchConfig();
                this.filter.clearCache();
                this.filter.processPage();
                this.adGuard.checkAndClean();
            });
            this.filter.processPage();
            if (typeof OpenCC !== 'undefined') {
                Logger.info('✅ 成功載入 OpenCC-JS 繁簡轉換庫');
            } else {
                Logger.info('⚠️ OpenCC-JS 未載入，繁簡過濾功能受限');
            }
            Logger.info(`🚀 YouTube 淨化大師 v${GM_info.script.version} 啟動`);
        }
        refresh() {
            Logger.enabled = this.config.get('DEBUG_MODE');
            this.filter.reset();
            this.styleManager.apply();
            this.filter.processPage();
        }
    }
    if (!window.ytPurifierInitialized) {
        window.ytPurifierInitialized = true;
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => new App().init());
        else new App().init();
    }

})();
