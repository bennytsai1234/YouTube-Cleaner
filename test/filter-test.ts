/**
 * YouTube Cleaner 測試套件
 * 使用 Node.js + tsx 執行
 */

import { Utils } from '../src/core/utils';
import { CustomRuleManager } from '../src/features/custom-rules';
import { LazyVideoData } from '../src/features/video-filter';
import { I18N } from '../src/ui/i18n';
import { JSDOM } from 'jsdom';

// Mock GM functions for test environment
(global as any).GM_getValue = (key: string, defaultValue: any) => defaultValue;
(global as any).GM_setValue = (key: string, value: any) => {};


// ==================== 全域環境設定 ====================
const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
if (typeof (global as any).navigator === 'undefined') {
    (global as any).navigator = {
        language: 'en-US',
        languages: ['en-US', 'en'],
        userAgent: 'Mozilla/5.0 (Test Environment)'
    };
}

// ==================== 測試工具 ====================
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

    assertEqual(description: string, actual: any, expected: any) {
        const pass = actual === expected;
        if (pass) {
            console.log(`  ✅ ${description}`);
            this.passed++;
        } else {
            console.error(`  ❌ ${description}`);
            console.error(`     期望: ${expected}, 實際: ${actual}`);
            this.failed++;
        }
    },

    summary() {
        console.log('\n' + '═'.repeat(40));
        console.log(`📊 測試結果: ${this.passed} 通過, ${this.failed} 失敗`);
        console.log('═'.repeat(40));
        return this.failed === 0;
    }
};

// ==================== Mock 物件 ====================
class MockConfig {
    public keywords: string[] = [];
    public compiledKeywords: RegExp[] = [];

    setKeywords(list: string[]) {
        this.keywords = list;
        this.compiledKeywords = list.map(k => Utils.generateCnRegex(k)).filter((x): x is RegExp => x !== null);
    }

    matchKeyword(title: string) {
        return this.compiledKeywords.some(rx => rx.test(title));
    }
}

// ==================== Utils 測試 ====================
TestRunner.suite('Utils.parseNumeric', () => {
    // 基本數字
    TestRunner.assertEqual('解析純數字', Utils.parseNumeric('1234'), 1234);
    TestRunner.assertEqual('解析帶逗號數字', Utils.parseNumeric('1,234,567'), 1234567);

    // 英文單位
    TestRunner.assertEqual('解析 K (千)', Utils.parseNumeric('5.2K'), 5200);
    TestRunner.assertEqual('解析 M (百萬)', Utils.parseNumeric('1.5M'), 1500000);
    TestRunner.assertEqual('解析 B (十億)', Utils.parseNumeric('2B'), 2000000000);

    // 中文單位
    TestRunner.assertEqual('解析 萬', Utils.parseNumeric('3.5萬'), 35000);
    TestRunner.assertEqual('解析 億', Utils.parseNumeric('1.2億'), 120000000);
    TestRunner.assertEqual('解析 千', Utils.parseNumeric('5千'), 5000);

    // 簡體中文單位
    TestRunner.assertEqual('解析 万 (簡)', Utils.parseNumeric('2.5万'), 25000);
    TestRunner.assertEqual('解析 亿 (簡)', Utils.parseNumeric('3亿'), 300000000);

    // 邊界情況
    TestRunner.assertEqual('空字串返回 null', Utils.parseNumeric(''), null);
    TestRunner.assertEqual('null 返回 null', Utils.parseNumeric(null), null);

    // 排除時間字串
    TestRunner.assertEqual('排除 "3 days ago"', Utils.parseNumeric('3 days ago', 'view'), null);
    TestRunner.assertEqual('排除 "2年前"', Utils.parseNumeric('2年前', 'view'), null);
});

TestRunner.suite('Utils.parseDuration', () => {
    // 標準格式
    TestRunner.assertEqual('解析 mm:ss (3:45)', Utils.parseDuration('3:45'), 225);
    TestRunner.assertEqual('解析 hh:mm:ss (1:30:00)', Utils.parseDuration('1:30:00'), 5400);
    TestRunner.assertEqual('解析 0:30', Utils.parseDuration('0:30'), 30);

    // 邊界情況
    TestRunner.assertEqual('空字串返回 null', Utils.parseDuration(''), null);
    TestRunner.assertEqual('無效格式返回 null', Utils.parseDuration('abc'), null);
});

