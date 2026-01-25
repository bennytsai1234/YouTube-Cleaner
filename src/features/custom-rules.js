// --- 4. Module: Custom Rule Manager (Extensibility) ---
/**
 * Designed to make adding new simple text-based rules easy.
 * Add new entries to the `definitions` array here.
 */
export class CustomRuleManager {
    constructor(config) {
        this.config = config;
        // ★ ADD NEW RULES HERE ★
        // Format: { key: 'config_key_name', rules: [/Regex/i, 'String'], type: 'text' (default) }
        this.definitions = [
            // 從 v1.4.0 還原的文字匹配規則 (作為 CSS 的備援)
            { key: 'members_only', rules: [/頻道會員專屬|Members only/i] },
            { key: 'mix_only', rules: [/(^|\s)(合輯|Mix)([\s\-–]|$)/i] },

            // 區塊/Shelf 類規則
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
            if (enables[def.key]) { // Only check if enabled in config
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
