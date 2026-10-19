// 用 repo 裡的頁面處理流程（VideoFilter.processElement）重播一份從真實頁面存下來的 outerHTML 快照：
// 印出腳本在頁面上會印的 [Purifier] 紀錄，和每個容器最後是藏了還是留著。
// 用法（在 repo 根目錄）：
//   node --import tsx .claude/skills/live-diagnose/replay-snapshot.mts <快照檔> [--url <頁面網址>] [--lang <語系>] [--config '<JSON>']
// --url：現場的網址，決定頻道頁、訂閱頁這類不過濾的頁面（預設首頁）。
// --lang：腳本用的語系，照腳本的規則正規化（zh-TW、zh-CN、ja、其他都算 en；預設 zh-TW）。
// --config：要覆寫的設定，鍵名同 ConfigState，例如 '{"KEYWORD_WHITELIST":["ASMR"],"RULE_ENABLES":{"youtube_featured_shelf":false}}'；
//   RULE_ENABLES／RULE_PRIORITIES 只需給要改的項目，其餘沿用預設。
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        url: { type: 'string', default: 'https://www.youtube.com/' },
        lang: { type: 'string', default: 'zh-TW' },
        config: { type: 'string', default: '{}' }
    }
});
const [snapshotPath] = positionals;
if (!snapshotPath) throw new Error('缺少快照檔路徑');

const repo = new URL('../../../', import.meta.url);
const load = (path: string) => import(new URL(path, repo).href);

// GM 儲存要在載入設定前裝好；語系放在 <html lang>，由腳本自己的 detectLanguage 正規化
const { installDom, installGMStorage } = await load('test/helpers/browser-env.ts');
installGMStorage();

// browser_evaluate 存檔時把回傳的字串存成 JSON；直接存的 HTML 也收
const raw = readFileSync(snapshotPath, 'utf8');
const html = (raw.trimStart().startsWith('"') ? JSON.parse(raw) : raw)
    .replace(/ data-yp-(checked|hidden|had-inline-style|original-style)="[^"]*"/g, '');
installDom(`<!doctype html><html lang="${values.lang}"><body>${html}</body></html>`, { url: values.url });

const { ConfigManager } = await load('src/core/config.ts');
const { VideoFilter } = await load('src/features/video-filter.ts');
const { LazyVideoData } = await load('src/features/video-data.ts');
const { SELECTORS } = await load('src/data/selectors.ts');
const { Logger } = await load('src/core/logger.ts');

const config = new ConfigManager();
for (const [key, value] of Object.entries(JSON.parse(values.config))) {
    const merged = key === 'RULE_ENABLES' || key === 'RULE_PRIORITIES' ? { ...config.get(key), ...(value as object) } : value;
    config.set(key, merged);
}

// 收集腳本的紀錄，跟 attach.js 撈到的現場紀錄對照
const logs: string[] = [];
Logger.enabled = true;
console.log = (msg: unknown) => { logs.push(String(msg).replace(/^%c/, '')); };
console.warn = (msg: unknown) => { logs.push(String(msg)); };

// 照頁面上的順序逐一處理（同 processPage 沒有 requestIdleCallback 時的路徑），外層容器先判斷，內層會被略過
const filter = new VideoFilter(config);
const elements = Array.from(document.querySelectorAll<HTMLElement>(SELECTORS.allContainers));
elements.forEach(el => filter.processElement(el));

const out = (line: string) => process.stdout.write(`${line}\n`);
if (config.get('ENABLE_REGION_CONVERT')) {
    out('注意：正式腳本以 @require 載入 opencc-js 做繁簡互通，這裡沒有載入，繁簡字形不同的黑白名單比對可能跟現場不同');
}
out(`頁面不過濾：${filter.isPageAllowingContent}`);
logs.forEach(line => out(line));
for (const el of elements) {
    const item = new LazyVideoData(el);
    // 外層容器被藏時，內層也看不到
    const hiddenBy = el.closest<HTMLElement>('[data-yp-hidden]');
    out(JSON.stringify({
        tag: el.tagName.toLowerCase(),
        title: item.title,
        channel: item.channel,
        state: hiddenBy ? `hidden:${hiddenBy.dataset.ypHidden}` : el.dataset.ypChecked ? 'kept' : 'unchecked'
    }));
}
