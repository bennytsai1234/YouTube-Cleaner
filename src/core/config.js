// --- 1. Core: Configuration Management ---
export class ConfigManager {
    constructor() {
        this.defaults = {
            LOW_VIEW_THRESHOLD: 1000,
            ENABLE_LOW_VIEW_FILTER: true,
            DEBUG_MODE: false,
            OPEN_IN_NEW_TAB: true,
            OPEN_NOTIFICATIONS_IN_NEW_TAB: true,
            ENABLE_KEYWORD_FILTER: false,
            KEYWORD_BLACKLIST: [],
            ENABLE_CHANNEL_FILTER: false,
            CHANNEL_BLACKLIST: [],
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
        return loaded;
    }

    get(key) { return this.state[key]; }

    set(key, value) {
        this.state[key] = value;
        const snake = str => str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
        if (key === 'RULE_ENABLES') GM_setValue('ruleEnables', value);
        else GM_setValue(snake(key), value);
    }

    toggleRule(ruleId) {
        this.state.RULE_ENABLES[ruleId] = !this.state.RULE_ENABLES[ruleId];
        this.set('RULE_ENABLES', this.state.RULE_ENABLES);
    }
}
