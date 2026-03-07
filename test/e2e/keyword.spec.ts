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
        
        // 等待影片與腳本處理完畢
        await page.waitForTimeout(4000);
        
        // 收集頁面上 *仍然可見* 的影片標題
        // allInnerTexts 只會回傳 visible 元素的文字，因此被腳本隱藏的元素文字不會出現在這裡
        const visibleTitles = await page.locator('ytd-video-renderer #video-title').allInnerTexts();
        
        // 驗證仍可見的影片中，有沒有標題包含 "遊戲" 或 "游戏"
        const hasVisibleKeyword = visibleTitles.some(title => 
            title.includes('遊戲') || title.includes('游戏')
        );
        
        expect(hasVisibleKeyword).toBeFalsy();
    });

});
