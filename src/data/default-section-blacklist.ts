import type { SupportedLang } from '../ui/i18n';

export const DEFAULT_SECTION_BLACKLIST: Record<SupportedLang, string[]> = {
    'zh-TW': ['耳目一新', '重溫舊愛', '合輯', '最新貼文', '發燒影片', '熱門', '為您推薦', '推薦', '先前搜尋內容', '相關內容'],
    'zh-CN': ['耳目一新', '重温旧爱', '合辑', '最新贴文', '发烧影片', '热门', '为您推荐', '推荐', '先前搜索内容', '相关内容'],
    'en': ['New to you', 'Relive', 'Mixes', 'Latest posts', 'Trending', 'Recommended', 'People also watched', 'From your search', 'Related to', 'Previously watched'],
    'ja': ['おすすめ', 'ミックス', '新着', 'トレンド', 'あなたへの', '関連']
};
