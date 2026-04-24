
import { VideoFilter } from '../src/features/video-filter';
import { hideElement, resetHiddenState } from '../src/features/dom-visibility';
import { JSDOM } from 'jsdom';

// Mock GM functions for test environment
(global as any).GM_getValue = (key: string, defaultValue: any) => defaultValue;
(global as any).GM_setValue = (key: string, value: any) => {};


// ==================== 測試基礎建設 ====================
const TestRunner = {
    passed: 0,
    failed: 0,
    currentSuite: '',

    suite(name: string, fn: () => void) {
        this.currentSuite = name;
        console.log(`\n📦 ${name}`);
        console.log('─'.repeat(40));
        fn();
    },

    assert(description: string, condition: any) {
        if (condition) {
            console.log(`  ✅ ${description}`);
            this.passed++;
        } else {
            console.error(`  ❌ ${description}`);
            this.failed++;
        }
    },

    summary() {
        console.log('\n' + '═'.repeat(40));
        console.log(`📊 邏輯測試結果: ${this.passed} 通過, ${this.failed} 失敗`);
        console.log('═'.repeat(40));
        return this.failed === 0;
    }
};

// ==================== Mock 物件 ====================

// 模擬 Config 物件，允許我們動態改變設定
class MockConfig {
    public settings: any;

    constructor() {
        this.settings = {
            // 功能開關
            'ENABLE_KEYWORD_FILTER': true,
            'ENABLE_CHANNEL_FILTER': true,
            'ENABLE_LOW_VIEW_FILTER': true,
            'ENABLE_DURATION_FILTER': true,
            'ENABLE_REGION_CONVERT': false,
            'RULE_ENABLES': {
                members_only: true,
                recommended_playlists: true
            },

            // 黑名單
            'KEYWORD_BLACKLIST': [],
            'CHANNEL_BLACKLIST': [],
            'CHANNEL_WHITELIST': [],
            'KEYWORD_WHITELIST': [],

            // 觀看數過濾
            'LOW_VIEW_THRESHOLD': 1000,
            'GRACE_PERIOD_HOURS': 24, // 1天寬限期

            // 時長過濾
            'DURATION_MIN': 60,   // 最短 60秒
            'DURATION_MAX': 3600, // 最長 1小時
        };
    }

    get(key: string) {
        return this.settings[key];
    }

    set(key: string, value: any) {
        this.settings[key] = value;
    }
}

// 模擬 LazyVideoData，讓我們可以直接注入影片屬性，而不需要構造複雜的 DOM
class MockVideoData {
    public title: string;
    public channel: string;
    public viewCount: number | null;
    public liveViewers: number | null;
    public timeAgo: number | null;
    public duration: number | null;
    public isShorts: boolean;
    public isLive: boolean;
    public isMembers: boolean;
    public isPlaylist: boolean;
    public isUserPlaylist: boolean;
    public raw: { views: string; time: string; duration: string; viewers: string };

    constructor(data: any = {}) {
        this.title = data.title || 'Test Video';
        this.channel = data.channel || 'Test Channel';
        this.viewCount = data.viewCount !== undefined ? data.viewCount : 5000;
        this.liveViewers = data.liveViewers !== undefined ? data.liveViewers : null;
        this.timeAgo = data.timeAgo !== undefined ? data.timeAgo : 1440; // 24小時 (分鐘)
        this.duration = data.duration !== undefined ? data.duration : 300; // 5分鐘
        this.isShorts = data.isShorts || false;
        this.isLive = data.isLive || (data.liveViewers !== undefined && data.liveViewers !== null);
        this.isMembers = data.isMembers || false;
        this.isPlaylist = data.isPlaylist || false;
        this.isUserPlaylist = data.isUserPlaylist || false;
        // 新增 raw 屬性以支援詳細日誌
        this.raw = { views: '5K views', time: '1 day ago', duration: '5:00', viewers: '10K watching' };
    }
}

// Setup Global Environment (Mimic Browser)
const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
if (typeof (global as any).navigator === 'undefined') {
    (global as any).navigator = dom.window.navigator;
}
if (typeof (global as any).location === 'undefined') {
    (global as any).location = dom.window.location;
}
(global as any).requestIdleCallback = (fn: any) => fn({ timeRemaining: () => 10, didTimeout: false });


// ==================== 測試案例 ====================

