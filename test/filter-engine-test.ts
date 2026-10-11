import { JSDOM } from 'jsdom';
import { FilterEngine } from '../src/features/filter-engine';
import { LazyVideoData } from '../src/features/video-data';
import { TestRunner as Runner } from './helpers/test-runner';

// Mock GM functions
(global as any).GM_getValue = (key: string, defaultValue: any) => defaultValue;
(global as any).GM_setValue = (key: string, value: any) => {};

// Setup JSDOM
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
Object.defineProperty(global, 'navigator', {
    value: dom.window.navigator,
    writable: true,
    configurable: true
});
(global as any).HTMLElement = dom.window.HTMLElement;
(global as any).Element = dom.window.Element;
(global as any).Node = dom.window.Node;

const TestRunner = new Runner('FilterEngine 測試結果');

// Mock ConfigManager
class MockConfig {
    public state: Record<string, any>;

    constructor() {
        this.state = {
            ENABLE_KEYWORD_FILTER: true,
            ENABLE_CHANNEL_FILTER: true,
            ENABLE_LOW_VIEW_FILTER: true,
            ENABLE_DURATION_FILTER: true,
            ENABLE_REGION_CONVERT: false,
            ENABLE_SECTION_FILTER: true,
            RULE_ENABLES: {
                shorts_item: true,
                members_only: true,
                members_early_access: true,
                mix_only: true,
                news_block: true,
                shorts_block: true,
                posts_block: true,
                fundraiser_block: true,
                shorts_grid_shelf: true,
                movies_shelf: true,
                youtube_featured_shelf: true,
                trending_playlist: true,
                recommended_playlists: true
            },
            RULE_PRIORITIES: {
                members_only: 'strong',
                shorts_item: 'strong',
                recommended_playlists: 'strong'
            },
            KEYWORD_BLACKLIST: ['Minecraft', 'Roblox'],
            CHANNEL_BLACKLIST: ['BadChannel'],
            CHANNEL_WHITELIST: ['GoodChannel'],
            KEYWORD_WHITELIST: ['Tutorial'],
            MEMBERS_WHITELIST: [],
            compiledKeywords: [/Minecraft/i, /Roblox/i],
            compiledChannels: [/BadChannel/i],
            compiledChannelWhitelist: [/GoodChannel/i],
            compiledKeywordWhitelist: [/Tutorial/i],
            compiledMembersWhitelist: [],
            compiledSectionBlacklist: [],
            LOW_VIEW_THRESHOLD: 1000,
            GRACE_PERIOD_HOURS: 4,
            DURATION_MIN: 60,
            DURATION_MAX: 600
        };
    }

    get(key: string): any {
        return Reflect.get(this.state, key);
    }
}

// Mock LazyVideoData for testing FilterEngine methods
function createMockVideoData(overrides: any = {}) {
    return {
        title: 'Test Video',
        channel: 'Test Channel',
        viewCount: 5000,
        liveViewers: null,
        timeAgo: 1440, // 1 day in minutes
        duration: 300,
        isShorts: false,
        isLive: false,
        isMembers: false,
        isPlaylist: false,
        isUserPlaylist: false,
        url: 'https://youtube.com/watch?v=123',
        raw: { views: '5K views', time: '1 day ago', duration: '5:00', viewers: '' },
        ...overrides
    };
}

TestRunner.suite('FilterEngine - getFilterKeyword', () => {
    const config = new MockConfig() as any;
    const engine = new FilterEngine(config);

    const videoData = createMockVideoData({ title: 'Playing Minecraft Survival' });
    const result = engine.getFilterKeyword(videoData as any);
    TestRunner.assert('應過濾標題包含 Minecraft', result !== null && result.reason === 'keyword_blacklist');

    const safeVideo = createMockVideoData({ title: 'Cooking with Chef' });
    const safeResult = engine.getFilterKeyword(safeVideo as any);
    TestRunner.assert('安全標題不應被過濾', safeResult === null);
});

TestRunner.suite('FilterEngine - getFilterKeyword 關閉時', () => {
    const config = new MockConfig() as any;
    config.state.ENABLE_KEYWORD_FILTER = false;
    const engine = new FilterEngine(config);

    const videoData = createMockVideoData({ title: 'Playing Minecraft Survival' });
    const result = engine.getFilterKeyword(videoData as any);
    TestRunner.assert('關閉關鍵字過濾後不應過濾', result === null);
});

