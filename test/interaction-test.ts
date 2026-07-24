import { JSDOM } from 'jsdom';
import { InteractionEnhancer } from '../src/features/interaction';
import { TestRunner as Runner } from './helpers/test-runner';

// Mock GM functions for test environment
(global as any).GM_getValue = (key: string, defaultValue: any) => defaultValue;
(global as any).GM_setValue = (key: string, value: any) => {};

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
    const message = String(args[0] ?? '');
    if (message.includes('Not implemented: navigation (except hash changes)')) return;
    originalConsoleError(...args);
};

const TestRunner = new Runner('Interaction 測試結果');

class MockConfig {
    private state: Record<string, any>;

    constructor(overrides: Record<string, any> = {}) {
        this.state = {
            OPEN_IN_NEW_TAB: true,
            OPEN_NOTIFICATIONS_IN_NEW_TAB: true,
            ...overrides
        };
    }

    get(key: string): any {
        return Reflect.get(this.state, key);
    }
}

function createEnv(html: string, url = 'https://www.youtube.com/') {
    const dom = new JSDOM('<!doctype html><html><body>' + html + '</body></html>', {
        url
    });

    (global as any).window = dom.window;
    (global as any).document = dom.window.document;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).HTMLAnchorElement = dom.window.HTMLAnchorElement;
    (global as any).MouseEvent = dom.window.MouseEvent;
    (global as any).location = dom.window.location;
    (global as any).URL = dom.window.URL;

    const opened: Array<{ url: string; target: string }> = [];
    (dom.window as any).open = (url: string, target: string) => {
        opened.push({ url, target });
        return null;
    };

    return { window: dom.window, document: dom.window.document, opened };
}

function click(windowRef: any, el: Element, init: MouseEventInit = {}): boolean {
    const evt = new windowRef.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
        ...init
    });
    return el.dispatchEvent(evt);
}

TestRunner.suite('InteractionEnhancer - 一般新分頁邏輯', () => {
    const { window, document, opened } = createEnv(`
        <ytd-video-renderer id="item">
            <a id="thumbnail" href="https://www.youtube.com/watch?v=abc123">
                <span id="inner">Click</span>
            </a>
        </ytd-video-renderer>
    `);

    const enhancer = new InteractionEnhancer(new MockConfig() as any);
    enhancer.init();

    const inner = document.getElementById('inner')!;
    const notCanceled = click(window as any, inner);

    TestRunner.assert('應呼叫 window.open', opened.length === 1);
    TestRunner.assert('應使用 _blank 開啟', opened[0]?.target === '_blank');
    TestRunner.assert('應開啟正確 watch 連結', opened[0]?.url === 'https://www.youtube.com/watch?v=abc123');
    TestRunner.assert('事件應被攔截 (preventDefault)', notCanceled === false);
});

TestRunner.suite('InteractionEnhancer - 排除按鈕點擊', () => {
    const { window, document, opened } = createEnv(`
        <ytd-video-renderer id="item">
            <button id="menu-btn">Menu</button>
            <a id="thumbnail" href="https://www.youtube.com/watch?v=abc123">Video</a>
        </ytd-video-renderer>
    `);

    const enhancer = new InteractionEnhancer(new MockConfig() as any);
    enhancer.init();

    const button = document.getElementById('menu-btn')!;
    click(window as any, button);

    TestRunner.assert('點擊排除元素不應開新分頁', opened.length === 0);
});

TestRunner.suite('InteractionEnhancer - 系統快捷鍵應交給瀏覽器', () => {
    const { window, document, opened } = createEnv(`
        <ytd-video-renderer id="item">
            <a id="thumbnail" href="https://www.youtube.com/watch?v=abc123">
                <span id="inner">Click</span>
            </a>
        </ytd-video-renderer>
    `);

    const enhancer = new InteractionEnhancer(new MockConfig() as any);
    enhancer.init();

    const inner = document.getElementById('inner')!;
    click(window as any, inner, { ctrlKey: true });

    TestRunner.assert('Ctrl+Click 不應被腳本攔截', opened.length === 0);
});

