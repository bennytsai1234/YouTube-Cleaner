import { test, expect } from '@playwright/test';
import { injectUserScript } from './utils';

test.describe('Import/Export Settings E2E', () => {

    test('大量關鍵字不會導致效能問題', async ({ page }) => {
        const manyKeywords = Array.from({ length: 100 }, (_, i) => `keyword${i}`);

        await injectUserScript(page, {
            KEYWORD_BLACKLIST: manyKeywords
        });

        await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        // 腳本不應崩潰
        const isInitialized = await page.evaluate(() => window.ytPurifierInitialized === true);
        expect(isInitialized).toBeTruthy();
    });

    test('空名單設定應正常處理', async ({ page }) => {
        await injectUserScript(page, {
            KEYWORD_BLACKLIST: [],
            CHANNEL_BLACKLIST: [],
            CHANNEL_WHITELIST: [],
            KEYWORD_WHITELIST: [],
            MEMBERS_WHITELIST: [],
            SECTION_TITLE_BLACKLIST: []
        });

        await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const isInitialized = await page.evaluate(() => window.ytPurifierInitialized === true);
        expect(isInitialized).toBeTruthy();
    });

    test('RULE_PRIORITIES 設定應正確儲存', async ({ page }) => {
        await injectUserScript(page, {
            RULE_PRIORITIES: {
                members_only: 'strong',
                shorts_item: 'strong',
                recommended_playlists: 'strong'
            }
        });

        await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const storedPriorities = await page.evaluate(() => {
            return localStorage.getItem('GM_rulePriorities');
        });

        expect(storedPriorities).toBeDefined();
        const parsed = storedPriorities ? JSON.parse(storedPriorities) : null;
        expect(parsed?.members_only).toBe('strong');
    });

    test('設定驗證 - 無效數值應被忽略', async ({ page }) => {
        // 嘗試匯入包含 NaN 的設定
        await injectUserScript(page, {
            LOW_VIEW_THRESHOLD: NaN,
            GRACE_PERIOD_HOURS: Infinity
        });

        await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // 腳本應正常運作
        const isInitialized = await page.evaluate(() => window.ytPurifierInitialized === true);
        expect(isInitialized).toBeTruthy();
    });

    test('設定匯出格式相容性檢查', async ({ page }) => {
        await injectUserScript(page, {
            OPEN_IN_NEW_TAB: true,
            ENABLE_LOW_VIEW_FILTER: true,
            LOW_VIEW_THRESHOLD: 1000,
            DEBUG_MODE: false
        });

        await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // 檢查所有 GM_ 開頭的 key 都是有效的 JSON
        const allValid = await page.evaluate(() => {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('GM_'));
            return keys.every(k => {
                try {
                    JSON.parse(localStorage.getItem(k) || '');
                    return true;
                } catch {
                    return false;
                }
            });
        });

        expect(allValid).toBeTruthy();
    });
});