TestRunner.suite('FilterEngine - getFilterChannel', () => {
    const config = new MockConfig() as any;
    const engine = new FilterEngine(config);

    const videoData = createMockVideoData({ channel: 'BadChannel Official' });
    const result = engine.getFilterChannel(videoData as any);
    TestRunner.assert('應過濾黑名單頻道', result !== null && result.reason === 'channel_blacklist');

    const safeVideo = createMockVideoData({ channel: 'Good Channel' });
    const safeResult = engine.getFilterChannel(safeVideo as any);
    TestRunner.assert('白名單頻道不應被過濾', safeResult === null);
});

TestRunner.suite('FilterEngine - getFilterView 低觀看', () => {
    const config = new MockConfig() as any;
    config.state.GRACE_PERIOD_HOURS = 4; // 4 hours = 240 minutes
    config.state.LOW_VIEW_THRESHOLD = 1000;
    const engine = new FilterEngine(config);

    // 超過寬限期且低觀看
    const video1 = createMockVideoData({ viewCount: 500, timeAgo: 500 }); // 500 mins > 240
    const result1 = engine.getFilterView(video1 as any);
    TestRunner.assert('超過寬限期且低觀看應過濾', result1 !== null && result1.reason === 'low_view');

    // 寬限期內
    const video2 = createMockVideoData({ viewCount: 500, timeAgo: 100 }); // 100 mins < 240
    const result2 = engine.getFilterView(video2 as any);
    TestRunner.assert('寬限期內不應過濾', result2 === null);

    // 高觀看
    const video3 = createMockVideoData({ viewCount: 5000, timeAgo: 500 });
    const result3 = engine.getFilterView(video3 as any);
    TestRunner.assert('高觀看不應過濾', result3 === null);
});

TestRunner.suite('FilterEngine - getFilterView 直播觀看', () => {
    const config = new MockConfig() as any;
    config.state.LOW_VIEW_THRESHOLD = 100;
    const engine = new FilterEngine(config);

    // 直播低人數
    const liveLow = createMockVideoData({ isLive: true, liveViewers: 50, viewCount: null });
    const result1 = engine.getFilterView(liveLow as any);
    TestRunner.assert('直播低人數應過濾', result1 !== null && result1.reason === 'low_viewer_live');

    // 直播高人數
    const liveHigh = createMockVideoData({ isLive: true, liveViewers: 500, viewCount: null });
    const result2 = engine.getFilterView(liveHigh as any);
    TestRunner.assert('直播高人數不應過濾', result2 === null);
});

TestRunner.suite('FilterEngine - getFilterDuration', () => {
    const config = new MockConfig() as any;
    config.state.DURATION_MIN = 60;
    config.state.DURATION_MAX = 600;
    const engine = new FilterEngine(config);

    // 過短
    const shortVideo = createMockVideoData({ duration: 30 });
    const result1 = engine.getFilterDuration(shortVideo as any);
    TestRunner.assert('過短影片應過濾', result1 !== null && result1.reason === 'duration_filter');

    // 過長
    const longVideo = createMockVideoData({ duration: 1000 });
    const result2 = engine.getFilterDuration(longVideo as any);
    TestRunner.assert('過長影片應過濾', result2 !== null && result2.reason === 'duration_filter');

    // 正常
    const normalVideo = createMockVideoData({ duration: 300 });
    const result3 = engine.getFilterDuration(normalVideo as any);
    TestRunner.assert('正常時長不應過濾', result3 === null);
});

TestRunner.suite('FilterEngine - getFilterDuration Shorts 豁免', () => {
    const config = new MockConfig() as any;
    const engine = new FilterEngine(config);

    const shortsVideo = createMockVideoData({ duration: 30, isShorts: true });
    const result = engine.getFilterDuration(shortsVideo as any);
    TestRunner.assert('Shorts 不應受時長過濾', result === null);
});

