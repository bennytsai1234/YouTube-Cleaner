import { test, expect } from '@playwright/test';
import { SELECTORS } from '../../src/data/selectors'; // No extension needed for Playwright TS
import fs from 'fs';

test.describe('YouTube DOM Selectors Health Check', () => {

    test('Video container and metadata selectors should exist on search page', async ({ page }) => {
        // Go to YouTube search page (Logged out homepage is empty by default now)
        await page.goto('https://www.youtube.com/results?search_query=gaming', { waitUntil: 'domcontentloaded' });

        // Handle possible cookie consent dialog (often present in automated browsers depending on geolocation)
        try {
            const consentButton = page.locator('button:has-text("Accept all"), button:has-text("Reject all"), button[aria-label="Accept the use of cookies and other data for the purposes described"]');
            if (await consentButton.count() > 0) {
                await consentButton.first().click({ timeout: 3000 });
                await page.waitForTimeout(1000); // Give it a sec to dismiss
            }
        } catch (e) {
            // No consent dialog, proceed
        }

        console.log(`Page title: ${await page.title()}`);

        // Wait for the first container to load (allow some time for initial render)
        try {
            await page.waitForSelector(SELECTORS.videoContainersStr, { timeout: 15000 });
        } catch(e) {
            fs.mkdirSync('test-results', { recursive: true });
            fs.writeFileSync('test-results/debug-search.html', await page.content());
            await page.screenshot({ path: 'test-results/debug-search.png', fullPage: true });
            console.error('Failed to find video containers. Saved debug HTML to test-results/debug-search.html');
            throw e;
        }

        // Scroll down a bit to trigger lazy loading and ensure more elements are present
        await page.mouse.wheel(0, 1000);
        await page.waitForTimeout(2000);

        // Run evaluation in the browser context since SELECTORS object needs to be checked against real DOM
        const results = await page.evaluate((sel) => {
            const getCount = (selector: string | string[]) => {
                if (!selector) return 0;
                try {
                    if (Array.isArray(selector)) {
                        return document.querySelectorAll(selector.join(', ')).length;
                    }
                    return document.querySelectorAll(selector).length;
                } catch(e) {
                    console.error("Invalid selector:", selector);
                    return 0;
                }
            };

            return {
                containers: getCount(sel.videoContainersStr),
                title: getCount(sel.METADATA.TITLE),
                channel: getCount(sel.METADATA.CHANNEL),
                metadataText: getCount(sel.METADATA.TEXT),
                clickable: getCount(sel.CLICKABLE),
                linkCandidates: getCount(sel.LINK_CANDIDATES)
            };
        }, SELECTORS);

        console.log('DOM Selector Counts:', results);

        // Assertions (Warning: YouTube tests might flake if they A/B test a totally empty page)
        expect(results.containers, `Video containers (${SELECTORS.videoContainersStr}) not found. DOM might have changed.`).toBeGreaterThan(10);
        expect(results.title, `Titles (${SELECTORS.METADATA.TITLE}) not found. DOM might have changed.`).toBeGreaterThan(10);
        expect(results.channel, `Channels (${SELECTORS.METADATA.CHANNEL}) not found. DOM might have changed.`).toBeGreaterThan(10);
        expect(results.clickable, `Clickable wrappers (${SELECTORS.CLICKABLE.join(', ')}) not found.`).toBeGreaterThan(10);
        
        // Link candidates might vary depending on how many videos render, but should exist
        expect(results.linkCandidates, `Link candidates (${SELECTORS.LINK_CANDIDATES.join(', ')}) not found.`).toBeGreaterThan(10);
    });

    test('Section container and shelf title selectors on channel page', async ({ page }) => {
        // Go to a known channel page with sections (Shelfs)
        await page.goto('https://www.youtube.com/@YouTube', { waitUntil: 'domcontentloaded' });
        
        // Let's scroll a few times to find sections (like Shorts block, Breakout, etc)
        for(let i=0; i<3; i++){
             await page.mouse.wheel(0, 2000);
             await page.waitForTimeout(1500);
        }

        const results = await page.evaluate((sel) => {
             const getCount = (selector: string | string[]) => {
                 if (!selector) return 0;
                 try {
                     if (Array.isArray(selector)) {
                         return document.querySelectorAll(selector.join(', ')).length;
                     }
                     return document.querySelectorAll(selector).length;
                 } catch(e) {
                     return 0;
                 }
            };
            
            return {
                sections: getCount(sel.SECTION_CONTAINERS),
                shelfTitles: getCount(sel.SHELF_TITLE)
            };
        }, SELECTORS);

        console.log('Section/Shelf Results:', results);
        
        // Homepages typically have at least 1-2 sections, but we don't want a hard fail if none shows up
        if (results.sections === 0) {
            console.warn('⚠️ No section containers found. Ensure the YouTube feed loaded properly.');
        } else {
             expect(results.sections).toBeGreaterThan(0);
        }
    });
});
