import { test, expect } from '@playwright/test';
import { injectUserScript } from './utils';

test.describe('Keyword Filter E2E', () => {

    test('應該隱藏標題中含有被封鎖關鍵字的影片', async ({ page }) => {
        // 設定阻擋關鍵字 "遊戲" (這應該連帶利用 OpenCC 過濾掉 "游戏")
        await injectUserScript(page, {
            ENABLE_KEYWORD_FILTER: true,
            KEYWORD_BLACKLIST: ['遊戲']
        });
        
        await page.goto('https://www.youtube.com/results?search_query=遊戲', { waitUntil: 'domcontentloaded' });
        
        await page.waitForSelector('ytd-video-renderer #video-title', { timeout: 15000 });

        // YouTube 結果與 userscript mutation 處理在 CI 上偶爾會慢於固定等待時間。
        // 輪詢直到含關鍵字的可見 renderer 都被腳本標記/隱藏，並在失敗時保留實際標題。
        await expect.poll(async () => {
            return page.locator('ytd-video-renderer #video-title').evaluateAll(nodes => {
                return nodes
                    .map(node => {
                        const title = (node.textContent || '').trim().toLowerCase();
                        const renderer = node.closest('ytd-video-renderer') as HTMLElement | null;
                        if (!renderer) return { title, visible: true };

                        const style = window.getComputedStyle(renderer);
                        const visible =
                            style.display !== 'none' &&
                            style.visibility !== 'hidden' &&
                            !renderer.hasAttribute('hidden') &&
                            !renderer.hasAttribute('data-yp-hidden');

                        return { title, visible };
                    })
                    .filter(item => item.visible && (item.title.includes('遊戲') || item.title.includes('游戏')))
                    .map(item => item.title);
            });
        }, {
            message: '仍有含關鍵字「遊戲 / 游戏」的搜尋結果可見',
            timeout: 20000
        }).toEqual([]);
    });

});