TestRunner.suite('FilterEngine - checkWhitelist', () => {
    const config = new MockConfig() as any;
    const engine = new FilterEngine(config);

    // 頻道白名單
    const whitelistedChannel = createMockVideoData({ channel: 'GoodChannel' });
    const result1 = engine.checkWhitelist(whitelistedChannel as any);
    TestRunner.assert('頻道白名單應被識別', result1 === 'channel_whitelist');

    // 關鍵字白名單
    const whitelistedKeyword = createMockVideoData({ channel: 'RandomChannel', title: 'Minecraft Tutorial' });
    const result2 = engine.checkWhitelist(whitelistedKeyword as any);
    TestRunner.assert('關鍵字白名單應被識別', result2 === 'keyword_whitelist');

    // 不在白名單
    const notWhitelisted = createMockVideoData({ channel: 'RandomChannel', title: 'Random Video' });
    const result3 = engine.checkWhitelist(notWhitelisted as any);
    TestRunner.assert('不在白名單應返回 null', result3 === null);
});

TestRunner.suite('FilterEngine - getStrongRuleMatch Shorts (透過 findFilterDetail)', () => {
    const config = new MockConfig() as any;
    config.state.RULE_ENABLES.shorts_item = true;
    const engine = new FilterEngine(config);

    // create mock element
    const dom = new JSDOM('<ytd-rich-item-renderer><a href="/shorts/123">Shorts Video</a></ytd-rich-item-renderer>');
    const el = dom.window.document.querySelector('ytd-rich-item-renderer') as any;

    const result = engine.findFilterDetail(new LazyVideoData(el), false);
    TestRunner.assert('Shorts 應被識別為強規則 (透過 findFilterDetail)', result !== null && result.reason === 'shorts_item_js');
});

TestRunner.suite('FilterEngine - findFilterDetail 基本流程', () => {
    const config = new MockConfig() as any;
    const engine = new FilterEngine(config);

    // findFilterDetail 需要完整的 DOM 結構，測試一般非影片元素
    const dom = new JSDOM('<div>Not a video element</div>');
    const el = dom.window.document.querySelector('div') as any;

    const result = engine.findFilterDetail(new LazyVideoData(el), false);
    // 非影片元素應返回 null
    TestRunner.assert('非影片元素 findFilterDetail 應返回 null', result === null);
});

TestRunner.suite('FilterEngine - 頻道頁豁免優先於文字與區塊規則', () => {
    const config = new MockConfig() as any;
    const engine = new FilterEngine(config);

    const dom = new JSDOM('<ytd-rich-section-renderer><h2 id="title">Posts</h2></ytd-rich-section-renderer>');
    const el = dom.window.document.querySelector('ytd-rich-section-renderer') as any;

    const result = engine.findFilterDetail(new LazyVideoData(el), true);
    TestRunner.assert('allowPageContent=true 時應完全跳過內容過濾', result === null);
});

TestRunner.suite('FilterEngine - 會員優先觀看可被一般白名單豁免', () => {
    const config = new MockConfig() as any;
    const engine = new FilterEngine(config);

    const dom = new JSDOM('<ytd-rich-item-renderer><badge-shape>會員優先觀看</badge-shape><a href="/watch?v=abc">Video</a></ytd-rich-item-renderer>');
    const el = dom.window.document.querySelector('ytd-rich-item-renderer') as any;

    const detail = engine.findFilterDetail(new LazyVideoData(el), false);
    TestRunner.assert('會員優先觀看應被識別', detail !== null && detail.reason === 'members_early_access');

    const whitelistDecision = engine.applyWhitelistDecision(
        createMockVideoData({ channel: 'GoodChannel', title: '會員優先觀看' }) as any,
        { reason: 'members_early_access' }
    );
    TestRunner.assert('會員優先觀看應可被一般白名單豁免', whitelistDecision === 'channel_whitelist');
});

TestRunner.suite('FilterEngine - 訂閱保護只保護低觀看數', () => {
    const config = new MockConfig() as any;
    const engine = new FilterEngine(config);
    engine.subManager = { isSubscribed: () => true } as any;

    const subscribedVideo = createMockVideoData({ channel: 'SubscribedChannel', title: 'Blocked Keyword' });
    const lowViewDecision = engine.applyWhitelistDecision(subscribedVideo as any, { reason: 'low_view' });
    const keywordDecision = engine.applyWhitelistDecision(subscribedVideo as any, { reason: 'keyword_blacklist' });

    TestRunner.assert('訂閱頻道的低觀看數應被保護', lowViewDecision === 'channel_whitelist');
    TestRunner.assert('訂閱保護不應放行關鍵字黑名單', keywordDecision === null);
});

