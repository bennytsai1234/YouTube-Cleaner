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
                posts_block: true,
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
        return this.state[key];
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

    const result = engine.findFilterDetail(el, false);
    TestRunner.assert('Shorts 應被識別為強規則 (透過 findFilterDetail)', result !== null && result.reason === 'shorts_item_js');
});

TestRunner.suite('FilterEngine - findFilterDetail 基本流程', () => {
    const config = new MockConfig() as any;
    const engine = new FilterEngine(config);

    // findFilterDetail 需要完整的 DOM 結構，測試一般非影片元素
    const dom = new JSDOM('<div>Not a video element</div>');
    const el = dom.window.document.querySelector('div') as any;

    const result = engine.findFilterDetail(el, false);
    // 非影片元素應返回 null
    TestRunner.assert('非影片元素 findFilterDetail 應返回 null', result === null);
});

TestRunner.suite('FilterEngine - 頻道頁豁免優先於文字與區塊規則', () => {
    const config = new MockConfig() as any;
    const engine = new FilterEngine(config);

    const dom = new JSDOM('<ytd-rich-section-renderer><h2 id="title">Posts</h2></ytd-rich-section-renderer>');
    const el = dom.window.document.querySelector('ytd-rich-section-renderer') as any;

    const result = engine.findFilterDetail(el, true);
    TestRunner.assert('allowPageContent=true 時應完全跳過內容過濾', result === null);
});

TestRunner.suite('FilterEngine - 會員優先觀看可被一般白名單豁免', () => {
    const config = new MockConfig() as any;
    const engine = new FilterEngine(config);

    const dom = new JSDOM('<ytd-rich-item-renderer><div>會員優先觀看</div><a href="/watch?v=abc">Video</a></ytd-rich-item-renderer>');
    const el = dom.window.document.querySelector('ytd-rich-item-renderer') as any;

    const detail = engine.findFilterDetail(el, false);
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

if (!TestRunner.summary()) {
    process.exit(1);
}
