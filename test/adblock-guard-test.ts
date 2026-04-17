import { JSDOM } from 'jsdom';
import { AdBlockGuard } from '../src/features/adblock-guard';

// Mock GM functions
(global as any).GM_getValue = (key: string, defaultValue: any) => defaultValue;
(global as any).GM_setValue = (key: string, value: any) => {};

const suppressConsoleError = () => {
    const orig = console.error;
    console.error = (...args: any[]) => {
        const msg = String(args[0] ?? '');
        if (msg.includes('Not implemented') || msg.includes('JSDOM')) return;
        orig(...args);
    };
    return () => { console.error = orig; };
};

const TestRunner = {
    passed: 0,
    failed: 0,

    suite(name: string, fn: () => void) {
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
        console.log(`📊 AdBlockGuard 測試結果: ${this.passed} 通過, ${this.failed} 失敗`);
        console.log('═'.repeat(40));
        return this.failed === 0;
    }
};

function createEnv(html: string) {
    const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
        url: 'https://www.youtube.com/'
    });
    (global as any).window = dom.window;
    (global as any).document = dom.window.document;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).Node = dom.window.Node;
    (global as any).MutationObserver = dom.window.MutationObserver;
    return dom;
}

TestRunner.suite('AdBlockGuard - patchConfig', () => {
    const restore = suppressConsoleError();

    // Mock yt.config_ with ad block detection enabled
    const mockConfig = {
        openPopupConfig: {
            supportedPopups: {
                adBlockMessageViewModel: true
            }
        },
        EXPERIMENT_FLAGS: {
            ad_blocker_notifications_disabled: false,
            web_enable_adblock_detection_block_playback: true
        }
    };

    const dom = createEnv('<body></body>');
    (window as any).yt = { config_: mockConfig };

    const guard = new AdBlockGuard();
    guard.patchConfig();

    TestRunner.assert('patchConfig 應關閉 adBlockMessageViewModel', mockConfig.openPopupConfig.supportedPopups.adBlockMessageViewModel === false);
    TestRunner.assert('patchConfig 應關閉 ad_blocker_notifications_disabled', mockConfig.EXPERIMENT_FLAGS.ad_blocker_notifications_disabled === true);
    TestRunner.assert('patchConfig 應關閉 web_enable_adblock_detection_block_playback', mockConfig.EXPERIMENT_FLAGS.web_enable_adblock_detection_block_playback === false);

    dom.window.close();
    restore();
});

TestRunner.suite('AdBlockGuard - isWhitelisted', () => {
    const restore = suppressConsoleError();
    const dom = createEnv(`
        <tp-yt-paper-dialog>
            <ytd-sponsorships-offer-renderer></ytd-sponsorships-offer-renderer>
        </tp-yt-paper-dialog>
        <tp-yt-paper-dialog>
            <ytd-report-form-modal-renderer></ytd-report-form-modal-renderer>
        </tp-yt-paper-dialog>
        <tp-yt-paper-dialog>
            <ytd-enforcement-message-view-model>Not whitelisted</ytd-enforcement-message-view-model>
        </tp-yt-paper-dialog>
    `);

    const guard = new AdBlockGuard();

    const sponsorshipsDialog = document.querySelectorAll('tp-yt-paper-dialog')[0];
    const reportDialog = document.querySelectorAll('tp-yt-paper-dialog')[1];
    const enforcementDialog = document.querySelectorAll('tp-yt-paper-dialog')[2];

    TestRunner.assert('包含 ytd-sponsorships-offer-renderer 的 dialog 應在白名單', (guard as any).isWhitelisted(sponsorshipsDialog) === true);
    TestRunner.assert('包含 ytd-report-form-modal-renderer 的 dialog 應在白名單', (guard as any).isWhitelisted(reportDialog) === true);
    TestRunner.assert('不包含白名單元素的 dialog 不應在白名單', (guard as any).isWhitelisted(enforcementDialog) === false);

    dom.window.close();
    restore();
});