TestRunner.suite('FilterEngine - getFilterPlaylist', () => {
    const config = new MockConfig() as any;
    config.state.RULE_ENABLES.recommended_playlists = true;
    const engine = new FilterEngine(config);

    // Mix/Playlist 推薦
    const playlistVideo = createMockVideoData({ isPlaylist: true, isUserPlaylist: false });
    const result1 = engine.getFilterPlaylist(playlistVideo as any);
    TestRunner.assert('演算法推薦的播放清單應過濾', result1 !== null && result1.reason === 'recommended_playlists');

    // 用戶自己的播放清單
    const userPlaylist = createMockVideoData({ isPlaylist: true, isUserPlaylist: true });
    const result2 = engine.getFilterPlaylist(userPlaylist as any);
    TestRunner.assert('用戶播放清單不應過濾', result2 === null);
});

TestRunner.suite('FilterEngine - getFilterPlaylist 關閉時', () => {
    const config = new MockConfig() as any;
    config.state.RULE_ENABLES.recommended_playlists = false;
    const engine = new FilterEngine(config);

    const playlistVideo = createMockVideoData({ isPlaylist: true, isUserPlaylist: false });
    const result = engine.getFilterPlaylist(playlistVideo as any);
    TestRunner.assert('關閉 recommended_playlists 後不應過濾', result === null);
});

// 新版 lockup 卡片：標題同時放在 h3 與標題連結的 aria-label
const lockupCard = (title: string, badges: Array<{ text: string; cls?: string }> = [], href = '/watch?v=abc'): string => `
    <ytd-rich-item-renderer>
        <yt-lockup-view-model>
            <yt-avatar-shape><div role="button" aria-label="前往頻道：Some Channel"></div></yt-avatar-shape>
            <h3 aria-label="${title}"><a class="ytLockupMetadataViewModelTitle" href="${href}" aria-label="${title}">${title}</a></h3>
            ${badges.map(b => `<badge-shape class="${b.cls || ''}"><div class="ytBadgeShapeText">${b.text}</div></badge-shape>`).join('')}
        </yt-lockup-view-model>
    </ytd-rich-item-renderer>`;

const richShelfSection = (title: string, featuredBadge = '', items = ''): string => `
    <ytd-rich-section-renderer>
        <div id="content">
            <ytd-rich-shelf-renderer>
                <div id="rich-shelf-header">
                    <h2><div id="title-container"><div id="title-text">
                        <span id="title">${title}</span>
                        <ytd-badge-supported-renderer id="featured-badge">${featuredBadge}</ytd-badge-supported-renderer>
                    </div></div></h2>
                </div>
                <div id="contents">${items}</div>
            </ytd-rich-shelf-renderer>
        </div>
    </ytd-rich-section-renderer>`;

const detailFor = (html: string, selector: string) => {
    const engine = new FilterEngine(new MockConfig() as any);
    const el = new JSDOM(html).window.document.querySelector(selector) as any;
    return engine.findFilterDetail(new LazyVideoData(el), false);
};

TestRunner.suite('FilterEngine - 文字規則不比對影片標題（區塊與 badge 規則）', () => {
    const titles = [
        '我的投稿作品分享',
        '日本ニュース解說',
        '募款活動紀錄',
        'YouTube 精選 年度回顧',
        '頻道會員專屬福利介紹',
        'Members only perks explained',
        '會員優先觀看的影片怎麼看',
        'Mixed Martial Arts highlights'
    ];
    for (const title of titles) {
        const detail = detailFor(lockupCard(title), 'ytd-rich-item-renderer');
        TestRunner.assert(`標題「${title}」不應被過濾（實際：${detail?.reason ?? 'null'}）`, detail === null);
    }
});

