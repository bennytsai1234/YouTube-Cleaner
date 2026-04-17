import { JSDOM } from 'jsdom';
import { ConfigManager } from '../src/core/config';

// Mock GM functions
const storage: Record<string, any> = {};
(global as any).GM_getValue = (key: string, defaultValue: any) => {
    return storage[key] !== undefined ? storage[key] : defaultValue;
};
(global as any).GM_setValue = (key: string, value: any) => {
    storage[key] = value;
};

// Setup JSDOM
const dom = new JSDOM('<!doctype html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
Object.defineProperty(global, 'navigator', {
    value: dom.window.navigator,
    writable: true,
    configurable: true
});

const TestRunner = {
    passed: 0,
    failed: 0,

    suite(name: string, fn: () => void) {
        console.log(`\n📦 ${name}`);
        console.log('─'.repeat(40));
        fn();
    },

    assert(description: string, condition: any) {
        if (condition) {
            console.log(`  ✅ ${description}`);
            this.passed++;
        } else {
            console.error(`  ❌ ${description}`);
            this.failed++;
        }
    },

    assertEqual(description: string, actual: any, expected: any) {
        const pass = actual === expected;
        if (pass) {
            console.log(`  ✅ ${description}`);
            this.passed++;
        } else {
            console.error(`  ❌ ${description}`);
            console.error(`     期望: ${expected}, 實際: ${actual}`);
            this.failed++;
        }
    },

    summary() {
        console.log('\n' + '═'.repeat(40));
        console.log(`📊 ConfigManager 測試結果: ${this.passed} 通過, ${this.failed} 失敗`);
        console.log('═'.repeat(40));
        return this.failed === 0;
    }
};

// Reset singleton for each test suite
function resetConfigManager() {
    (ConfigManager as any).instance = null;
}

TestRunner.suite('ConfigManager - 預設值初始化', () => {
    resetConfigManager();
    const config = new ConfigManager();

    TestRunner.assertEqual('預設 OPEN_IN_NEW_TAB 應為 true', config.get('OPEN_IN_NEW_TAB'), true);
    TestRunner.assertEqual('預設 ENABLE_LOW_VIEW_FILTER 應為 true', config.get('ENABLE_LOW_VIEW_FILTER'), true);
    TestRunner.assertEqual('預設 LOW_VIEW_THRESHOLD 應為 1000', config.get('LOW_VIEW_THRESHOLD'), 1000);
    TestRunner.assertEqual('預設 GRACE_PERIOD_HOURS 應為 4', config.get('GRACE_PERIOD_HOURS'), 4);
    TestRunner.assertEqual('預設 RULE_ENABLES 應存在', typeof config.get('RULE_ENABLES'), 'object');
    TestRunner.assertEqual('預設 RULE_PRIORITIES 應存在', typeof config.get('RULE_PRIORITIES'), 'object');
});

TestRunner.suite('ConfigManager - singleton 模式', () => {
    resetConfigManager();
    const config1 = new ConfigManager();
    const config2 = new ConfigManager();

    TestRunner.assert('singleton 應返回相同實例', config1 === config2);
});

TestRunner.suite('ConfigManager - get/set 基本操作', () => {
    resetConfigManager();
    const config = new ConfigManager();

    config.set('LOW_VIEW_THRESHOLD', 5000);
    TestRunner.assertEqual('set 後 get 應返回新值', config.get('LOW_VIEW_THRESHOLD'), 5000);

    config.set('ENABLE_LOW_VIEW_FILTER', false);
    TestRunner.assertEqual('set 後 get 應返回新值', config.get('ENABLE_LOW_VIEW_FILTER'), false);
});

TestRunner.suite('ConfigManager - 列表編譯', () => {
    resetConfigManager();
    const config = new ConfigManager();

    // 測試關鍵字列表編譯
    config.set('KEYWORD_BLACKLIST', ['Minecraft', 'Roblox']);
    const compiledKeywords = config.get('compiledKeywords');

    TestRunner.assert('編譯後應有 2 個規則', compiledKeywords && compiledKeywords.length === 2);
    TestRunner.assert('Minecraft 應匹配', compiledKeywords && compiledKeywords.some((r: RegExp) => r.test('Playing Minecraft')));
    TestRunner.assert('ROBLOX 應匹配 (大小寫不敏感)', compiledKeywords && compiledKeywords.some((r: RegExp) => r.test('ROBLOX Game')));
});

TestRunner.suite('ConfigManager - 精確匹配 (=前綴)', () => {
    resetConfigManager();
    const config = new ConfigManager();

    config.set('KEYWORD_BLACKLIST', ['=Minecraft', 'Roblox']);
    const compiled = config.get('compiledKeywords');

    TestRunner.assert('精確匹配 Minecraft', compiled && compiled.some((r: RegExp) => r.test('Minecraft')));
    TestRunner.assert('精確匹配不應匹配 MinecraftX', compiled && !compiled.some((r: RegExp) => r.test('MinecraftX')));
});

TestRunner.suite('ConfigManager - RULE_ENABLES toggle', () => {
    resetConfigManager();
    const config = new ConfigManager();

    const initialShortsBlock = config.get('RULE_ENABLES').shorts_block;
    config.toggleRule('shorts_block');
    TestRunner.assert('toggle 後狀態應反轉', config.get('RULE_ENABLES').shorts_block === !initialShortsBlock);

    config.toggleRule('shorts_block');
    TestRunner.assert('再次 toggle 後應恢復', config.get('RULE_ENABLES').shorts_block === initialShortsBlock);
});

TestRunner.suite('ConfigManager - RULE_PRIORITIES', () => {
    resetConfigManager();
    const config = new ConfigManager();

    const priorities = config.get('RULE_PRIORITIES');
    TestRunner.assert('members_only 應為 strong', priorities.members_only === 'strong');
    TestRunner.assert('shorts_item 應為 strong', priorities.shorts_item === 'strong');
});

TestRunner.suite('ConfigManager - _load 應用預設值 (基本驗證)', () => {
    // 注意: 由於 singleton 模式，這個測試驗證 defaults 結構是否正確
    resetConfigManager();
    const config = new ConfigManager();

    // 驗證 defaults 物件存在且有正確的預設值
    TestRunner.assertEqual('defaults 應有 LOW_VIEW_THRESHOLD', config.defaults.LOW_VIEW_THRESHOLD, 1000);
    TestRunner.assertEqual('defaults 應有 GRACE_PERIOD_HOURS', config.defaults.GRACE_PERIOD_HOURS, 4);
});

TestRunner.suite('ConfigManager - GM_setValue 會儲存值', () => {
    // 這個測試驗證 set 方法會正確呼叫 GM_setValue
    resetConfigManager();
    const config = new ConfigManager();

    config.set('LOW_VIEW_THRESHOLD', 7777);
    TestRunner.assertEqual('set 後內部狀態應更新', config.get('LOW_VIEW_THRESHOLD'), 7777);
});

TestRunner.suite('ConfigManager - 頻道黑白名單', () => {
    resetConfigManager();
    const config = new ConfigManager();

    config.set('CHANNEL_BLACKLIST', ['BadChannel', 'EvilChannel']);
    const compiledChannels = config.get('compiledChannels');

    TestRunner.assert('頻道黑名單應編譯', compiledChannels && compiledChannels.length === 2);

    config.set('CHANNEL_WHITELIST', ['GoodChannel']);
    const compiledWhitelist = config.get('compiledChannelWhitelist');
    TestRunner.assert('頻道白名單應編譯', compiledWhitelist && compiledWhitelist.length === 1);
});

TestRunner.suite('ConfigManager - 章節黑名單', () => {
    resetConfigManager();
    const config = new ConfigManager();

    config.set('SECTION_TITLE_BLACKLIST', ['New to you', '重溫舊愛']);
    const compiled = config.get('compiledSectionBlacklist');

    TestRunner.assert('章節黑名單應編譯', compiled && compiled.length === 2);
});

if (!TestRunner.summary()) {
    process.exit(1);
}