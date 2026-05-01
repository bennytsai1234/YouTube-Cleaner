import { Utils } from './utils';
import { I18N } from '../ui/i18n';
import { buildDefaultRuleEnables, buildDefaultRulePriorities, RulePriority } from '../data/rules';

declare const GM_getValue: (key: string, defaultValue?: any) => any;
declare const GM_setValue: (key: string, value: any) => void;

// --- 1. Core: Configuration Management ---
let instance: ConfigManager | null = null;

export const resetConfigManagerForTests = (): void => {
    instance = null;
};

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
    FONT_FIX: boolean;
    ENABLE_LOW_VIEW_FILTER: boolean;
    LOW_VIEW_THRESHOLD: number;
    DEBUG_MODE: boolean;
    ENABLE_REGION_CONVERT: boolean;
    DISABLE_FILTER_ON_CHANNEL: boolean;
    ENABLE_SUBSCRIPTION_PROTECTION: boolean;
    ENABLE_KEYWORD_FILTER: boolean;
    KEYWORD_BLACKLIST: string[];
    ENABLE_CHANNEL_FILTER: boolean;
    CHANNEL_BLACKLIST: string[];
    CHANNEL_WHITELIST: string[];
    MEMBERS_WHITELIST: string[];
    KEYWORD_WHITELIST: string[];
    SUBSCRIBED_CHANNELS: string[]; // 新增：自動掃描的訂閱頻道清單
    ENABLE_SECTION_FILTER: boolean;
    SECTION_TITLE_BLACKLIST: string[];
    ENABLE_DURATION_FILTER: boolean;
    DURATION_MIN: number;
    DURATION_MAX: number;
    GRACE_PERIOD_HOURS: number;
    RULE_ENABLES: RuleEnables;
    RULE_PRIORITIES: Record<string, RulePriority>;
    
    // Compiled regexes
    compiledKeywords?: RegExp[];
    compiledChannels?: RegExp[];
    compiledChannelWhitelist?: RegExp[];
    compiledMembersWhitelist?: RegExp[];
    compiledKeywordWhitelist?: RegExp[];
    compiledSectionBlacklist?: RegExp[];
}

type CompiledListKey =
    'compiledKeywords' |
    'compiledChannels' |
    'compiledChannelWhitelist' |
    'compiledMembersWhitelist' |
    'compiledKeywordWhitelist' |
    'compiledSectionBlacklist';

type ListConfigKey =
    'KEYWORD_BLACKLIST' |
    'CHANNEL_BLACKLIST' |
    'CHANNEL_WHITELIST' |
    'MEMBERS_WHITELIST' |
    'KEYWORD_WHITELIST' |
    'SECTION_TITLE_BLACKLIST';

type StoredConfigKey = Exclude<keyof ConfigState, CompiledListKey>;

const LIST_COMPILE_TARGETS: Record<ListConfigKey, CompiledListKey> = {
    KEYWORD_BLACKLIST: 'compiledKeywords',
    CHANNEL_BLACKLIST: 'compiledChannels',
    CHANNEL_WHITELIST: 'compiledChannelWhitelist',
    MEMBERS_WHITELIST: 'compiledMembersWhitelist',
    KEYWORD_WHITELIST: 'compiledKeywordWhitelist',
    SECTION_TITLE_BLACKLIST: 'compiledSectionBlacklist'
};

const isListConfigKey = (key: keyof ConfigState): key is ListConfigKey =>
    Object.prototype.hasOwnProperty.call(LIST_COMPILE_TARGETS, key);

