export type RulePriority = 'strong' | 'weak';
export type WhitelistScope = 'none' | 'channel_or_keyword' | 'members';

export interface RuleDefinition {
    id: string;
    defaultEnabled: boolean;
    defaultPriority?: RulePriority;
    whitelistScope?: WhitelistScope;
    textRules?: Array<RegExp | string>;
}

export const RULE_DEFINITIONS: RuleDefinition[] = [
    { id: 'ad_block_popup', defaultEnabled: true },
    { id: 'ad_sponsor', defaultEnabled: true, defaultPriority: 'strong', whitelistScope: 'none' },
    { id: 'members_only', defaultEnabled: true, defaultPriority: 'strong', whitelistScope: 'members', textRules: [/頻道會員專屬|Members only/i] },
    { id: 'shorts_item', defaultEnabled: true, defaultPriority: 'strong', whitelistScope: 'none' },
    { id: 'mix_only', defaultEnabled: true, defaultPriority: 'strong', whitelistScope: 'none', textRules: [/(^|\s)(合輯|Mix)([\s\-–]|$)/i] },
    { id: 'premium_banner', defaultEnabled: true, defaultPriority: 'strong', whitelistScope: 'none' },
    { id: 'news_block', defaultEnabled: true, textRules: [/新聞快報|Breaking News|ニュース/i] },
    { id: 'shorts_block', defaultEnabled: true, textRules: [/^Shorts$/i] },
    { id: 'posts_block', defaultEnabled: true, textRules: [/貼文|Posts|投稿|Publicaciones|最新 YouTube 貼文/i] },
    { id: 'playables_block', defaultEnabled: true, textRules: [/Playables|遊戲角落/i] },
    { id: 'fundraiser_block', defaultEnabled: true, textRules: [/Fundraiser|募款/i] },
    { id: 'shorts_grid_shelf', defaultEnabled: true, textRules: [/^Shorts$/i] },
    { id: 'movies_shelf', defaultEnabled: true, textRules: [/為你推薦的特選電影|featured movies|YouTube 精選/i] },
    { id: 'youtube_featured_shelf', defaultEnabled: true, textRules: [/YouTube 精選/i] },
    { id: 'popular_gaming_shelf', defaultEnabled: true, textRules: [/熱門遊戲直播/i] },
    { id: 'more_from_game_shelf', defaultEnabled: true, textRules: [/^更多此遊戲相關內容$/i] },
    { id: 'trending_playlist', defaultEnabled: true, textRules: [/發燒影片|Trending/i] },
    { id: 'inline_survey', defaultEnabled: true },
    { id: 'clarify_box', defaultEnabled: true },
    { id: 'explore_topics', defaultEnabled: true, textRules: [/探索更多主題|Explore more topics/i] },
    { id: 'recommended_playlists', defaultEnabled: true, defaultPriority: 'strong', whitelistScope: 'none' },
    { id: 'members_early_access', defaultEnabled: true, textRules: [/會員優先|Members Early Access|Early access for members/i] }
];

export const buildDefaultRuleEnables = (): Record<string, boolean> =>
    RULE_DEFINITIONS.reduce<Record<string, boolean>>((acc, rule) => {
        acc[rule.id] = rule.defaultEnabled;
        return acc;
    }, {});

export const buildDefaultRulePriorities = (): Record<string, RulePriority> => {
    const priorities = RULE_DEFINITIONS.reduce<Record<string, RulePriority>>((acc, rule) => {
        if (rule.defaultPriority) acc[rule.id] = rule.defaultPriority;
        return acc;
    }, {});

    priorities.members_only_js = 'strong';
    priorities.shorts_item_js = 'strong';

    return priorities;
};

export const getTextRuleDefinitions = (): RuleDefinition[] =>
    RULE_DEFINITIONS.filter(rule => rule.textRules && rule.textRules.length > 0);

export const getRuleDefinition = (reason: string): RuleDefinition | undefined =>
    RULE_DEFINITIONS.find(rule => rule.id === reason || `${rule.id}_js` === reason);

export const getWhitelistScope = (reason: string): WhitelistScope =>
    getRuleDefinition(reason)?.whitelistScope || 'channel_or_keyword';

export const isStrongRule = (reason: string, priorities: Record<string, RulePriority>): boolean =>
    priorities[reason] === 'strong';
