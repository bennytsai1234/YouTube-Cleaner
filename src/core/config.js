import { Utils } from './utils.js';

// --- 1. Core: Configuration Management ---
export class ConfigManager {
    constructor() {
        this.DEFAULT_SETTINGS = {
            // ... (existing)
            ENABLE_KEYWORD_FILTER: true,
            KEYWORD_BLACKLIST: ['預告', 'Teaser', 'Trailer', 'PV', 'CM', 'MV', 'Cover', '翻唱'],
            ENABLE_CHANNEL_FILTER: false,
            CHANNEL_BLACKLIST: [],
            ENABLE_SECTION_FILTER: true,
            SECTION_TITLE_BLACKLIST: ['耳目一新', '重溫舊愛', '合輯', 'Mixes', 'Latest posts', '最新貼文'],
            
            // ... (rest)

            ENABLE_DURATION_FILTER: false,
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
        if (key === 'SECTION_TITLE_BLACKLIST') {
            this.state.compiledSections = value.map(k => Utils.generateCnRegex(k)).filter(Boolean);
        }
    }

    toggleRule(ruleId) {
        this.state.RULE_ENABLES[ruleId] = !this.state.RULE_ENABLES[ruleId];
        this.set('RULE_ENABLES', this.state.RULE_ENABLES);
    }
}
