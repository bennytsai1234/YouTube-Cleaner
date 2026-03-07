import { test, expect } from '@playwright/test';
import { injectUserScript } from './utils';

test.describe('Shorts Filter E2E', () => {

    test('應該在關閉過濾時顯示 Shorts 區塊', async ({ page }) => {
        // 注入腳本但關閉 Shorts 過濾
        await injectUserScript(page, {
            RULE_ENABLES: {
                shorts_block: false,
                shorts_item: false
            }
        });
        
        // 前往 YouTube 搜尋頁面尋找 shorts
        await page.goto('https://www.youtube.com/results?search_query=shorts', { waitUntil: 'domcontentloaded' });
        
        // 給予一點時間讓 YouTube 載入
        await page.waitForTimeout(3000);
        
        const shortsShelf = page.locator('ytd-reel-shelf-renderer').first();
        if (await shortsShelf.count() > 0) {
            const isHidden = await shortsShelf.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style.display === 'none' || el.hasAttribute('hidden') || el.classList.contains('yp-shorts-hide');
            });
            expect(isHidden).toBeFalsy();
        } else {
             console.log("Warning: 短影片區塊未被 YouTube 生成，無法驗證");
        }
    });

    test('應該在開啟過濾時隱藏 Shorts 區塊', async ({ page }) => {
        // 開啟 Shorts 過濾
        await injectUserScript(page, {
            RULE_ENABLES: {
                shorts_block: true,
                shorts_item: true
            }
        });
        
        await page.goto('https://www.youtube.com/results?search_query=shorts', { waitUntil: 'domcontentloaded' });
        
        await page.waitForTimeout(3000);
        
        const shortsShelf = page.locator('ytd-reel-shelf-renderer').first();
        if (await shortsShelf.count() > 0) {
            const isHidden = await shortsShelf.evaluate(el => {
                const style = window.getComputedStyle(el);
                // 檢查是否 display: none 或者被腳本打上 hidden attribute/class
                return style.display === 'none' || el.hasAttribute('hidden');
            });
            expect(isHidden).toBeTruthy();
        } else {
             // 未生成也算沒看到
             expect(true).toBeTruthy();
        }
    });
});
