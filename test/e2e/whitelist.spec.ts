import { test, expect } from '@playwright/test';
import { injectUserScript } from './utils';

test.describe('Whitelist Filter E2E', () => {

    test('頻道白名單應該豁免低觀看次數過濾', async ({ page }) => {
        // 設定極高門檻隱藏所有影片，但設定白名單頻道保護
        await injectUserScript(page, {
            ENABLE_LOW_VIEW_FILTER: true,
            LOW_VIEW_THRESHOLD: 1000000000, // 門檻 10 億觀看
            ENABLE_CHANNEL_FILTER: true, // 頻道過濾與白名單功能
            CHANNEL_WHITELIST: ['PlayStation']
        });
        
        await page.goto('https://www.youtube.com/results?search_query=PlayStation', { waitUntil: 'domcontentloaded' });
        
        // 等待腳本處理，增加到 6 秒確保所有 API 都成功返回資料
        await page.waitForTimeout(6000);
        
        // 取得頁面上 *仍然可見* 的頻道名稱
        const visibleChannels = await page.locator('ytd-video-renderer ytd-channel-name').allInnerTexts();
        
        // 驗證白名單頻道影片是否可見
        const hasWhitelistedChannel = visibleChannels.some(name => name.toLowerCase().includes('playstation'));
        
        expect(hasWhitelistedChannel).toBeTruthy();
    });

});
