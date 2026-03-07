import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * 注入 YouTube Cleaner 腳本並提供 GM_APIs 模擬
 * @param page Playwright Page
 * @param customConfig 可選的初始配置，用來覆寫預設設定 (格式對應 ConfigState)
 */
export async function injectUserScript(page: Page, customConfig: any = {}) {
    // 注入 GM API Mock
    await page.addInitScript((initData) => {
        // 模擬 GM_setValue 和 GM_getValue 使用的儲存空間
        const getSnakeCaseKey = (str: string) => str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
        
        // 預載入 customConfig
        for (const [key, value] of Object.entries(initData)) {
            let storageKey = '';
            // 處理特殊 key 的對應
            if (key === 'RULE_ENABLES') {
                storageKey = 'GM_ruleEnables';
            } else if (key === 'RULE_PRIORITIES') {
                storageKey = 'GM_rulePriorities';
            } else {
                storageKey = 'GM_' + getSnakeCaseKey(key);
            }
            localStorage.setItem(storageKey, JSON.stringify(value));
        }

        (window as any).GM_getValue = (key: string, def: any) => {
            const val = localStorage.getItem('GM_' + key);
            if (val !== null) {
                try { return JSON.parse(val); } catch(e) { return val; }
            }
            return def;
        };
        (window as any).GM_setValue = (key: string, val: any) => {
            localStorage.setItem('GM_' + key, JSON.stringify(val));
        };
        (window as any).GM_registerMenuCommand = (name: string, fn: any) => {};
        (window as any).GM_info = { script: { version: 'E2E-Test' } };
        (window as any).GM_addStyle = (css: string) => {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        };
    }, customConfig);

    // 載入與執行腳本，動態尋找專案根目錄
    const rootDir = process.cwd().includes('YouTube-Cleaner') 
        ? process.cwd() 
        : path.resolve(__dirname, '../../');
        
    const scriptPath = path.resolve(rootDir, 'youtube-homepage-cleaner.user.js');
    if (!fs.existsSync(scriptPath)) {
        throw new Error(`找不到 youtube-homepage-cleaner.user.js (探索路徑: ${scriptPath})，請先執行 npm run build`);
    }
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    // Playwright addInitScript 會在 DOM 建立前執行
    await page.addInitScript({ content: scriptContent });
}