TestRunner.suite('Utils.parseTimeAgo', () => {
    // 英文
    TestRunner.assertEqual('解析 "5 minutes ago"', Utils.parseTimeAgo('5 minutes ago'), 5);
    TestRunner.assertEqual('解析 "2 hours ago"', Utils.parseTimeAgo('2 hours ago'), 120);
    TestRunner.assertEqual('解析 "3 days ago"', Utils.parseTimeAgo('3 days ago'), 4320);
    TestRunner.assertEqual('解析 "1 week ago"', Utils.parseTimeAgo('1 week ago'), 10080);
    TestRunner.assertEqual('解析 "2 months ago"', Utils.parseTimeAgo('2 months ago'), 86400);
    TestRunner.assertEqual('解析 "1 year ago"', Utils.parseTimeAgo('1 year ago'), 525600);

    // 中文
    TestRunner.assertEqual('解析 "5分鐘前"', Utils.parseTimeAgo('5分鐘前'), 5);
    TestRunner.assertEqual('解析 "2小時前"', Utils.parseTimeAgo('2小時前'), 120);
    TestRunner.assertEqual('解析 "3天前"', Utils.parseTimeAgo('3天前'), 4320);
    TestRunner.assertEqual('解析 "1週前"', Utils.parseTimeAgo('1週前'), 10080);
    TestRunner.assertEqual('解析 "2個月前"', Utils.parseTimeAgo('2月前'), 86400);

    // 秒
    TestRunner.assertEqual('解析 "seconds ago" 返回 0', Utils.parseTimeAgo('30 seconds ago'), 0);
    TestRunner.assertEqual('解析 "秒前" 返回 0', Utils.parseTimeAgo('30秒前'), 0);
});

TestRunner.suite('Utils.parseLiveViewers', () => {
    // 英文
    TestRunner.assertEqual('解析 "1.5K watching"', Utils.parseLiveViewers('1.5K watching'), 1500);
    TestRunner.assertEqual('解析 "500 viewers"', Utils.parseLiveViewers('500 viewers'), 500);

    // 中文
    TestRunner.assertEqual('解析 "1.2萬人正在觀看"', Utils.parseLiveViewers('1.2萬人正在觀看'), 12000);
    TestRunner.assertEqual('解析 "500觀眾"', Utils.parseLiveViewers('500觀眾'), 500);

    // 非直播文字
    TestRunner.assertEqual('非直播返回 null', Utils.parseLiveViewers('1.5K views'), null);
});

// ==================== Custom Rules 測試 ====================
TestRunner.suite('CustomRuleManager', () => {
    const config = {
        get: (key: string) => {
            if (key === 'RULE_ENABLES') {
                return {
                    news_block: true,
                    shorts_block: true,
                    fundraiser_block: false // Disabled rule
                };
            }
            return null;
        }
    };
    const manager = new CustomRuleManager(config as any);

    // 測試文字匹配
    const newsMatch = manager.check({} as Element, 'Breaking News Today');
    TestRunner.assert('匹配新聞關鍵字', newsMatch && newsMatch.key === 'news_block');

    const shortsMatch = manager.check({} as Element, 'Shorts');
    TestRunner.assert('匹配 Shorts 關鍵字', shortsMatch && shortsMatch.key === 'shorts_block');

    // 測試停用的規則
    TestRunner.assertEqual('忽略停用的規則', manager.check({} as Element, 'Fundraiser Event'), null);

    // 測試無匹配
    TestRunner.assertEqual('無匹配返回 null', manager.check({} as Element, 'Regular Video Title'), null);
});

