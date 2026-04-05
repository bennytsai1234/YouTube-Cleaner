import { ConfigManager, ConfigState } from '../core/config';
import { I18N } from './i18n';

export class ListManager {
    private config: ConfigManager;
    private onRefresh: () => void;

    constructor(config: ConfigManager, onRefresh: () => void) {
        this.config = config;
        this.onRefresh = onRefresh;
    }

    public addItem(key: keyof ConfigState, currentList: string[]): void {
        const value = prompt(`${I18N.t('adv_add')}:`);
        if (!value) return;

        let itemsToAdd = value.split(',').map(s => s.trim()).filter(Boolean);
        if ((key === 'CHANNEL_WHITELIST' || key === 'MEMBERS_WHITELIST') && itemsToAdd.length > 0) {
            const mode = prompt(I18N.t('adv_exact_prompt'), '1');
            if (mode === '1') itemsToAdd = itemsToAdd.map(item => `=${item}`);
        }

        this.config.set(key, [...new Set([...currentList, ...itemsToAdd])] as ConfigState[typeof key]);
        this.onRefresh();
    }

    public removeItem(key: keyof ConfigState, currentList: string[]): void {
        if (currentList.length === 0) {
            alert('名單是空的');
            return;
        }

        const listString = currentList.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
        const value = prompt(`${I18N.t('adv_remove')}:\n\n${listString}\n\n[請輸入編號 (例如 1 或 1,3) 或完整關鍵字]`);
        if (!value) return;

        const input = value.trim();
        let newList = [...currentList];

        if (/^[\d,\s]+$/.test(input)) {
            const indices = input.split(',')
                .map(s => parseInt(s.trim(), 10) - 1)
                .filter(idx => idx >= 0 && idx < currentList.length)
                .sort((a, b) => b - a);

            if (indices.length === 0) return;
            indices.forEach(idx => newList.splice(idx, 1));
        } else {
            newList = currentList.filter(item => item !== input);
        }

        this.config.set(key, newList as ConfigState[typeof key]);
        this.onRefresh();
    }

    public clearList(key: keyof ConfigState): void {
        if (!confirm(`${I18N.t('adv_clear')}?`)) return;
        this.config.set(key, [] as ConfigState[typeof key]);
        this.onRefresh();
    }

    public restoreDefaults(key: keyof ConfigState): void {
        if (!confirm(`${I18N.t('adv_restore')}?`)) return;

        const allDefaults = this.config.defaults[key];
        if (Array.isArray(allDefaults) && key === 'SECTION_TITLE_BLACKLIST') {
            const currentLang = I18N.lang;
            const filtered = allDefaults.filter(item => {
                const text = String(item);
                const isEnglish = /[a-zA-Z]/.test(text);
                const isChinese = /[\u4e00-\u9fa5]/.test(text);
                const isJapanese = /[\u3040-\u30ff]/.test(text);
                if (currentLang.startsWith('zh')) return isChinese || isEnglish;
                if (currentLang === 'ja') return isJapanese || isEnglish;
                return isEnglish;
            });
            this.config.set(key, filtered as ConfigState[typeof key]);
        } else if (Array.isArray(allDefaults)) {
            this.config.set(key, [...allDefaults] as ConfigState[typeof key]);
        }

        this.onRefresh();
    }
}
