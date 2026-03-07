import { test, expect } from '@playwright/test';
import { injectUserScript } from './utils';

test.describe('Low Views Filter E2E', () => {

    test('應該隱藏觀看次數低於門檻的影片', async ({ page }) => {
        // 設定較高的觀看門檻 (例如 1億)，確保一般影片會被攔截
        await injectUserScript(page, {
            ENABLE_LOW_VIEW_FILTER: true,
            LOW_VIEW_THRESHOLD: 100000000, 
            GRACE_PERIOD_HOURS: 0 // 關閉豁免期，嚴格執行門檻
        });
        
        await page.goto('https://www.youtube.com/results?search_query=music', { waitUntil: 'domcontentloaded' });
        
        // 等待影片與腳本處理完畢
        await page.waitForTimeout(4000);
        
        // 抓取畫面上仍然可見的影片觀看數 (從 metadata 中)
        const metadataItems = await page.locator('ytd-video-renderer .inline-metadata-item').allInnerTexts();
        
        // 解析並過濾含有 views / 觀看 的字串
        const viewTexts = metadataItems.filter(text => text.includes('view') || text.includes('觀看') || text.includes('万') || text.includes('亿') || text.includes('萬'));
        
        // 確保不會出現明顯小於一億的字串 (例如 "10K views", "50萬次觀看")
        const hasLowViews = viewTexts.some(text => {
            // 極低觀看只有數字沒有單位
            if (/^\d+\s*(views|觀看)/i.test(text)) return true;
            // 千級別
            if (/\d+K\s*(views|觀看)/i.test(text)) return true;
            return false;
        });
        
        expect(hasLowViews).toBeFalsy();
    });

});