TestRunner.suite('dom-visibility - 隱藏後完整還原 inline style', () => {
    document.body.innerHTML = `
        <ytd-rich-item-renderer id="item" style="width: 120px; color: red;">
            <a href="/watch?v=abc">Test</a>
        </ytd-rich-item-renderer>
    `;

    const item = document.getElementById('item') as HTMLElement;
    const originalStyle = item.getAttribute('style');

    hideElement(item, { reason: 'keyword_blacklist' });
    TestRunner.assert('隱藏時應設定 display none', item.style.getPropertyValue('display') === 'none');
    TestRunner.assert('隱藏時應設定 visibility hidden', item.style.getPropertyValue('visibility') === 'hidden');

    resetHiddenState();
    TestRunner.assert('reset 後應還原原本 style attribute', item.getAttribute('style') === originalStyle);
    TestRunner.assert('reset 後應清除 data-yp-hidden', !item.dataset.ypHidden);
});

TestRunner.suite('dom-visibility - 無 inline style 的元素 reset 後不留下 style attribute', () => {
    document.body.innerHTML = `
        <ytd-rich-item-renderer id="item">
            <a href="/watch?v=abc">Test</a>
        </ytd-rich-item-renderer>
    `;

    const item = document.getElementById('item') as HTMLElement;

    hideElement(item, { reason: 'keyword_blacklist' });
    resetHiddenState();

    TestRunner.assert('reset 後不應留下空 style attribute', !item.hasAttribute('style'));
});

TestRunner.suite('VideoFilter - 關鍵字過濾', () => {
    const config = new MockConfig();
    const filter = new VideoFilter(config as any);

    // 設定黑名單 (需手動設定 compiledKeywords 以符合新邏輯)
    config.set('KEYWORD_BLACKLIST', ['Minecraft', 'Roblox']);
    config.set('compiledKeywords', [new RegExp('Minecraft', 'i'), new RegExp('Roblox', 'i')]);

    // 測試 1: 標題包含黑名單關鍵字
    let video = new MockVideoData({ title: 'Playing Minecraft Survival' });
    let result = (filter as any)._getFilterKeyword(video);
    TestRunner.assert('應過濾包含黑名單的標題', result && result.reason === 'keyword_blacklist');

    // 測試 2: 標題安全
    video = new MockVideoData({ title: 'Cooking with Chef' });
    result = (filter as any)._getFilterKeyword(video);
    TestRunner.assert('不應過濾安全標題', result === null);

    // 測試 3: 功能關閉時
    config.set('ENABLE_KEYWORD_FILTER', false);
    video = new MockVideoData({ title: 'Minecraft Gameplay' });
    result = (filter as any)._getFilterKeyword(video);
    TestRunner.assert('功能關閉時不應過濾', result === null);
});

TestRunner.suite('VideoFilter - 觀看數過濾 (低觀看)', () => {
    const config = new MockConfig();
    const filter = new VideoFilter(config as any);

    config.set('LOW_VIEW_THRESHOLD', 1000); // 門檻 1000 次
    config.set('GRACE_PERIOD_HOURS', 10);   // 寬限 10 小時 (600 分鐘)

    // 案例 A: 發布很久(20小時)，觀看數很低(500) -> 應過濾
    let video = new MockVideoData({
        viewCount: 500,
        timeAgo: 1200, // 20小時 (1200分) > 600分
        isLive: false
    });
    let result = (filter as any)._getFilterView(video);
    TestRunner.assert('過濾：發布已久且觀看數低', result && result.reason === 'low_view');

    // 案例 B: 發布不久(5小時)，觀看數很低(500) -> 應保留 (寬限期內)
    video = new MockVideoData({
        viewCount: 500,
        timeAgo: 300, // 5小時 (300分) < 600分
        isLive: false
    });
    result = (filter as any)._getFilterView(video);
    TestRunner.assert('保留：寬限期內的新影片', result === null);

    // 案例 C: 發布很久(20小時)，觀看數高(2000) -> 應保留
    video = new MockVideoData({
        viewCount: 2000,
        timeAgo: 1200,
        isLive: false
    });
    result = (filter as any)._getFilterView(video);
    TestRunner.assert('保留：高觀看影片', result === null);
});

