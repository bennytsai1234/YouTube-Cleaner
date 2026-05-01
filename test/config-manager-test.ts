import { ConfigManager, resetConfigManagerForTests } from '../src/core/config';
import { installDom, installGMStorage } from './helpers/browser-env';
import { exitWithSummary, TestRunner } from './helpers/test-runner';

const storage = installGMStorage();
installDom();

const runner = new TestRunner('ConfigManager 測試結果');

// Reset singleton for each test suite
function resetConfigManager() {
    resetConfigManagerForTests();
    Object.keys(storage).forEach(key => delete storage[key]);
}

runner.suite('ConfigManager - 預設值初始化', () => {
    resetConfigManager();
    const config = new ConfigManager();

    runner.assertEqual('預設 OPEN_IN_NEW_TAB 應為 true', config.get('OPEN_IN_NEW_TAB'), true);
    runner.assertEqual('預設 FONT_FIX 應為 false', config.get('FONT_FIX'), false);
    runner.assertEqual('預設 ENABLE_SUBSCRIPTION_PROTECTION 應為 true', config.get('ENABLE_SUBSCRIPTION_PROTECTION'), true);
    runner.assertEqual('預設 ENABLE_LOW_VIEW_FILTER 應為 true', config.get('ENABLE_LOW_VIEW_FILTER'), true);
    runner.assertEqual('預設 LOW_VIEW_THRESHOLD 應為 1000', config.get('LOW_VIEW_THRESHOLD'), 1000);
    runner.assertEqual('預設 GRACE_PERIOD_HOURS 應為 4', config.get('GRACE_PERIOD_HOURS'), 4);
    runner.assertEqual('預設 RULE_ENABLES 應存在', typeof config.get('RULE_ENABLES'), 'object');
    runner.assertEqual('預設 RULE_PRIORITIES 應存在', typeof config.get('RULE_PRIORITIES'), 'object');
});

runner.suite('ConfigManager - singleton 模式', () => {
    resetConfigManager();
    const config1 = new ConfigManager();
    const config2 = new ConfigManager();

    runner.assert('singleton 應返回相同實例', config1 === config2);
});

runner.suite('ConfigManager - get/set 基本操作', () => {
    resetConfigManager();
    const config = new ConfigManager();

    config.set('LOW_VIEW_THRESHOLD', 5000);
    runner.assertEqual('set 後 get 應返回新值', config.get('LOW_VIEW_THRESHOLD'), 5000);

    config.set('ENABLE_LOW_VIEW_FILTER', false);
    runner.assertEqual('set 後 get 應返回新值', config.get('ENABLE_LOW_VIEW_FILTER'), false);
});

runner.suite('ConfigManager - 列表編譯', () => {
    resetConfigManager();
    const config = new ConfigManager();

    // 測試關鍵字列表編譯
    config.set('KEYWORD_BLACKLIST', ['Minecraft', 'Roblox']);
    const compiledKeywords = config.get('compiledKeywords');

    runner.assert('編譯後應有 2 個規則', compiledKeywords && compiledKeywords.length === 2);
    runner.assert('Minecraft 應匹配', compiledKeywords && compiledKeywords.some((r: RegExp) => r.test('Playing Minecraft')));
    runner.assert('ROBLOX 應匹配 (大小寫不敏感)', compiledKeywords && compiledKeywords.some((r: RegExp) => r.test('ROBLOX Game')));
});

runner.suite('ConfigManager - 精確匹配 (=前綴)', () => {
    resetConfigManager();
    const config = new ConfigManager();

    config.set('KEYWORD_BLACKLIST', ['=Minecraft', 'Roblox']);
    const compiled = config.get('compiledKeywords');

    runner.assert('精確匹配 Minecraft', compiled && compiled.some((r: RegExp) => r.test('Minecraft')));
    runner.assert('精確匹配不應匹配 MinecraftX', compiled && !compiled.some((r: RegExp) => r.test('MinecraftX')));
});

runner.suite('ConfigManager - RULE_ENABLES toggle', () => {
    resetConfigManager();
    const config = new ConfigManager();

    const initialShortsBlock = config.get('RULE_ENABLES').shorts_block;
    config.toggleRule('shorts_block');
    runner.assert('toggle 後狀態應反轉', config.get('RULE_ENABLES').shorts_block === !initialShortsBlock);

    config.toggleRule('shorts_block');
    runner.assert('再次 toggle 後應恢復', config.get('RULE_ENABLES').shorts_block === initialShortsBlock);
});

runner.suite('ConfigManager - RULE_PRIORITIES', () => {
    resetConfigManager();
    const config = new ConfigManager();

    const priorities = config.get('RULE_PRIORITIES');
    runner.assert('members_only 應為 strong', priorities.members_only === 'strong');
    runner.assert('shorts_item 應為 strong', priorities.shorts_item === 'strong');
});

runner.suite('ConfigManager - _load 應用預設值 (基本驗證)', () => {
    // 注意: 由於 singleton 模式，這個測試驗證 defaults 結構是否正確
    resetConfigManager();
    const config = new ConfigManager();

    // 驗證 defaults 物件存在且有正確的預設值
    runner.assertEqual('defaults 應有 LOW_VIEW_THRESHOLD', config.defaults.LOW_VIEW_THRESHOLD, 1000);
    runner.assertEqual('defaults 應有 GRACE_PERIOD_HOURS', config.defaults.GRACE_PERIOD_HOURS, 4);
});

runner.suite('ConfigManager - GM_setValue 會儲存值', () => {
    // 這個測試驗證 set 方法會正確呼叫 GM_setValue
    resetConfigManager();
    const config = new ConfigManager();

    config.set('LOW_VIEW_THRESHOLD', 7777);
    runner.assertEqual('set 後內部狀態應更新', config.get('LOW_VIEW_THRESHOLD'), 7777);
    runner.assert('set 後 GM storage 應被寫入', Object.values(storage).includes(7777));
});

runner.suite('ConfigManager - 頻道黑白名單', () => {
    resetConfigManager();
    const config = new ConfigManager();

    config.set('CHANNEL_BLACKLIST', ['BadChannel', 'EvilChannel']);
    const compiledChannels = config.get('compiledChannels');

    runner.assert('頻道黑名單應編譯', compiledChannels && compiledChannels.length === 2);

    config.set('CHANNEL_WHITELIST', ['GoodChannel']);
    const compiledWhitelist = config.get('compiledChannelWhitelist');
    runner.assert('頻道白名單應編譯', compiledWhitelist && compiledWhitelist.length === 1);
});

runner.suite('ConfigManager - 章節黑名單', () => {
    resetConfigManager();
    const config = new ConfigManager();

    config.set('SECTION_TITLE_BLACKLIST', ['New to you', '重溫舊愛']);
    const compiled = config.get('compiledSectionBlacklist');

    runner.assert('章節黑名單應編譯', compiled && compiled.length === 2);
});

exitWithSummary(runner);