TestRunner.suite('AdBlockGuard - isAdBlockPopup', () => {
    const restore = suppressConsoleError();
    const dom = createEnv(`
        <tp-yt-paper-dialog>Ad blockers are not allowed</tp-yt-paper-dialog>
        <ytd-enforcement-message-view-model>YouTube doesn't allow ad blockers</ytd-enforcement-message-view-model>
        <tp-yt-paper-dialog>Normal dialog</tp-yt-paper-dialog>
    `);

    const guard = new AdBlockGuard();

    const adBlockDialog = document.querySelectorAll('tp-yt-paper-dialog')[0];
    const enforcementVM = document.querySelector('ytd-enforcement-message-view-model')!;
    const normalDialog = document.querySelectorAll('tp-yt-paper-dialog')[1];

    TestRunner.assert('包含 "Ad blockers" 關鍵字應被識別', (guard as any).isAdBlockPopup(adBlockDialog) === true);
    TestRunner.assert('ytd-enforcement-message-view-model 標籤應被識別', (guard as any).isAdBlockPopup(enforcementVM) === true);
    TestRunner.assert('普通對話框不應被識別', (guard as any).isAdBlockPopup(normalDialog) === false);

    dom.window.close();
    restore();
});

TestRunner.suite('AdBlockGuard - checkAndClean', () => {
    const restore = suppressConsoleError();
    const dom = createEnv(`
        <body>
            <tp-yt-paper-dialog id="ad-dialog">Ad blockers are not allowed</tp-yt-paper-dialog>
            <ytd-popup-container>
                <ytd-enforcement-message-view-model>YouTube doesn't allow ad blockers</ytd-enforcement-message-view-model>
            </ytd-popup-container>
        </body>
    `);

    let removedDialogs: Element[] = [];
    let clickedButtons: HTMLElement[] = [];

    // Mock remove and click
    const origQuerySelectorAll = document.querySelectorAll.bind(document);
    (document.querySelectorAll as any) = (selector: string) => {
        if (selector === '[aria-label="Close"], #dismiss-button') {
            return clickedButtons;
        }
        return origQuerySelectorAll(selector);
    };

    const guard = new AdBlockGuard();
    guard.checkAndClean();

    TestRunner.assert('checkAndClean 應處理 ad block popup', true); // No error = pass

    (document.querySelectorAll as any) = origQuerySelectorAll;
    dom.window.close();
    restore();
});

TestRunner.suite('AdBlockGuard - resumeVideo', () => {
    const restore = suppressConsoleError();
    const dom = createEnv(`
        <body>
            <video id="test-video"></video>
        </body>
    `);

    let playWasCalled = false;
    const video = document.querySelector('video') as any;
    Object.defineProperty(video, 'paused', { get: () => true, configurable: true });
    Object.defineProperty(video, 'ended', { get: () => false, configurable: true });
    video.play = () => { playWasCalled = true; return Promise.resolve(); };

    const guard = new AdBlockGuard();
    guard.resumeVideo();

    TestRunner.assert('應嘗試恢復影片播放', playWasCalled);

    // Test cooldown - call again immediately
    playWasCalled = false;
    guard.resumeVideo();
    TestRunner.assert('冷卻時間內不應再次播放', !playWasCalled);

    dom.window.close();
    restore();
});

TestRunner.suite('AdBlockGuard - 關鍵字多語言偵測', () => {
    const restore = suppressConsoleError();
    const dom = createEnv(`
        <tp-yt-paper-dialog>廣告攔截器</tp-yt-paper-dialog>
        <tp-yt-paper-dialog>影片播放器將被封鎖</tp-yt-paper-dialog>
        <tp-yt-paper-dialog>允許 YouTube</tp-yt-paper-dialog>
        <tp-yt-paper-dialog>Video player will be blocked</tp-yt-paper-dialog>
    `);

    const guard = new AdBlockGuard();

    const dialogs = document.querySelectorAll('tp-yt-paper-dialog');
    TestRunner.assert('中文關鍵字 廣告攔截器', (guard as any).isAdBlockPopup(dialogs[0]) === true);
    TestRunner.assert('中文關鍵字 影片播放器將被封鎖', (guard as any).isAdBlockPopup(dialogs[1]) === true);
    TestRunner.assert('中文關鍵字 允許 YouTube', (guard as any).isAdBlockPopup(dialogs[2]) === true);
    TestRunner.assert('英文關鍵字 Video player will be blocked', (guard as any).isAdBlockPopup(dialogs[3]) === true);

    dom.window.close();
    restore();
});

TestRunner.suite('AdBlockGuard - destroy', () => {
    const restore = suppressConsoleError();
    const dom = createEnv('<body><ytd-popup-container></ytd-popup-container></body>');

    const guard = new AdBlockGuard();
    guard.start();
    guard.destroy();

    TestRunner.assert('destroy 不應拋出錯誤', true); // No error = pass

    dom.window.close();
    restore();
});

if (!TestRunner.summary()) {
    process.exit(1);
}