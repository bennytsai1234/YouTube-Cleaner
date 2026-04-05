import { DEFAULT_SECTION_BLACKLIST } from '../data/default-section-blacklist';
import { FILTER_PATTERNS } from '../data/i18n-filter-patterns';
import { RULE_NAMES } from '../data/rule-names';
import { I18N_STRINGS } from './i18n-strings';

declare const GM_getValue: (key: string, defaultValue?: any) => any;
declare const GM_setValue: (key: string, value: any) => void;

export type SupportedLang = 'zh-TW' | 'zh-CN' | 'en' | 'ja';

export interface I18NStrings {
    [key: string]: string | undefined;
}

export const I18N = {
    _lang: null as SupportedLang | null,
    strings: I18N_STRINGS,
    filterPatterns: FILTER_PATTERNS,
    defaultSectionBlacklist: DEFAULT_SECTION_BLACKLIST,
    ruleNames: RULE_NAMES,

    getRuleName(ruleKey: string): string {
        return this.ruleNames[this.lang]?.[ruleKey] || this.ruleNames.en[ruleKey] || ruleKey;
    },

    detectLanguage(): SupportedLang {
        const ytConfigLang = (window as any).yt?.config_?.HL || (window as any).ytcfg?.get?.('HL');
        const ytLang = ytConfigLang || document.documentElement.lang || navigator.language || 'zh-TW';

        if (ytLang.startsWith('zh-CN') || ytLang.startsWith('zh-Hans')) return 'zh-CN';
        if (ytLang.startsWith('zh')) return 'zh-TW';
        if (ytLang.startsWith('ja')) return 'ja';
        return 'en';
    },

    get lang(): SupportedLang {
        if (!this._lang) {
            this._lang = (GM_getValue('ui_language', null) as SupportedLang | null) || this.detectLanguage();
        }
        return this._lang;
    },

    set lang(value: SupportedLang) {
        this._lang = value;
        GM_setValue('ui_language', value);
    },

    t(key: string, ...args: any[]): string {
        const str = this.strings[this.lang]?.[key] || this.strings.en[key] || key;
        return str.replace(/\{(\d+)\}/g, (_, i) => args[i] ?? '');
    },

    get availableLanguages(): Record<SupportedLang, string> {
        return {
            'zh-TW': '繁體中文',
            'zh-CN': '简体中文',
            'en': 'English',
            'ja': '日本語'
        };
    }
};
