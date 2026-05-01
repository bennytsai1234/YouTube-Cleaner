import { ConfigManager, resetConfigManagerForTests } from '../src/core/config';
import { SettingsIO } from '../src/ui/settings-io';
import { I18N } from '../src/ui/i18n';
import { installDom, installGMStorage } from './helpers/browser-env';
import { exitWithSummary, TestRunner } from './helpers/test-runner';

const runner = new TestRunner('SettingsIO 測試結果');
const storage = installGMStorage();
installDom();

(global as any).GM_info = { script: { version: 'Test-Version' } };

let clipboard = '';
let promptValue: string | null = null;
const alerts: string[] = [];

(global as any).GM_setClipboard = (text: string) => {
    clipboard = text;
};
(global as any).prompt = () => promptValue;
(global as any).alert = (message: string) => {
    alerts.push(message);
};

const resetEnv = () => {
    resetConfigManagerForTests();
    Object.keys(storage).forEach(key => delete storage[key]);
    I18N._lang = null;
    clipboard = '';
    promptValue = null;
    alerts.length = 0;
};

const createSubject = () => {
    resetEnv();
    const config = new ConfigManager();
    let refreshCount = 0;
    const io = new SettingsIO(config, () => refreshCount++);
    return { config, io, get refreshCount() { return refreshCount; } };
};

runner.suite('SettingsIO - export 不包含 runtime compiled regex', () => {
    const { config, io } = createSubject();
    config.set('KEYWORD_BLACKLIST', ['Minecraft']);

    io.exportSettings();
    const exported = JSON.parse(clipboard);

    runner.assertEqual('匯出版本應使用 GM_info', exported.version, 'Test-Version');
    runner.assert('匯出應包含使用者設定', exported.settings.KEYWORD_BLACKLIST.includes('Minecraft'));
    runner.assert('匯出不應包含 compiledKeywords', !('compiledKeywords' in exported.settings));
    runner.assert('匯出成功應提示使用者', alerts.includes(I18N.t('export_success')));
});

runner.suite('SettingsIO - import 忽略未知 key 並正規化規則 map', () => {
    const subject = createSubject();
    const { config, io } = subject;
    promptValue = JSON.stringify({
        settings: {
            LOW_VIEW_THRESHOLD: 2222,
            KEYWORD_BLACKLIST: ['Roblox'],
            FUTURE_SETTING: true,
            RULE_ENABLES: {
                shorts_item: false,
                ad_block_popup: 'invalid'
            },
            RULE_PRIORITIES: {
                members_only: 'weak',
                shorts_item: 'invalid'
            }
        },
        language: 'ja'
    });

    const result = io.importSettings();

    runner.assertEqual('匯入應成功', result, true);
    runner.assertEqual('數字設定應被匯入', config.get('LOW_VIEW_THRESHOLD'), 2222);
    runner.assert('列表設定應重新編譯 regex', config.get('compiledKeywords')?.some(rx => rx.test('Roblox')) === true);
    runner.assertEqual('未知設定不應寫入 state', (config.state as unknown as Record<string, unknown>).FUTURE_SETTING, undefined);
    runner.assertEqual('有效規則開關應套用', config.get('RULE_ENABLES').shorts_item, false);
    runner.assertEqual('無效規則開關應保留預設值', config.get('RULE_ENABLES').ad_block_popup, true);
    runner.assertEqual('有效規則優先級應套用', config.get('RULE_PRIORITIES').members_only, 'weak');
    runner.assertEqual('無效規則優先級應保留預設值', config.get('RULE_PRIORITIES').shorts_item, 'strong');
    runner.assertEqual('有效語系應套用', I18N.lang, 'ja');
    runner.assertEqual('匯入成功後應 refresh 一次', subject.refreshCount, 1);
});

runner.suite('SettingsIO - import 拒絕錯誤列表型別', () => {
    const subject = createSubject();
    const { config, io } = subject;
    promptValue = JSON.stringify({
        settings: {
            KEYWORD_BLACKLIST: 'not-an-array'
        },
        language: 'not-supported'
    });

    const result = io.importSettings();

    runner.assertEqual('錯誤列表型別應匯入失敗', result, false);
    runner.assertEqual('失敗匯入不應 refresh', subject.refreshCount, 0);
    runner.assertEqual('原始列表應維持預設值', config.get('KEYWORD_BLACKLIST').length, 0);
    runner.assert('匯入失敗應提示使用者', alerts.some(message => message.includes(I18N.t('import_fail'))));
});

exitWithSummary(runner);
