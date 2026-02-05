import { Utils } from './utils.js';

// --- 1. Core: Configuration Management ---
let instance = null;

export class ConfigManager {
    constructor() {
        if (instance) return instance;
        instance = this;
        this.defaults = {
            // 主選單設定
            OPEN_IN_NEW_TAB: true,
            OPEN_NOTIFICATIONS_IN_NEW_TAB: true,
            ENABLE_LOW_VIEW_FILTER: true,
            LOW_VIEW_THRESHOLD: 1000,
            DEBUG_MODE: true,
            // 進階過濾設定
            ENABLE_REGION_CONVERT: true,
            DISABLE_FILTER_ON_CHANNEL: true,
            // ... (existing)
            ENABLE_KEYWORD_FILTER: true,
            KEYWORD_BLACKLIST: ['預告', 'Teaser', 'Trailer', 'PV', 'CM', 'MV', 'Cover', '翻唱'],
            ENABLE_CHANNEL_FILTER: true,
            CHANNEL_BLACKLIST: [],
            CHANNEL_WHITELIST: [],
            EXACT_CHANNEL_WHITELIST: false, // 新增：是否精準匹配頻道名稱
            KEYWORD_WHITELIST: [], // 新增：關鍵字白名單
            ENABLE_SECTION_FILTER: true,
            SECTION_TITLE_BLACKLIST: [
                // 中文 (繁/簡)
                '耳目一新', '重溫舊愛', '合輯', '最新貼文', '發燒影片', '熱門', '為您推薦', '推薦', '先前搜尋內容', '相關內容',
                // English
                'New to you', 'Relive', 'Mixes', 'Latest posts', 'Trending', 'Recommended', 'People also watched', 'From your search', 'Related to', 'Previously watched',
                // Japanese
                'おすすめ', 'ミックス', '新着', 'トレンド', 'あなたへの', '関連'
            ],
            ENABLE_DURATION_FILTER: true,
            DURATION_MIN: 0,
            DURATION_MAX: 0,
            GRACE_PERIOD_HOURS: 4,
            // These connect to simple toggle switches
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

        // Pre-compile Regexes
        loaded.compiledKeywords = (loaded.KEYWORD_BLACKLIST || []).map(k => Utils.generateCnRegex(k)).filter(Boolean);
        loaded.compiledChannels = (loaded.CHANNEL_BLACKLIST || []).map(k => Utils.generateCnRegex(k)).filter(Boolean);
        loaded.compiledWhitelist = (loaded.CHANNEL_WHITELIST || []).map(k => Utils.generateCnRegex(k)).filter(Boolean);
        loaded.compiledKeywordWhitelist = (loaded.KEYWORD_WHITELIST || []).map(k => Utils.generateCnRegex(k)).filter(Boolean);
        loaded.compiledSections = (loaded.SECTION_TITLE_BLACKLIST || []).map(k => Utils.generateCnRegex(k)).filter(Boolean);

        return loaded;
    }

    get(key) { return this.state[key]; }

    set(key, value) {
        this.state[key] = value;
        const snake = str => str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
        if (key === 'RULE_ENABLES') GM_setValue('ruleEnables', value);
        else GM_setValue(snake(key), value);

        // Update compiled regexes if list changes
        if (key === 'KEYWORD_BLACKLIST') {
            this.state.compiledKeywords = value.map(k => Utils.generateCnRegex(k)).filter(Boolean);
        }
        if (key === 'CHANNEL_BLACKLIST') {
            this.state.compiledChannels = value.map(k => Utils.generateCnRegex(k)).filter(Boolean);
        }
        if (key === 'CHANNEL_WHITELIST') {
            this.state.compiledWhitelist = value.map(k => Utils.generateCnRegex(k)).filter(Boolean);
        }
        if (key === 'KEYWORD_WHITELIST') {
            this.state.compiledKeywordWhitelist = value.map(k => Utils.generateCnRegex(k)).filter(Boolean);
        }
        if (key === 'SECTION_TITLE_BLACKLIST') {
            this.state.compiledSections = value.map(k => Utils.generateCnRegex(k)).filter(Boolean);
        }
    }

    toggleRule(ruleId) {
        this.state.RULE_ENABLES[ruleId] = !this.state.RULE_ENABLES[ruleId];
        this.set('RULE_ENABLES', this.state.RULE_ENABLES);
    }
}
