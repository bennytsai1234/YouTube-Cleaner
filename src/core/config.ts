import { Utils } from './utils';

declare const GM_getValue: (key: string, defaultValue?: any) => any;
declare const GM_setValue: (key: string, value: any) => void;

// --- 1. Core: Configuration Management ---
let instance: ConfigManager | null = null;

export interface RuleEnables {
    ad_block_popup: boolean;
    ad_sponsor: boolean;
    members_only: boolean;
    shorts_item: boolean;
    mix_only: boolean;
    premium_banner: boolean;
    news_block: boolean;
    shorts_block: boolean;
    posts_block: boolean;
    playables_block: boolean;
    fundraiser_block: boolean;
    shorts_grid_shelf: boolean;
    movies_shelf: boolean;
    youtube_featured_shelf: boolean;
    popular_gaming_shelf: boolean;
    more_from_game_shelf: boolean;
    trending_playlist: boolean;
    inline_survey: boolean;
    clarify_box: boolean;
    explore_topics: boolean;
    recommended_playlists: boolean;
    members_early_access: boolean;
}

export interface ConfigState {
    OPEN_IN_NEW_TAB: boolean;
    OPEN_NOTIFICATIONS_IN_NEW_TAB: boolean;
    ENABLE_LOW_VIEW_FILTER: boolean;
    LOW_VIEW_THRESHOLD: number;
    DEBUG_MODE: boolean;
    ENABLE_REGION_CONVERT: boolean;
    DISABLE_FILTER_ON_CHANNEL: boolean;
    ENABLE_KEYWORD_FILTER: boolean;
    KEYWORD_BLACKLIST: string[];
    ENABLE_CHANNEL_FILTER: boolean;
    CHANNEL_BLACKLIST: string[];
    CHANNEL_WHITELIST: string[];
    MEMBERS_WHITELIST: string[];
    KEYWORD_WHITELIST: string[];
    ENABLE_SECTION_FILTER: boolean;
    SECTION_TITLE_BLACKLIST: string[];
    ENABLE_DURATION_FILTER: boolean;
    DURATION_MIN: number;
    DURATION_MAX: number;
    GRACE_PERIOD_HOURS: number;
    RULE_ENABLES: RuleEnables;
    
    // Compiled regexes
    compiledKeywords?: RegExp[];
    compiledChannels?: RegExp[];
    compiledChannelWhitelist?: RegExp[];
    compiledMembersWhitelist?: RegExp[];
    compiledKeywordWhitelist?: RegExp[];
    compiledSectionBlacklist?: RegExp[];
}

export class ConfigManager {
    public defaults!: ConfigState;
    public state!: ConfigState;

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
            ENABLE_KEYWORD_FILTER: true,
            KEYWORD_BLACKLIST: [],
            ENABLE_CHANNEL_FILTER: true,
            CHANNEL_BLACKLIST: [],
            CHANNEL_WHITELIST: [],
            MEMBERS_WHITELIST: [], // 新增：會員影片專屬白名單
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

    private _compileList(list: string[]): RegExp[] {
        if (!Array.isArray(list)) return [];
        return list.map(k => {
            try {
                if (k.startsWith('=')) {
                    return Utils.generateCnRegex(k.substring(1), true) || new RegExp(`^${Utils.escapeRegex(k.substring(1))}$`, 'i');
                }
                return Utils.generateCnRegex(k) || new RegExp(Utils.escapeRegex(k), 'i');
            } catch (e) {
                return null;
            }
        }).filter((x): x is RegExp => x !== null);
    }

    private _load(): ConfigState {
        const get = (k: string, d: any) => GM_getValue(k, d);
        const snake = (str: string) => str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);

        const loaded = {} as ConfigState;
        for (const key in this.defaults) {
            const configKey = key as keyof ConfigState;
            if (configKey === 'RULE_ENABLES') {
                const saved = get('ruleEnables', {});
                loaded[configKey] = { ...this.defaults.RULE_ENABLES, ...saved };
            } else {
                // @ts-ignore
                loaded[configKey] = get(snake(key), this.defaults[configKey]);
                // @ts-ignore
                if (Array.isArray(this.defaults[configKey]) && !Array.isArray(loaded[configKey])) {
                    // @ts-ignore
                    loaded[configKey] = [...this.defaults[configKey]];
                }
            }
        }

        // Pre-compile Regexes
        loaded.compiledKeywords = this._compileList(loaded.KEYWORD_BLACKLIST);
        loaded.compiledChannels = this._compileList(loaded.CHANNEL_BLACKLIST);
        loaded.compiledChannelWhitelist = this._compileList(loaded.CHANNEL_WHITELIST);
        loaded.compiledMembersWhitelist = this._compileList(loaded.MEMBERS_WHITELIST);
        loaded.compiledKeywordWhitelist = this._compileList(loaded.KEYWORD_WHITELIST);
        loaded.compiledSectionBlacklist = this._compileList(loaded.SECTION_TITLE_BLACKLIST);

        return loaded;
    }

    public get<K extends keyof ConfigState>(key: K): ConfigState[K] { 
        return this.state[key]; 
    }

    public set<K extends keyof ConfigState>(key: K, value: ConfigState[K]): void {
        this.state[key] = value;
        const snake = (str: string) => str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
        if (key === 'RULE_ENABLES') GM_setValue('ruleEnables', value);
        else GM_setValue(snake(key), value);

        // Update compiled regexes if list changes
        const compileMap: Partial<Record<keyof ConfigState, keyof ConfigState>> = {
            'KEYWORD_BLACKLIST': 'compiledKeywords',
            'CHANNEL_BLACKLIST': 'compiledChannels',
            'CHANNEL_WHITELIST': 'compiledChannelWhitelist',
            'MEMBERS_WHITELIST': 'compiledMembersWhitelist',
            'KEYWORD_WHITELIST': 'compiledKeywordWhitelist',
            'SECTION_TITLE_BLACKLIST': 'compiledSectionBlacklist'
        };

        const target = compileMap[key];
        if (target) {
            // @ts-ignore
            this.state[target] = this._compileList(value as string[]);
        }
    }

    public toggleRule(ruleId: keyof RuleEnables): void {
        this.state.RULE_ENABLES[ruleId] = !this.state.RULE_ENABLES[ruleId];
        this.set('RULE_ENABLES', this.state.RULE_ENABLES);
    }
}