TestRunner.suite('InteractionEnhancer - 通知面板新分頁', () => {
    const { window, document, opened } = createEnv(`
        <ytd-notification-renderer id="notify">
            <a class="yt-simple-endpoint" id="notif-link" href="https://www.youtube.com/watch?v=notify1">
                <span id="notif-inner">Notif</span>
            </a>
        </ytd-notification-renderer>
    `);

    const enhancer = new InteractionEnhancer(new MockConfig({
        OPEN_IN_NEW_TAB: false,
        OPEN_NOTIFICATIONS_IN_NEW_TAB: true
    }) as any);
    enhancer.init();

    const inner = document.getElementById('notif-inner')!;
    click(window as any, inner);

    TestRunner.assert('通知連結應開新分頁', opened.length === 1);
    TestRunner.assert('通知連結 URL 正確', opened[0]?.url === 'https://www.youtube.com/watch?v=notify1');
});

TestRunner.suite('InteractionEnhancer - 通知面板按鈕不攔截', () => {
    const { window, document, opened } = createEnv(`
        <ytd-notification-renderer id="notify">
            <a class="yt-simple-endpoint" id="notif-link" href="https://www.youtube.com/watch?v=notify1">
                <button id="notif-btn">Action</button>
            </a>
        </ytd-notification-renderer>
    `);

    const enhancer = new InteractionEnhancer(new MockConfig({
        OPEN_NOTIFICATIONS_IN_NEW_TAB: true
    }) as any);
    enhancer.init();

    const button = document.getElementById('notif-btn')!;
    click(window as any, button);

    TestRunner.assert('通知區按鈕點擊不應開新分頁', opened.length === 0);
});

TestRunner.suite('InteractionEnhancer - 非 YouTube 連結不攔截', () => {
    const { window, document, opened } = createEnv(`
        <ytd-video-renderer id="item">
            <a id="thumbnail" href="https://example.com/watch?v=abc123">
                <span id="inner">Click</span>
            </a>
        </ytd-video-renderer>
    `);

    const enhancer = new InteractionEnhancer(new MockConfig() as any);
    enhancer.init();

    const inner = document.getElementById('inner')!;
    click(window as any, inner);

    TestRunner.assert('非 YouTube 網域不應被腳本 window.open', opened.length === 0);
});

TestRunner.suite('InteractionEnhancer - ytp videowall 回歸測試', () => {
    const { window, document, opened } = createEnv(`
        <a class="ytp-modern-videowall-still ytp-suggestion-set" id="videowall"
           href="https://www.youtube.com/watch?v=H9OXzb55vcQ">
            <span id="videowall-inner">Suggestion</span>
        </a>
    `);

    const enhancer = new InteractionEnhancer(new MockConfig() as any);
    enhancer.init();

    const inner = document.getElementById('videowall-inner')!;
    click(window as any, inner);

    TestRunner.assert('videowall 卡片應開新分頁', opened.length === 1);
    TestRunner.assert('videowall URL 應正確', opened[0]?.url === 'https://www.youtube.com/watch?v=H9OXzb55vcQ');
    TestRunner.assert('videowall 也應使用 _blank', opened[0]?.target === '_blank');
});

TestRunner.suite('InteractionEnhancer - watch page secondary 推薦卡片應開新分頁', () => {
    const { window, document, opened } = createEnv(`
        <div id="secondary">
            <yt-lockup-view-model class="ytd-item-section-renderer lockup ytLockupViewModelWrapper">
                <div class="ytLockupViewModelHost">
                    <a href="https://www.youtube.com/watch?v=secondary1" class="ytLockupViewModelContentImage">
                        <span>thumb</span>
                    </a>
                    <div class="ytLockupViewModelMetadata">
                        <yt-lockup-metadata-view-model>
                            <div class="ytLockupMetadataViewModelTextContainer" id="secondary-text">
                                <h3>
                                    <a href="https://www.youtube.com/watch?v=secondary1" class="ytLockupMetadataViewModelTitle">
                                        <span>Secondary recommendation</span>
                                    </a>
                                </h3>
                            </div>
                            <button aria-label="其他動作" id="secondary-menu">Menu</button>
                        </yt-lockup-metadata-view-model>
                    </div>
                </div>
            </yt-lockup-view-model>
        </div>
    `);

    const enhancer = new InteractionEnhancer(new MockConfig() as any);
    enhancer.init();

    const textContainer = document.getElementById('secondary-text')!;
    const notCanceled = click(window as any, textContainer);

    TestRunner.assert('播放頁 secondary 推薦卡片應開新分頁', opened.length === 1);
    TestRunner.assert('secondary 推薦卡片 URL 應正確', opened[0]?.url === 'https://www.youtube.com/watch?v=secondary1');
    TestRunner.assert('secondary 推薦卡片點擊事件應被攔截', notCanceled === false);

    const menu = document.getElementById('secondary-menu')!;
    click(window as any, menu);

    TestRunner.assert('secondary 推薦卡片按鈕仍不應開新分頁', opened.length === 1);
});

