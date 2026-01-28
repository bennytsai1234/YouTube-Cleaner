
import { VideoFilter } from '../src/features/video-filter.js';
import { JSDOM } from 'jsdom';

// ==================== 測試基礎建設 ====================
const TestRunner = {
    passed: 0,
    failed: 0,
    currentSuite: '',

    suite(name, fn) {
        this.currentSuite = name;
        console.log(`\n📦 ${name}`);
        console.log('─'.repeat(40));
        fn();
    },

    assert(description, condition) {
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
    constructor() {
        this.settings = {
            // 功能開關
            'ENABLE_KEYWORD_FILTER': true,
            'ENABLE_CHANNEL_FILTER': true,
            'ENABLE_LOW_VIEW_FILTER': true,
            'ENABLE_DURATION_FILTER': true,
            'RULE_ENABLES': {
                members_only: true,
                recommended_playlists: true
            },

            // 黑名單
            'KEYWORD_BLACKLIST': [],
            'CHANNEL_BLACKLIST': [],

            // 觀看數過濾
            'LOW_VIEW_THRESHOLD': 1000,
            'GRACE_PERIOD_HOURS': 24, // 1天寬限期

            // 時長過濾
            'DURATION_MIN': 60,   // 最短 60秒
            'DURATION_MAX': 3600, // 最長 1小時
        };
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
    }
}

// 模擬 LazyVideoData，讓我們可以直接注入影片屬性，而不需要構造複雜的 DOM
class MockVideoData {
    constructor(data = {}) {
        this.title = data.title || 'Test Video';
        this.channel = data.channel || 'Test Channel';
        this.viewCount = data.viewCount !== undefined ? data.viewCount : 5000;
        this.liveViewers = data.liveViewers !== undefined ? data.liveViewers : null;
        this.timeAgo = data.timeAgo !== undefined ? data.timeAgo : 1440; // 24小時 (分鐘)
        this.duration = data.duration !== undefined ? data.duration : 300; // 5分鐘
        this.isShorts = data.isShorts || false;
        this.isLive = data.isLive || false;
        this.isMembers = data.isMembers || false;
        this.isPlaylist = data.isPlaylist || false;
        this.isUserPlaylist = data.isUserPlaylist || false;
    }
}

// 模擬 DOM 元素
const createMockElement = () => ({
    dataset: {},
    style: {},
    closest: (selector) => null, // 簡單回傳 null，或者回傳自己
    tagName: 'DIV'
});

// Setup Global Environment (Mimic Browser)
const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>');
global.window = dom.window;
global.document = dom.window.document;
global.requestIdleCallback = (fn) => fn({ timeRemaining: () => 10, didTimeout: false });


// ==================== 測試案例 ====================

TestRunner.suite('VideoFilter - 關鍵字過濾', () => {
    const config = new MockConfig();
    const filter = new VideoFilter(config);
    const mockElement = createMockElement(); // 模擬 DOM 元素

    // 設定黑名單
    config.set('KEYWORD_BLACKLIST', ['Minecraft', 'Roblox']);

    // 測試 1: 標題包含黑名單關鍵字
    let video = new MockVideoData({ title: 'Playing Minecraft Survival' });
    let result = filter._checkKeywordFilter(video, mockElement);
    TestRunner.assert('應過濾包含黑名單的標題', result === true);
    TestRunner.assert('標記正確的隱藏原因', mockElement.dataset.ypHidden === 'keyword_blacklist');

    // 測試 2: 標題安全
    video = new MockVideoData({ title: 'Cooking with Chef' });
    mockElement.dataset.ypHidden = undefined; // 重置
    result = filter._checkKeywordFilter(video, mockElement);
    TestRunner.assert('不應過濾安全標題', result === false);

    // 測試 3: 功能關閉時
    config.set('ENABLE_KEYWORD_FILTER', false);
    video = new MockVideoData({ title: 'Minecraft Gameplay' });
    result = filter._checkKeywordFilter(video, mockElement);
    TestRunner.assert('功能關閉時不應過濾', result === false);
});

TestRunner.suite('VideoFilter - 觀看數過濾 (低觀看)', () => {
    const config = new MockConfig();
    const filter = new VideoFilter(config);
    const mockElement = createMockElement();

    config.set('LOW_VIEW_THRESHOLD', 1000); // 門檻 1000 次
    config.set('GRACE_PERIOD_HOURS', 10);   // 寬限 10 小時 (600 分鐘)

    // 案例 A: 發布很久(20小時)，觀看數很低(500) -> 應過濾
    let video = new MockVideoData({
        viewCount: 500,
        timeAgo: 1200, // 20小時 (1200分) > 600分
        isLive: false
    });
    let result = filter._checkViewFilter(video, mockElement);
    TestRunner.assert('過濾：發布已久且觀看數低', result === true);
    TestRunner.assert('標記原因: low_view', mockElement.dataset.ypHidden === 'low_view');

    // 案例 B: 發布不久(5小時)，觀看數很低(500) -> 應保留 (寬限期內)
    video = new MockVideoData({
        viewCount: 500,
        timeAgo: 300, // 5小時 (300分) < 600分
        isLive: false
    });
    mockElement.dataset.ypHidden = undefined;
    result = filter._checkViewFilter(video, mockElement);
    TestRunner.assert('保留：寬限期內的新影片', result === false);

    // 案例 C: 發布很久(20小時)，觀看數高(2000) -> 應保留
    video = new MockVideoData({
        viewCount: 2000,
        timeAgo: 1200,
        isLive: false
    });
    result = filter._checkViewFilter(video, mockElement);
    TestRunner.assert('保留：高觀看影片', result === false);
});

TestRunner.suite('VideoFilter - 直播觀看數過濾', () => {
    const config = new MockConfig();
    const filter = new VideoFilter(config);
    const mockElement = createMockElement();

    config.set('LOW_VIEW_THRESHOLD', 100); // 直播門檻通常共用或另設，這裡假設共用邏輯

    // 直播中，人數少 (50) -> 過濾
    let video = new MockVideoData({
        liveViewers: 50,
        isLive: true
    });
    let result = filter._checkViewFilter(video, mockElement);
    TestRunner.assert('過濾：直播人數過低', result === true);
    TestRunner.assert('標記原因: low_viewer_live', mockElement.dataset.ypHidden === 'low_viewer_live');

    // 直播中，人數多 (500) -> 保留
    video = new MockVideoData({
        liveViewers: 500,
        isLive: true
    });
    result = filter._checkViewFilter(video, mockElement);
    TestRunner.assert('保留：直播人數足夠', result === false);
});

TestRunner.suite('VideoFilter - 影片時長過濾', () => {
    const config = new MockConfig();
    const filter = new VideoFilter(config);
    const mockElement = createMockElement();

    config.set('DURATION_MIN', 60);   // 最短 60秒
    config.set('DURATION_MAX', 600);  // 最長 600秒 (10分鐘)

    // 過短 (30秒)
    let video = new MockVideoData({ duration: 30 });
    let result = filter._checkDurationFilter(video, mockElement);
    TestRunner.assert('過濾：影片過短', result === true);

    // 過長 (1000秒)
    video = new MockVideoData({ duration: 1000 });
    result = filter._checkDurationFilter(video, mockElement);
    TestRunner.assert('過濾：影片過長', result === true);

    // 正常範圍 (300秒)
    video = new MockVideoData({ duration: 300 });
    result = filter._checkDurationFilter(video, mockElement);
    TestRunner.assert('保留：正常長度', result === false);

    // 忽略 Shorts (Shorts 不應被此過濾器處理，因為它們有自己的隱藏邏輯)
    video = new MockVideoData({ duration: 30, isShorts: true });
    result = filter._checkDurationFilter(video, mockElement);
    TestRunner.assert('保留 Shorts (不套用時長過濾)', result === false);
});

// ==================== 執行 ====================
console.log('🧪 YouTube Cleaner 核心邏輯測試');
console.log('=' .repeat(40));
const allPassed = TestRunner.summary();
process.exit(allPassed ? 0 : 1);
