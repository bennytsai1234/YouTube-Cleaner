import { SELECTORS } from '../src/data/selectors';
import { installDom } from './helpers/browser-env';
import { exitWithSummary, TestRunner } from './helpers/test-runner';

const runner = new TestRunner('Selectors 測試結果');
installDom();

const selectorEntries: Array<[string, string]> = [];

const collectSelectors = (label: string, value: string | string[]): void => {
    if (Array.isArray(value)) {
        value.forEach((selector, index) => selectorEntries.push([`${label}[${index}]`, selector]));
        return;
    }
    selectorEntries.push([label, value]);
};

collectSelectors('allContainers', SELECTORS.allContainers);
collectSelectors('videoContainersStr', SELECTORS.videoContainersStr);
collectSelectors('METADATA.TEXT', SELECTORS.METADATA.TEXT);
collectSelectors('METADATA.TITLE_LINKS', SELECTORS.METADATA.TITLE_LINKS);
collectSelectors('METADATA.DURATION', SELECTORS.METADATA.DURATION);
collectSelectors('METADATA.CHANNEL', SELECTORS.METADATA.CHANNEL);
collectSelectors('METADATA.TITLE', SELECTORS.METADATA.TITLE);
collectSelectors('SHELF_TITLE', SELECTORS.SHELF_TITLE);
collectSelectors('BADGES.MEMBERS', SELECTORS.BADGES.MEMBERS);
collectSelectors('BADGES.AD', SELECTORS.BADGES.AD);
collectSelectors('BADGES.SHORTS', SELECTORS.BADGES.SHORTS);
collectSelectors('BADGES.MIX', SELECTORS.BADGES.MIX);
collectSelectors('INTERACTION_EXCLUDE', SELECTORS.INTERACTION_EXCLUDE);
collectSelectors('CLICKABLE', SELECTORS.CLICKABLE);
collectSelectors('PREVIEW_PLAYER', SELECTORS.PREVIEW_PLAYER);
collectSelectors('LINK_CANDIDATES', SELECTORS.LINK_CANDIDATES);

runner.suite('SELECTORS - 所有 CSS selector 語法有效', () => {
    for (const [label, selector] of selectorEntries) {
        let valid = true;
        try {
            document.querySelectorAll(selector);
        } catch {
            valid = false;
        }
        runner.assert(`${label} 應可被 querySelectorAll 解析`, valid);
    }
});

runner.suite('SELECTORS - 組合 selector 與來源陣列一致', () => {
    runner.assertEqual('allContainers 應由影片與區塊容器組成', SELECTORS.allContainers, [...SELECTORS.VIDEO_CONTAINERS, ...SELECTORS.SECTION_CONTAINERS].join(', '));
    runner.assertEqual('videoContainersStr 應由影片容器組成', SELECTORS.videoContainersStr, SELECTORS.VIDEO_CONTAINERS.join(', '));
    runner.assert('LINK_CANDIDATES 應保留多個備援 selector', SELECTORS.LINK_CANDIDATES.length > 5);
    runner.assert('METADATA.TITLE_LINKS 應保留 aria-label fallback', SELECTORS.METADATA.TITLE_LINKS.some(selector => selector.includes('aria-label')));
});

exitWithSummary(runner);
