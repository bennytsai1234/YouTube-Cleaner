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
collectSelectors('SHELF_HEADER_TEXT', SELECTORS.SHELF_HEADER_TEXT);
collectSelectors('MEMBERSHIP_UPSELL_SECTION', SELECTORS.MEMBERSHIP_UPSELL_SECTION);
collectSelectors('BADGES.MEMBERS', SELECTORS.BADGES.MEMBERS);
collectSelectors('BADGES.AD', SELECTORS.BADGES.AD);
collectSelectors('BADGES.SHORTS', SELECTORS.BADGES.SHORTS);
collectSelectors('BADGES.TEXT', SELECTORS.BADGES.TEXT);
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

runner.suite('SELECTORS - 會員招募區塊應精準命中外層 section', () => {
    document.body.innerHTML = `
        <ytd-rich-section-renderer id="membership-upsell">
            <ytd-brand-video-shelf-renderer has-sponsorships-channel-upsell-view-model>
                <yt-sponsorships-channel-upsell-view-model></yt-sponsorships-channel-upsell-view-model>
            </ytd-brand-video-shelf-renderer>
        </ytd-rich-section-renderer>
        <ytd-rich-section-renderer id="featured-shelf">
            <ytd-rich-shelf-renderer>
                <h2 id="title">YouTube 精選</h2>
            </ytd-rich-shelf-renderer>
        </ytd-rich-section-renderer>
    `;

    const matches = document.querySelectorAll(SELECTORS.MEMBERSHIP_UPSELL_SECTION);
    runner.assertEqual('應只命中 1 個會員招募區塊', matches.length, 1);
    runner.assertEqual('應命中最外層 rich section', (matches[0] as HTMLElement)?.id, 'membership-upsell');
});

runner.suite('SELECTORS - aria-label 標記不比對影片標題與頻道頭像', () => {
    document.body.innerHTML = `
        <yt-lockup-view-model id="normal">
            <yt-avatar-shape><div role="button" aria-label="前往頻道：廣告人 Sponsor 會員專屬"></div></yt-avatar-shape>
            <h3 aria-label="這支廣告太好笑了 How I got a Sponsor 會員專屬 Members only">
                <a href="/watch?v=a" aria-label="這支廣告太好笑了 How I got a Sponsor 會員專屬 Members only">title</a>
            </h3>
            <span id="video-title" aria-label="這支廣告太好笑了 來自 Sponsor">title</span>
        </yt-lockup-view-model>
        <yt-lockup-view-model id="ad">
            <button aria-label="我的廣告中心"></button>
        </yt-lockup-view-model>
        <yt-lockup-view-model id="members">
            <div class="badge" aria-label="頻道會員專屬"></div>
        </yt-lockup-view-model>
    `;

    const normal = document.getElementById('normal')!;
    runner.assertEqual('標題含廣告字樣的一般影片不應命中 BADGES.AD', normal.querySelector(SELECTORS.BADGES.AD), null);
    runner.assertEqual('標題含會員字樣的一般影片不應命中 BADGES.MEMBERS', normal.querySelector(SELECTORS.BADGES.MEMBERS), null);
    runner.assert('廣告卡片的「我的廣告中心」按鈕應命中 BADGES.AD', document.getElementById('ad')!.querySelector(SELECTORS.BADGES.AD) !== null);
    runner.assert('會員 badge 的 aria-label 應命中 BADGES.MEMBERS', document.getElementById('members')!.querySelector(SELECTORS.BADGES.MEMBERS) !== null);
});

exitWithSummary(runner);
