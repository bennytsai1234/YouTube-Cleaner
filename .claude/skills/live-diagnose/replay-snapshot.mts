// 用 repo 裡的過濾引擎重播一份從真實頁面存下來的 outerHTML 快照，印出每個元素命中的規則和白名單判斷。
// 用法（在 repo 根目錄）：
//   node --import tsx .claude/skills/live-diagnose/replay-snapshot.mts <快照檔> [--lang zh-TW] [--config '<JSON>']
// --config 是要覆寫的設定，鍵名同 ConfigState，例如 '{"KEYWORD_WHITELIST":["ASMR"],"RULE_ENABLES":{"youtube_featured_shelf":false}}'；
// RULE_ENABLES／RULE_PRIORITIES 只需給要改的項目，其餘沿用預設。
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        lang: { type: 'string', default: 'zh-TW' },
        config: { type: 'string', default: '{}' }
    }
});
const [snapshotPath] = positionals;
if (!snapshotPath) throw new Error('缺少快照檔路徑');

const repo = new URL('../../../', import.meta.url);
const load = (path: string) => import(new URL(path, repo).href);

// GM 儲存要在載入設定前裝好；語系決定會員 badge 等文字規則用哪一組 pattern
const { installDom, installGMStorage } = await load('test/helpers/browser-env.ts');
installGMStorage({ ui_language: values.lang });

// browser_evaluate 存檔時把回傳的字串存成 JSON；直接存的 HTML 也收
const raw = readFileSync(snapshotPath, 'utf8');
const html = (raw.trimStart().startsWith('"') ? JSON.parse(raw) : raw)
    .replace(/ data-yp-(checked|hidden)="[^"]*"/g, '');
installDom(`<!doctype html><html lang="${values.lang}"><body>${html}</body></html>`);

const { ConfigManager } = await load('src/core/config.ts');
const { FilterEngine } = await load('src/features/filter-engine.ts');
const { LazyVideoData } = await load('src/features/video-data.ts');
const { SELECTORS } = await load('src/data/selectors.ts');

const config = new ConfigManager();
for (const [key, value] of Object.entries(JSON.parse(values.config))) {
    const merged = key === 'RULE_ENABLES' || key === 'RULE_PRIORITIES' ? { ...config.get(key), ...(value as object) } : value;
    config.set(key, merged);
}
const engine = new FilterEngine(config);

// 快照的根元素，加上裡面每張影片卡片（區塊和卡片各自判斷，跟腳本在頁面上的做法一樣）
const root = document.body.firstElementChild as HTMLElement;
const targets = [root, ...root.querySelectorAll<HTMLElement>(SELECTORS.videoContainersStr)];
for (const el of targets) {
    const item = new LazyVideoData(el);
    const detail = engine.findFilterDetail(item, false);
    const whitelist = detail ? engine.applyWhitelistDecision(item, detail) : null;
    console.log(JSON.stringify({
        tag: el.tagName.toLowerCase(),
        title: item.title,
        channel: item.channel,
        detail,
        whitelist,
        result: !detail ? 'no-rule' : whitelist ? 'kept' : 'hidden'
    }));
}
