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
        return this.state[key];
    }
}

function createEnv(html: string) {
    const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
        url: 'https://www.youtube.com/'
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

if (!TestRunner.summary()) {
    process.exit(1);
}
