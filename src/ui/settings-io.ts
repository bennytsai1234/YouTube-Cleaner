import { ConfigManager, ConfigState } from '../core/config';
import { I18N, SupportedLang } from './i18n';

declare const GM_info: {
    script: {
        version: string;
    };
};
declare const GM_setClipboard: (text: string) => void;

export class SettingsIO {
    private config: ConfigManager;
    private onRefresh: () => void;

    constructor(config: ConfigManager, onRefresh: () => void) {
        this.config = config;
        this.onRefresh = onRefresh;
    }

    public exportSettings(): void {
        const cleanSettings: Partial<ConfigState> & Record<string, unknown> = {};
        for (const key in this.config.state) {
            if (!key.startsWith('compiled')) {
                cleanSettings[key] = this.config.state[key as keyof ConfigState];
            }
        }

        const exportData = {
            version: GM_info.script.version,
            timestamp: new Date().toISOString(),
            settings: cleanSettings,
            language: I18N.lang
        };
        const json = JSON.stringify(exportData, null, 2);

        try {
            GM_setClipboard(json);
            alert(I18N.t('export_success'));
        } catch {
            prompt(I18N.t('export_copy'), json);
        }
    }

    private isConfigKey(key: string): key is keyof ConfigState {
        return key in this.config.defaults;
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    private normalizeRuleEnables(value: unknown): ConfigState['RULE_ENABLES'] {
        if (!this.isRecord(value)) throw new Error('Invalid RULE_ENABLES');
        const defaults = this.config.defaults.RULE_ENABLES;
        const normalized = { ...defaults };
        for (const [rule, enabled] of Object.entries(value)) {
            if (rule in defaults && typeof enabled === 'boolean') {
                normalized[rule as keyof typeof defaults] = enabled;
            }
        }
        return normalized;
    }

    private normalizeRulePriorities(value: unknown): ConfigState['RULE_PRIORITIES'] {
        if (!this.isRecord(value)) throw new Error('Invalid RULE_PRIORITIES');
        const defaults = this.config.defaults.RULE_PRIORITIES;
        const normalized = { ...defaults };
        for (const [rule, priority] of Object.entries(value)) {
            if (rule in defaults && (priority === 'strong' || priority === 'weak')) {
                normalized[rule] = priority;
            }
        }
        return normalized;
    }

    private normalizeImportedValue<K extends keyof ConfigState>(key: K, value: unknown): ConfigState[K] {
        const defaultValue = this.config.defaults[key];

        if (Array.isArray(defaultValue)) {
            if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
                throw new Error(`Invalid ${String(key)}`);
            }
            return value as ConfigState[K];
        }

        if (key === 'RULE_ENABLES') {
            return this.normalizeRuleEnables(value) as ConfigState[K];
        }

        if (key === 'RULE_PRIORITIES') {
            return this.normalizeRulePriorities(value) as ConfigState[K];
        }

        if (typeof defaultValue === 'boolean') {
            if (typeof value !== 'boolean') throw new Error(`Invalid ${String(key)}`);
            return value as ConfigState[K];
        }

        if (typeof defaultValue === 'number') {
            if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid ${String(key)}`);
            return value as ConfigState[K];
        }

        return value as ConfigState[K];
    }

    private importConfigValue<K extends keyof ConfigState>(key: K, value: unknown): void {
        this.config.set(key, this.normalizeImportedValue(key, value));
    }

    private isSupportedLang(value: unknown): value is SupportedLang {
        return typeof value === 'string' && value in I18N.availableLanguages;
    }

    public importSettings(): boolean {
        const json = prompt(I18N.t('import_prompt'));
        if (!json) return false;

        try {
            const data = JSON.parse(json);
            if (!this.isRecord(data) || !this.isRecord(data.settings)) throw new Error('Invalid format');

            for (const key in data.settings) {
                if (this.isConfigKey(key)) {
                    this.importConfigValue(key, data.settings[key]);
                }
            }

            if (this.isSupportedLang(data.language)) I18N.lang = data.language;
            alert(I18N.t('import_success'));
            this.onRefresh();
            return true;
        } catch (err) {
            alert(I18N.t('import_fail') + (err as Error).message);
            return false;
        }
    }
}
