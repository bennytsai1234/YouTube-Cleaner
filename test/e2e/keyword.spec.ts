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
        
        // 等待影片與腳本處理完畢，增加到 6 秒確保所有 API 都成功返回資料
        await page.waitForTimeout(6000);
        
        // 收集頁面上 *未被腳本徹底隱藏* 的影片標題
        // 腳本運作時可能會將 parent renderer 設定為 hidden / display:none / opacity:0
        // 為確保測試精確，我們直接抓所有視為「有效」的 #video-title
        const visibleTitles = [];
        const titles = page.locator('ytd-video-renderer #video-title');
        
        for (let i = 0; i < await titles.count(); i++) {
            const el = titles.nth(i);
            const isVisible = await el.evaluate(node => {
                const renderer = node.closest('ytd-video-renderer');
                if (!renderer) return true;
                const style = window.getComputedStyle(renderer);
                return style.display !== 'none' && !renderer.hasAttribute('hidden') && !renderer.hasAttribute('data-yp-hidden');
            });
            if (isVisible) {
                visibleTitles.push((await el.innerText()).toLowerCase());
            }
        }
        
        // 驗證仍可見的影片中，有沒有標題包含 "遊戲" 或 "游戏"
        const hasVisibleKeyword = visibleTitles.some(title => 
            title.includes('遊戲') || title.includes('游戏')
        );
        
        expect(hasVisibleKeyword).toBeFalsy();
    });

});