TestRunner.suite('VideoFilter - 直播觀看數過濾', () => {
    const config = new MockConfig();
    const filter = new VideoFilter(config as any);

    config.set('LOW_VIEW_THRESHOLD', 100);

    // 直播中，人數少 (50) -> 過濾
    let video = new MockVideoData({
        liveViewers: 50,
        isLive: true
    });
    let result = (filter as any)._getFilterView(video);
    TestRunner.assert('過濾：直播人數過低', result && result.reason === 'low_viewer_live');

    // 直播中，人數多 (500) -> 保留
    video = new MockVideoData({
        liveViewers: 500,
        isLive: true
    });
    result = (filter as any)._getFilterView(video);
    TestRunner.assert('保留：直播人數足夠', result === null);
});

TestRunner.suite('VideoFilter - 影片時長過濾', () => {
    const config = new MockConfig();
    const filter = new VideoFilter(config as any);

    config.set('DURATION_MIN', 60);   // 最短 60秒
    config.set('DURATION_MAX', 600);  // 最長 600秒 (10分鐘)

    // 過短 (30秒)
    let video = new MockVideoData({ duration: 30 });
    let result = (filter as any)._getFilterDuration(video);
    TestRunner.assert('過濾：影片過短', result && result.reason === 'duration_filter');

    // 過長 (1000秒)
    video = new MockVideoData({ duration: 1000 });
    result = (filter as any)._getFilterDuration(video);
    TestRunner.assert('過濾：影片過長', result && result.reason === 'duration_filter');

    // 正常範圍 (300秒)
    video = new MockVideoData({ duration: 300 });
    result = (filter as any)._getFilterDuration(video);
    TestRunner.assert('保留：正常長度', result === null);

    // 忽略 Shorts
    video = new MockVideoData({ duration: 30, isShorts: true });
    result = (filter as any)._getFilterDuration(video);
    TestRunner.assert('保留 Shorts (不套用時長過濾)', result === null);
});

TestRunner.suite('VideoFilter - 頻道頁面過濾豁免', () => {
    const config = new MockConfig();
    const filter = new VideoFilter(config as any);

    // 預設開啟豁免
    config.set('DISABLE_FILTER_ON_CHANNEL', true);

    // 模擬在頻道頁面
    dom.reconfigure({ url: 'https://www.youtube.com/@TestChannel' });

    TestRunner.assert('頻道頁面應允許內容 (開啟豁免)', filter.isPageAllowingContent === true);

    // 關閉豁免
    config.set('DISABLE_FILTER_ON_CHANNEL', false);
    TestRunner.assert('頻道頁面不應允許內容 (關閉豁免)', filter.isPageAllowingContent === false);

    // 模擬在首頁
    dom.reconfigure({ url: 'https://www.youtube.com/' });
    TestRunner.assert('首頁不應允許內容 (無論設定)', filter.isPageAllowingContent === false);
});

TestRunner.suite('VideoFilter - 雙重白名單', () => {
    const config = new MockConfig();
    const filter = new VideoFilter(config as any);

    // 1. 頻道白名單 (使用新的編譯名稱)
    config.set('CHANNEL_WHITELIST', ['MyFavoriteChannel']);
    const channelRegex = [new RegExp('MyFavoriteChannel', 'i')];
    config.set('compiledChannelWhitelist', channelRegex);

    let video = new MockVideoData({ channel: 'MyFavoriteChannel', title: 'Minecraft' });
    let whitelistReason = (filter as any)._checkWhitelist(video);
    TestRunner.assert('頻道白名單應被識別', whitelistReason === 'channel_whitelist');

    // 2. 關鍵字白名單
    config.set('KEYWORD_WHITELIST', ['Tutorial', '教學']);
    const keywordRegex = [new RegExp('Tutorial', 'i'), new RegExp('教學', 'i')];
    config.set('compiledKeywordWhitelist', keywordRegex);

    video = new MockVideoData({ channel: 'RandomGuy', title: 'Minecraft Tutorial' });
    whitelistReason = (filter as any)._checkWhitelist(video);
    TestRunner.assert('關鍵字白名單應被識別', whitelistReason === 'keyword_whitelist');

    // 3. 不在白名單
    video = new MockVideoData({ channel: 'Other', title: 'Minecraft' });
    whitelistReason = (filter as any)._checkWhitelist(video);
    TestRunner.assert('非白名單不應被識別', whitelistReason === null);
});

// ==================== 執行 ====================
console.log('🧪 YouTube Cleaner 核心邏輯測試');
console.log('=' .repeat(40));
const allPassed = TestRunner.summary();
process.exit(allPassed ? 0 : 1);
