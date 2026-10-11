export type RulePriority = 'strong' | 'weak';
export type WhitelistScope = 'none' | 'channel_or_keyword' | 'members';

// 文字規則比對的範圍：區塊標題列、搜尋頁格狀區塊標題、影片 badge、影片標題。
// 不比對整張卡片的文字，否則標題剛好含關鍵字的一般影片會被誤藏。
export type TextRuleTarget = 'shelf_header' | 'grid_shelf_header' | 'video_badge' | 'video_title';

export interface TextRule {
    target: TextRuleTarget;
    pattern: RegExp;
}

export interface RuleDefinition {
    id: string;
    defaultEnabled: boolean;
    defaultPriority?: RulePriority;
    whitelistScope?: WhitelistScope;
    textRules?: TextRule[];
}

const shelf = (pattern: RegExp): TextRule => ({ target: 'shelf_header', pattern });
const badge = (pattern: RegExp): TextRule => ({ target: 'video_badge', pattern });
const title = (pattern: RegExp): TextRule => ({ target: 'video_title', pattern });

export const RULE_DEFINITIONS: RuleDefinition[] = [
    { id: 'ad_block_popup', defaultEnabled: true },
    { id: 'ad_sponsor', defaultEnabled: true, defaultPriority: 'strong', whitelistScope: 'none' },
    { id: 'members_only', defaultEnabled: true, defaultPriority: 'strong', whitelistScope: 'members', textRules: [badge(/頻道會員專屬|Members only/i)] },
    { id: 'shorts_item', defaultEnabled: true, defaultPriority: 'strong', whitelistScope: 'none' },
    { id: 'mix_only', defaultEnabled: true, defaultPriority: 'strong', whitelistScope: 'none', textRules: [badge(/(^|\s)(合輯|Mix)(\s|$)/i), title(/^(合輯|Mix)[\s\-–]/i)] },
    { id: 'premium_banner', defaultEnabled: true, defaultPriority: 'strong', whitelistScope: 'none' },
    { id: 'news_block', defaultEnabled: true, textRules: [shelf(/新聞快報|Breaking News|ニュース/i)] },
    { id: 'shorts_block', defaultEnabled: true, textRules: [shelf(/^Shorts$/i)] },
    { id: 'posts_block', defaultEnabled: true, textRules: [shelf(/貼文|Posts|投稿|Publicaciones|最新 YouTube 貼文/i)] },
    { id: 'playables_block', defaultEnabled: true, textRules: [shelf(/Playables|遊戲角落/i)] },
    { id: 'fundraiser_block', defaultEnabled: true, textRules: [shelf(/Fundraiser|募款/i)] },
    { id: 'shorts_grid_shelf', defaultEnabled: true, textRules: [{ target: 'grid_shelf_header', pattern: /^Shorts$/i }] },
    { id: 'movies_shelf', defaultEnabled: true, textRules: [shelf(/為你推薦的特選電影|featured movies|YouTube 精選/i)] },
    { id: 'youtube_featured_shelf', defaultEnabled: true, textRules: [shelf(/YouTube 精選/i)] },
    { id: 'popular_gaming_shelf', defaultEnabled: true, textRules: [shelf(/熱門遊戲直播/i)] },
    { id: 'more_from_game_shelf', defaultEnabled: true, textRules: [shelf(/^更多此遊戲相關內容$/i)] },
    { id: 'trending_playlist', defaultEnabled: true, textRules: [title(/發燒影片|Trending/i)] },
    { id: 'inline_survey', defaultEnabled: true },
    { id: 'clarify_box', defaultEnabled: true },
    { id: 'explore_topics', defaultEnabled: true, textRules: [shelf(/探索更多主題|Explore more topics/i)] },
    { id: 'recommended_playlists', defaultEnabled: true, defaultPriority: 'strong', whitelistScope: 'none' },
    {
        id: 'members_early_access',
        defaultEnabled: true,
        textRules: [badge(/會員優先|會員優先觀看|會員搶先看|Members Early Access|Early access for members|Members first|Available to members/i)]
    }
];

export const buildDefaultRuleEnables = (): Record<string, boolean> =>
    RULE_DEFINITIONS.reduce<Record<string, boolean>>((acc, rule) => {
        Reflect.set(acc, rule.id, rule.defaultEnabled);
        return acc;
    }, Object.create(null));

export const buildDefaultRulePriorities = (): Record<string, RulePriority> => {
    const priorities = RULE_DEFINITIONS.reduce<Record<string, RulePriority>>((acc, rule) => {
        if (rule.defaultPriority) Reflect.set(acc, rule.id, rule.defaultPriority);
        return acc;
    }, Object.create(null));

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
    Reflect.get(priorities, reason) === 'strong';
