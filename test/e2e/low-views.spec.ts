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
        
        // 等待影片與腳本處理完畢，增加到 6 秒確保所有 API 都成功返回資料
        await page.waitForTimeout(6000);
        
        // 抓取畫面上仍然可見的影片觀看數 (從 metadata 中)
        const metadataItems = await page.locator('ytd-video-renderer .inline-metadata-item').allInnerTexts();
        
        // 解析並過濾含有 views / 觀看 的字串
        const viewTexts = metadataItems.filter(text => text.includes('view') || text.includes('觀看') || text.includes('万') || text.includes('亿') || text.includes('萬'));
        
        // 確保不會出現明顯小於一億的字串 (例如 "10K views", "50萬次觀看")
        const hasLowViews = viewTexts.some(text => {
            // 確保不會出現明顯小於一億的字串 (不含 M, B, 億, 万 等大單位)
            // 即匹配純數字或只有 K 的狀況
            if (/^\d+(\.\d+)?\s*(K|k|千)?\s*(views|觀看|次觀看|次观看|次阅读)/i.test(text)) {
                 // 有 K 代表幾千，純字串代表幾百
                 return true;
            }
            return false;
        });
        
        expect(hasLowViews).toBeFalsy();
    });

});