TestRunner.suite('InteractionEnhancer - 留言同影片時間軸跳轉不應開新分頁', () => {
    const { window, document, opened } = createEnv(`
        <ytd-comment-thread-renderer>
            <a id="comment-timestamp" href="https://www.youtube.com/watch?v=currentVideo&t=123s">2:03</a>
        </ytd-comment-thread-renderer>
    `, 'https://www.youtube.com/watch?v=currentVideo');

    const enhancer = new InteractionEnhancer(new MockConfig() as any);
    enhancer.init();

    const timestamp = document.getElementById('comment-timestamp')!;
    const notCanceled = click(window as any, timestamp);

    TestRunner.assert('同影片時間軸連結不應開新分頁', opened.length === 0);
    TestRunner.assert('同影片時間軸連結不應被 preventDefault 攔截', notCanceled === true);
});

TestRunner.suite('InteractionEnhancer - 留言其他影片連結仍應開新分頁', () => {
    const { window, document, opened } = createEnv(`
        <ytd-comment-thread-renderer>
            <a id="comment-other-video" href="https://www.youtube.com/watch?v=otherVideo&t=123s">其他影片 2:03</a>
        </ytd-comment-thread-renderer>
    `, 'https://www.youtube.com/watch?v=currentVideo');

    const enhancer = new InteractionEnhancer(new MockConfig() as any);
    enhancer.init();

    const link = document.getElementById('comment-other-video')!;
    const notCanceled = click(window as any, link);

    TestRunner.assert('其他影片時間軸連結仍應開新分頁', opened.length === 1);
    TestRunner.assert('其他影片時間軸 URL 應正確', opened[0]?.url === 'https://www.youtube.com/watch?v=otherVideo&t=123s');
    TestRunner.assert('其他影片時間軸點擊事件應被攔截', notCanceled === false);
});

TestRunner.suite('InteractionEnhancer - 播放清單完整頁連結應優先尊重實際點擊目標', () => {
    const { window, document, opened } = createEnv(`
        <ytd-rich-item-renderer id="item">
            <yt-lockup-view-model>
                <a class="ytLockupViewModelContentImage" href="https://www.youtube.com/watch?v=HuJOVEaOrmw&list=PLMggmYFMXwu73B99todnPGq19QOfjgKrz">
                    <span>thumb</span>
                </a>
                <div class="ytLockupMetadataViewModelMetadata">
                    <a id="full-playlist-link"
                       href="https://www.youtube.com/playlist?list=PLMggmYFMXwu73B99todnPGq19QOfjgKrz">
                        <span id="full-playlist-text">查看完整播放清單</span>
                    </a>
                </div>
            </yt-lockup-view-model>
        </ytd-rich-item-renderer>
    `);

    const enhancer = new InteractionEnhancer(new MockConfig() as any);
    enhancer.init();

    const text = document.getElementById('full-playlist-text')!;
    const notCanceled = click(window as any, text);

    TestRunner.assert('完整播放清單連結應開新分頁', opened.length === 1);
    TestRunner.assert('應優先開啟 playlist 連結而非 watch 連結', opened[0]?.url === 'https://www.youtube.com/playlist?list=PLMggmYFMXwu73B99todnPGq19QOfjgKrz');
    TestRunner.assert('playlist 點擊事件應被攔截', notCanceled === false);
});

TestRunner.suite('InteractionEnhancer - 彈出選單內連結應交由 YouTube 原生處理', () => {
    const { window, document, opened } = createEnv(`
        <ytd-menu-popup-renderer>
            <ytd-menu-navigation-item-renderer>
                <a class="yt-simple-endpoint" href="/playlist?list=WL">
                    <yt-formatted-string>顯示無法播放的影片</yt-formatted-string>
                </a>
            </ytd-menu-navigation-item-renderer>
        </ytd-menu-popup-renderer>
    `);

    const enhancer = new InteractionEnhancer(new MockConfig() as any);
    enhancer.init();

    const text = document.querySelector('yt-formatted-string')!;
    const notCanceled = click(window as any, text);

    TestRunner.assert('彈出選單連結不應觸發 window.open', opened.length === 0);
    TestRunner.assert('彈出選單點擊事件不應被 preventDefault', notCanceled === true);
});

if (!TestRunner.summary()) {
    process.exit(1);
}
