import { ConfigManager, ConfigState } from '../core/config';
import { I18N } from './i18n';

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

    public importSettings(): boolean {
        const json = prompt(I18N.t('import_prompt'));
        if (!json) return false;

        try {
            const data = JSON.parse(json);
            if (!data.settings) throw new Error('Invalid format');

            for (const key in data.settings) {
                if (key in this.config.defaults) {
                    this.config.set(key as keyof ConfigState, data.settings[key]);
                }
            }

            if (data.language) I18N.lang = data.language;
            alert(I18N.t('import_success'));
            this.onRefresh();
            return true;
        } catch (err) {
            alert(I18N.t('import_fail') + (err as Error).message);
            return false;
        }
    }
}