const toStorageKey = (key: string): string =>
    key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);

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
            FONT_FIX: false,
            ENABLE_LOW_VIEW_FILTER: true,
            LOW_VIEW_THRESHOLD: 1000,
            DEBUG_MODE: true,
            // 進階過濾設定
            ENABLE_REGION_CONVERT: true,
            DISABLE_FILTER_ON_CHANNEL: true,
            ENABLE_SUBSCRIPTION_PROTECTION: true,
            ENABLE_KEYWORD_FILTER: true,
            KEYWORD_BLACKLIST: [],
            ENABLE_CHANNEL_FILTER: true,
            CHANNEL_BLACKLIST: [],
            CHANNEL_WHITELIST: [],
            MEMBERS_WHITELIST: [], // 新增：會員影片專屬白名單
            KEYWORD_WHITELIST: [], // 新增：關鍵字白名單
            SUBSCRIBED_CHANNELS: [],
            ENABLE_SECTION_FILTER: true,
            SECTION_TITLE_BLACKLIST: Object.values(I18N.defaultSectionBlacklist).flat(),
            ENABLE_DURATION_FILTER: true,
            DURATION_MIN: 0,
            DURATION_MAX: 0,
            GRACE_PERIOD_HOURS: 4,
            // These connect to simple toggle switches
            RULE_ENABLES: buildDefaultRuleEnables() as unknown as RuleEnables,
            RULE_PRIORITIES: buildDefaultRulePriorities()
        };
        this.state = this._load();
    }

    private _compileList(list: unknown): RegExp[] {
        if (!Array.isArray(list)) return [];
        return list.map(k => {
            try {
                if (typeof k !== 'string') return null;
                if (k.startsWith('=')) {
                    return Utils.generateCnRegex(k.substring(1), true) || new RegExp(`^${Utils.escapeRegex(k.substring(1))}$`, 'i');
                }
                return Utils.generateCnRegex(k) || new RegExp(Utils.escapeRegex(k), 'i');
            } catch {
                return null;
            }
        }).filter((x): x is RegExp => x !== null);
    }

    private cloneDefaultValue<K extends keyof ConfigState>(value: ConfigState[K]): ConfigState[K] {
        if (Array.isArray(value)) return [...value] as ConfigState[K];
        if (value && typeof value === 'object') return { ...value } as ConfigState[K];
        return value;
    }

    private normalizeLoadedValue<K extends StoredConfigKey>(key: K, value: unknown): ConfigState[K] {
        const defaultValue = this.defaults[key];
        if (Array.isArray(defaultValue)) {
            return (Array.isArray(value) ? [...value] : this.cloneDefaultValue(defaultValue)) as ConfigState[K];
        }
        return value as ConfigState[K];
    }

    private assignLoadedValue<K extends StoredConfigKey>(loaded: ConfigState, key: K, value: unknown): void {
        loaded[key] = this.normalizeLoadedValue(key, value);
    }

    private refreshCompiledList(key: keyof ConfigState): void {
        if (!isListConfigKey(key)) return;
        this.state[LIST_COMPILE_TARGETS[key]] = this._compileList(this.state[key]);
    }

    private compileRuntimeLists(loaded: ConfigState): void {
        loaded.compiledKeywords = this._compileList(loaded.KEYWORD_BLACKLIST);
        loaded.compiledChannels = this._compileList(loaded.CHANNEL_BLACKLIST);
        loaded.compiledChannelWhitelist = this._compileList(loaded.CHANNEL_WHITELIST);
        loaded.compiledMembersWhitelist = this._compileList(loaded.MEMBERS_WHITELIST);
        loaded.compiledKeywordWhitelist = this._compileList(loaded.KEYWORD_WHITELIST);
        loaded.compiledSectionBlacklist = this._compileList(loaded.SECTION_TITLE_BLACKLIST);
    }

    private _load(): ConfigState {
        const loaded = {} as ConfigState;
        for (const key of Object.keys(this.defaults) as StoredConfigKey[]) {
            const configKey = key;
            if (configKey === 'RULE_ENABLES') {
                const saved = GM_getValue('ruleEnables', {});
                loaded[configKey] = { ...this.defaults.RULE_ENABLES, ...saved };
            } else if (configKey === 'RULE_PRIORITIES') {
                const saved = GM_getValue('rulePriorities', {});
                loaded[configKey] = { ...this.defaults.RULE_PRIORITIES, ...saved };
            } else {
                this.assignLoadedValue(loaded, configKey, GM_getValue(toStorageKey(key), this.defaults[configKey]));
            }
        }

        this.compileRuntimeLists(loaded);

        return loaded;
    }

    public get<K extends keyof ConfigState>(key: K): ConfigState[K] { 
        return this.state[key]; 
    }

    public set<K extends keyof ConfigState>(key: K, value: ConfigState[K]): void {
        this.state[key] = value;
        if (key === 'RULE_ENABLES') GM_setValue('ruleEnables', value);
        else if (key === 'RULE_PRIORITIES') GM_setValue('rulePriorities', value);
        else GM_setValue(toStorageKey(key), value);

        this.refreshCompiledList(key);
    }

    public toggleRule(ruleId: keyof RuleEnables): void {
        this.state.RULE_ENABLES[ruleId] = !this.state.RULE_ENABLES[ruleId];
        this.set('RULE_ENABLES', this.state.RULE_ENABLES);
    }
}
