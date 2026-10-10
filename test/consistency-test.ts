import type { RuleEnables } from '../src/core/config';
import { RULE_NAMES } from '../src/data/rule-names';
import { RULE_DEFINITIONS } from '../src/data/rules';
import type { SupportedLang } from '../src/ui/i18n';
import { I18N_STRINGS } from '../src/ui/i18n-strings';
import { exitWithSummary, TestRunner } from './helpers/test-runner';

const runner = new TestRunner('一致性測試結果');

// RuleEnables 是型別，執行期拿不到鍵；satisfies 讓 tsc（npm run typecheck）確認這份清單
// 和 RuleEnables 的鍵完全相同，執行期再拿它跟 RULE_DEFINITIONS 比。
const RULE_ENABLES_KEYS = {
    ad_block_popup: true,
    ad_sponsor: true,
    members_only: true,
    shorts_item: true,
    mix_only: true,
    premium_banner: true,
    news_block: true,
    shorts_block: true,
    posts_block: true,
    playables_block: true,
    fundraiser_block: true,
    shorts_grid_shelf: true,
    movies_shelf: true,
    youtube_featured_shelf: true,
    popular_gaming_shelf: true,
    more_from_game_shelf: true,
    trending_playlist: true,
    inline_survey: true,
    clarify_box: true,
    explore_topics: true,
    recommended_playlists: true,
    members_early_access: true
} satisfies Record<keyof RuleEnables, true>;

const LANGS: SupportedLang[] = ['zh-TW', 'zh-CN', 'en', 'ja'];

const sorted = (keys: Iterable<string>): string => [...keys].sort().join(',');

const difference = (a: string[], b: string[]): string[] => a.filter(key => !b.includes(key));

runner.suite('規則 - RuleEnables 與 RULE_DEFINITIONS 一致', () => {
    const ruleIds = RULE_DEFINITIONS.map(rule => rule.id);
    const enableKeys = Object.keys(RULE_ENABLES_KEYS);

    runner.assertEqual('RULE_DEFINITIONS 的 id 不重複', new Set(ruleIds).size, ruleIds.length);
    runner.assertEqual('RULE_DEFINITIONS 缺少的 RuleEnables 鍵', difference(enableKeys, ruleIds).join(','), '');
    runner.assertEqual('RuleEnables 缺少的規則 id', difference(ruleIds, enableKeys).join(','), '');
});

runner.suite('規則 - 每條規則都有四語系名稱', () => {
    const ruleIds = RULE_DEFINITIONS.map(rule => rule.id);
    for (const lang of LANGS) {
        const names = Object.keys(Reflect.get(RULE_NAMES, lang) ?? {});
        runner.assertEqual(`${lang} 缺少的規則名稱`, difference(ruleIds, names).join(','), '');
    }
});

const assertSameKeys = (label: string, table: Record<SupportedLang, object>): void => {
    const reference = Object.keys(table['zh-TW']);
    for (const lang of LANGS) {
        const keys = Object.keys(Reflect.get(table, lang) ?? {});
        runner.assertEqual(`${label} ${lang} 的鍵與 zh-TW 相同`, sorted(keys), sorted(reference));
    }
};

runner.suite('i18n - 四語系的鍵相同', () => {
    assertSameKeys('I18N_STRINGS', I18N_STRINGS);
    assertSameKeys('RULE_NAMES', RULE_NAMES);
});

exitWithSummary(runner);