// ==================== LazyVideoData 測試 (DOM Mock) ====================
TestRunner.suite('LazyVideoData', () => {
    // Setup JSDOM environment for this specific test suite
    const suiteDom = new JSDOM(`
        <div id="video-root">
            <a id="video-title">Test Video Title</a>
            <div id="metadata-line">
                <span class="inline-metadata-item">1.5M views</span>
                <span class="inline-metadata-item">2 days ago</span>
            </div>
            <ytd-channel-name>Test Channel</ytd-channel-name>
            <span class="ytd-thumbnail-overlay-time-status-renderer">10:30</span>
            <a href="/shorts/123456">Shorts Link</a>
        </div>
    `);

    // Temporarily override global document/window for this test
    const oldWindow = (global as any).window;
    const oldDocument = (global as any).document;

    (global as any).window = suiteDom.window;
    (global as any).document = suiteDom.window.document;
    (global as any).HTMLElement = suiteDom.window.HTMLElement;
    (global as any).Element = suiteDom.window.Element;
    (global as any).Node = suiteDom.window.Node;

    const el = document.getElementById('video-root') as HTMLElement;
    const video = new LazyVideoData(el);

    // Metadata extraction
    TestRunner.assertEqual('提取標題', video.title, 'Test Video Title');
    TestRunner.assertEqual('提取頻道', video.channel, 'Test Channel');

    // Parsing
    TestRunner.assertEqual('提取觀看數', video.viewCount, 1500000);
    // Note: 2 days ago = 2 * 1440 * 1 = 2880 mins
    TestRunner.assertEqual('提取發布時間 (分)', video.timeAgo, 2880);
    TestRunner.assertEqual('提取時長 (秒)', video.duration, 630);

    // Flags
    TestRunner.assert('偵測 Shorts', video.isShorts);
    TestRunner.assert('偵測非直播', !video.isLive);
});

TestRunner.suite('LazyVideoData - 新版 yt-lockup 卡片', () => {
    const suiteDom = new JSDOM(`
        <ytd-rich-item-renderer id="video-root">
            <div id="content">
                <yt-lockup-view-model class="ytd-rich-item-renderer lockup yt-lockup-view-model--wrapper">
                    <a href="/watch?v=pYIf-IPHqfg" class="yt-lockup-view-model__content-image" aria-hidden="true">
                        <yt-thumbnail-view-model>
                            <yt-thumbnail-badge-view-model>
                                <badge-shape><div class="yt-badge-shape__text">4:40</div></badge-shape>
                            </yt-thumbnail-badge-view-model>
                        </yt-thumbnail-view-model>
                    </a>
                    <div class="yt-lockup-view-model__metadata">
                        <yt-lockup-metadata-view-model>
                            <div class="yt-lockup-metadata-view-model__avatar">
                                <yt-decorated-avatar-view-model>
                                    <div aria-label="前往頻道：比特币鹏先生" role="button"></div>
                                </yt-decorated-avatar-view-model>
                            </div>
                            <div class="yt-lockup-metadata-view-model__text-container">
                                <h3 class="yt-lockup-metadata-view-model__heading-reset" title="比特币复杂调整！走势不确定性增加？涨还是跌？">
                                    <a href="/watch?v=pYIf-IPHqfg" class="yt-lockup-metadata-view-model__title" aria-label="比特币复杂调整！走势不确定性增加？涨还是跌？ 4 分鐘 40 秒">
                                        <span>比特币复杂调整！走势不确定性增加？涨还是跌？</span>
                                    </a>
                                </h3>
                                <yt-content-metadata-view-model>
                                    <div class="yt-content-metadata-view-model__metadata-row">
                                        <span class="yt-content-metadata-view-model__metadata-text">
                                            <a class="yt-core-attributed-string__link" href="/@Crypto_Mrpeng">比特币鹏先生</a>
                                        </span>
                                        <span class="yt-content-metadata-view-model__metadata-text">260</span>
                                        <span class="yt-content-metadata-view-model__metadata-text">3 天前</span>
                                    </div>
                                </yt-content-metadata-view-model>
                            </div>
                        </yt-lockup-metadata-view-model>
                    </div>
                </yt-lockup-view-model>
            </div>
        </ytd-rich-item-renderer>
    `, { url: 'https://www.youtube.com/' });

    const oldWindow = (global as any).window;
    const oldDocument = (global as any).document;

    (global as any).window = suiteDom.window;
    (global as any).document = suiteDom.window.document;
    (global as any).HTMLElement = suiteDom.window.HTMLElement;
    (global as any).Element = suiteDom.window.Element;
    (global as any).Node = suiteDom.window.Node;

    const el = document.getElementById('video-root') as HTMLElement;
    const video = new LazyVideoData(el);

    TestRunner.assertEqual('新版卡片提取標題', video.title, '比特币复杂调整！走势不确定性增加？涨还是跌？');
    TestRunner.assertEqual('新版卡片提取頻道', video.channel, '比特币鹏先生');
    TestRunner.assertEqual('新版卡片不誤抓觀看數為頻道', video.channel === '260', false);
    TestRunner.assertEqual('新版卡片提取觀看數', video.viewCount, 260);
    TestRunner.assertEqual('新版卡片提取發布時間 (分)', video.timeAgo, 4320);
    TestRunner.assertEqual('新版卡片提取時長 (秒)', video.duration, 280);
    TestRunner.assert('新版卡片提取影片網址', video.url.includes('/watch?v=pYIf-IPHqfg'));

    (global as any).window = oldWindow;
    (global as any).document = oldDocument;
});