TestRunner.suite('FilterEngine - badge 規則只看 badge 文字', () => {
    const members = detailFor(lockupCard('Some Video', [{ text: '頻道會員專屬' }]), 'ytd-rich-item-renderer');
    TestRunner.assert('頻道會員專屬 badge 應命中 members_only', members?.reason === 'members_only');

    const early = detailFor(lockupCard('Some Video', [{ text: '會員優先', cls: 'ytBadgeShapeHost ytBadgeShapeCommerce' }]), 'ytd-rich-item-renderer');
    TestRunner.assert('會員優先 badge 應命中 members_early_access', early?.reason === 'members_early_access');

    const promoted = detailFor(lockupCard('NBA 新賽季分析', [{ text: 'YouTube 精選', cls: 'ytBadgeShapeHost ytBadgeShapePromoted' }]), 'ytd-rich-item-renderer');
    TestRunner.assert(`YouTube 精選 badge 應由會員規則處理，不是電影區塊（實際：${promoted?.reason ?? 'null'}）`, promoted?.reason === 'members_only_js');
});

TestRunner.suite('FilterEngine - 合輯與 Trending 比對標題開頭與 badge', () => {
    const liveMix = detailFor(
        lockupCard('合輯 - Sigma Music Phonk Mix', [{ text: '合輯', cls: 'ytBadgeShapeHost ytBadgeShapeThumbnailBadge' }], '/watch?v=Q3PtUW_Ilp8&list=RDQ3PtUW_Ilp8&start_radio=1'),
        'ytd-rich-item-renderer'
    );
    TestRunner.assert(`新版合輯卡片應命中 mix_only（實際：${liveMix?.reason ?? 'null'}）`, liveMix?.reason === 'mix_only');

    const titleMix = detailFor(lockupCard('Mix - Daft Punk'), 'ytd-rich-item-renderer');
    TestRunner.assert(`標題以 Mix - 開頭應命中 mix_only（實際：${titleMix?.reason ?? 'null'}）`, titleMix?.reason === 'mix_only');

    const trending = detailFor(lockupCard('發燒影片 - 音樂'), 'ytd-rich-item-renderer');
    TestRunner.assert('標題含發燒影片應命中 trending_playlist', trending?.reason === 'trending_playlist');
});

TestRunner.suite('FilterEngine - 區塊規則只比對區塊標題列', () => {
    const posts = detailFor(richShelfSection('最新 YouTube 貼文'), 'ytd-rich-section-renderer');
    TestRunner.assert('貼文區塊標題應命中 posts_block', posts?.reason === 'posts_block');

    const shorts = detailFor(richShelfSection('Shorts'), 'ytd-rich-section-renderer');
    TestRunner.assert(`標題剛好是 Shorts 應命中 shorts_block（實際：${shorts?.reason ?? 'null'}）`, shorts?.reason === 'shorts_block');

    const movies = detailFor(richShelfSection('為你推薦', 'YouTube 精選'), 'ytd-rich-section-renderer');
    TestRunner.assert('標題列的 YouTube 精選標記應命中 movies_shelf', movies?.reason === 'movies_shelf');

    const innocent = detailFor(richShelfSection('為你推薦', '', lockupCard('Breaking News today') + lockupCard('募款活動紀錄')), 'ytd-rich-section-renderer');
    TestRunner.assert(`區塊內影片標題不應讓整個區塊被過濾（實際：${innocent?.reason ?? 'null'}）`, innocent === null);

    const banner = detailFor('<ytd-rich-section-renderer><ytd-statement-banner-renderer>享有零廣告體驗及眾多福利 YouTube 精選 訂閱 Premium</ytd-statement-banner-renderer></ytd-rich-section-renderer>', 'ytd-rich-section-renderer');
    TestRunner.assert(`沒有標題列的 Premium 橫幅不應被當成電影區塊（實際：${banner?.reason ?? 'null'}）`, banner === null);

    const grid = detailFor('<grid-shelf-view-model><h2>Shorts</h2></grid-shelf-view-model>', 'grid-shelf-view-model');
    TestRunner.assert(`搜尋頁 Shorts 格狀區塊應命中 shorts_grid_shelf（實際：${grid?.reason ?? 'null'}）`, grid?.reason === 'shorts_grid_shelf');
});

if (!TestRunner.summary()) {
    process.exit(1);
}