TestRunner.suite('LazyVideoData - 跨語系時間回退', () => {
    const previousLang = I18N._lang;
    I18N._lang = 'en';

    const suiteDom = new JSDOM(`
        <div id="video-root">
            <yt-content-metadata-view-model>
                <span class="yt-content-metadata-view-model__metadata-text">260</span>
                <span class="yt-content-metadata-view-model__metadata-text">3 天前</span>
            </yt-content-metadata-view-model>
        </div>
    `, { url: 'https://www.youtube.com/' });

    const oldWindow = (global as any).window;
    const oldDocument = (global as any).document;

    (global as any).window = suiteDom.window;
    (global as any).document = suiteDom.window.document;
    (global as any).HTMLElement = suiteDom.window.HTMLElement;
    (global as any).Element = suiteDom.window.Element;
    (global as any).Node = suiteDom.window.Node;

    const el = document.getElementById('video-root') as HTMLElement;
    const video = new LazyVideoData(el);

    TestRunner.assertEqual('英文語系也能解析中文時間', video.timeAgo, 4320);

    I18N._lang = previousLang;
    (global as any).window = oldWindow;
    (global as any).document = oldDocument;
});

TestRunner.suite('Utils.generateCnRegex - 繁簡轉換', () => {
    const config = new MockConfig();

    // 檢查 OpenCC 是否可用
    const hasOpenCC = typeof (globalThis as any).OpenCC !== 'undefined';

    if (hasOpenCC) {
        // 簡體關鍵字 → 繁體標題
        config.setKeywords(['预告']);
        TestRunner.assert('簡體關鍵字匹配繁體標題', config.matchKeyword('最新電影預告片'));

        // 繁體關鍵字 → 簡體標題
        config.setKeywords(['預告']);
        TestRunner.assert('繁體關鍵字匹配簡體標題', config.matchKeyword('最新电影预告片'));

        // 混合內容
        config.setKeywords(['遊戲']);
        TestRunner.assert('繁體關鍵字匹配混合內容', config.matchKeyword('游戏实况'));
    } else {
        console.log('  ⏭️  跳過繁簡轉換測試 (OpenCC 未載入，需在瀏覽器環境測試)');
    }

    // 這些測試不需要 OpenCC
    // 特殊字元跳脫
    config.setKeywords(['Live.']);
    TestRunner.assert('正確跳脫特殊字元 (.)', config.matchKeyword('YouTube Live. Stream'));
    TestRunner.assert('不將 . 當作萬用字元', !config.matchKeyword('LiveXStream'));

    // 大小寫不敏感
    config.setKeywords(['game']);
    TestRunner.assert('大小寫不敏感匹配', config.matchKeyword('Best GAME Ever'));

    // 不匹配
    config.setKeywords(['Minecraft']);
    TestRunner.assert('正確不匹配無關標題', !config.matchKeyword('Roblox Gameplay'));
});

TestRunner.suite('Utils.debounce', () => {
    let callCount = 0;
    const fn = Utils.debounce(() => callCount++, 50);

    // 快速連續呼叫
    fn(); fn(); fn();

    // 立即檢查 (應該還沒執行)
    TestRunner.assertEqual('Debounce 延遲執行', callCount, 0);
});

// ==================== 執行測試 ====================
console.log('🧪 YouTube Cleaner 測試套件');
console.log('═'.repeat(40));

const allPassed = TestRunner.summary();

// 結束狀態碼
process.exit(allPassed ? 0 : 1);
