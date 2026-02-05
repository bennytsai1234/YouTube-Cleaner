import { FilterStats } from '../core/stats.js';
import { I18N } from './i18n.js';

// --- UI Manager: Structured Menu System ---
export class UIManager {
    constructor(config, onRefresh) {
        this.config = config;
        this.onRefresh = onRefresh;
    }

    t(key, ...args) {
        return I18N.t(key, ...args);
    }

    /**
     * 通用選單渲染器
     * @param {string} title 標題
     * @param {Array} items 選單項目 [{ label: string, action: function, show: boolean }]
     * @param {function} backAction 返回動作
     */
    _renderMenu(title, items, backAction = null) {
        const visibleItems = items.filter(item => item.show !== false);
        const menuString = visibleItems
            .map((item, idx) => `${idx + 1}. ${item.label}`)
            .join('\n');
        
        const footer = backAction ? `\n0. ${this.t('back')}` : '';
        const promptText = `【 ${title} 】\n\n${menuString}${footer}\n\n${this.t('menu_input')}`;
        
        const choice = prompt(promptText);
        if (choice === '0' && backAction) {
            backAction();
            return;
        }

        const selected = visibleItems[parseInt(choice) - 1];
        if (selected && selected.action) {
            selected.action();
        }
    }

    showMainMenu() {
        const i = (k) => this.config.get(k) ? '✅' : '❌';
        const statsInfo = FilterStats.session.total > 0 ? ` (${FilterStats.session.total})` : '';
        const langName = I18N.availableLanguages[I18N.lang];

        const items = [
            { label: this.t('menu_rules'), action: () => this.showRuleMenu() },
            { label: `${i('ENABLE_LOW_VIEW_FILTER')} ${this.t('menu_low_view')}`, action: () => this.toggle('ENABLE_LOW_VIEW_FILTER') },
            { label: `${this.t('menu_threshold')} (${this.config.get('LOW_VIEW_THRESHOLD')})`, action: () => this.promptNumber('LOW_VIEW_THRESHOLD', 'threshold_prompt') },
            { label: `${this.t('menu_grace')} (${this.config.get('GRACE_PERIOD_HOURS')}h)`, action: () => this.promptNumber('GRACE_PERIOD_HOURS', 'grace_prompt') },
            { label: this.t('menu_whitelist'), action: () => this.showWhitelistMenu() },
            { label: this.t('menu_advanced'), action: () => this.showAdvancedMenu() },
            { label: `${i('OPEN_IN_NEW_TAB')} ${this.t('menu_new_tab')}`, action: () => this.toggle('OPEN_IN_NEW_TAB') },
            { label: `${i('OPEN_NOTIFICATIONS_IN_NEW_TAB')} ${this.t('menu_notification_new_tab')}`, action: () => this.toggle('OPEN_NOTIFICATIONS_IN_NEW_TAB') },
            { label: `${i('DEBUG_MODE')} ${this.t('menu_debug')}`, action: () => this.toggle('DEBUG_MODE') },
            { label: this.t('menu_reset'), action: () => this.resetSettings() },
            { label: `${this.t('menu_stats')}${statsInfo}`, action: () => this.showStats() },
            { label: this.t('menu_export'), action: () => this.showExportImportMenu() },
            { label: `${this.t('menu_lang')} [${langName}]`, action: () => this.showLanguageMenu() }
        ];

        this._renderMenu(`${this.t('title')} v${GM_info.script.version}`, items);
    }

    showAdvancedMenu() {
        const i = (k) => this.config.get(k) ? '✅' : '❌';
        
        const items = [
            { label: `${i('ENABLE_KEYWORD_FILTER')} ${this.t('adv_keyword_filter')}`, action: () => this.toggle('ENABLE_KEYWORD_FILTER', true) },
            { label: this.t('adv_keyword_list'), action: () => this.manage('KEYWORD_BLACKLIST') },
            { label: `${i('ENABLE_CHANNEL_FILTER')} ${this.t('adv_channel_filter')}`, action: () => this.toggle('ENABLE_CHANNEL_FILTER', true) },
            { label: this.t('adv_channel_list'), action: () => this.manage('CHANNEL_BLACKLIST') },
            { label: `${i('ENABLE_SECTION_FILTER')} ${this.t('adv_section_filter')}`, action: () => this.toggle('ENABLE_SECTION_FILTER', true) },
            { label: this.t('adv_section_list'), action: () => this.manage('SECTION_TITLE_BLACKLIST') },
            { label: `${i('ENABLE_DURATION_FILTER')} ${this.t('adv_duration_filter')}`, action: () => this.toggle('ENABLE_DURATION_FILTER', true) },
            { label: this.t('adv_duration_set'), action: () => this.promptDuration() },
            { label: `${i('ENABLE_REGION_CONVERT')} ${this.t('adv_region_convert')}`, action: () => this.toggle('ENABLE_REGION_CONVERT', true) },
            { label: `${i('DISABLE_FILTER_ON_CHANNEL')} ${this.t('adv_disable_channel')}`, action: () => this.toggle('DISABLE_FILTER_ON_CHANNEL', true) }
        ];

        this._renderMenu(this.t('menu_advanced'), items, () => this.showMainMenu());
    }

    showWhitelistMenu() {
        const items = [
            { label: this.t('adv_channel_whitelist'), action: () => this.manage('CHANNEL_WHITELIST') },
            { label: this.t('adv_members_whitelist'), action: () => this.manage('MEMBERS_WHITELIST') },
            { label: this.t('adv_keyword_whitelist'), action: () => this.manage('KEYWORD_WHITELIST') }
        ];

        this._renderMenu(this.t('menu_whitelist'), items, () => this.showMainMenu());
    }

    showRuleMenu(page = 0) {
        const r = this.config.get('RULE_ENABLES');
        const keys = Object.keys(r);
        const PAGE_SIZE = 10;
        const totalPages = Math.ceil(keys.length / PAGE_SIZE);
        
        const start = page * PAGE_SIZE;
        const end = Math.min(start + PAGE_SIZE, keys.length);
        const pageKeys = keys.slice(start, end);
        
        const items = pageKeys.map(key => ({
            label: `[${r[key] ? '✅' : '❌'}] ${I18N.getRuleName(key)}`,
            action: () => {
                this.config.toggleRule(key);
                this.onRefresh();
                this.showRuleMenu(page);
            }
        }));

        // 分頁導覽按鈕
        if (page < totalPages - 1) {
            items.push({ label: `➡️ ${this.t('next_page')} (${page + 2}/${totalPages})`, action: () => this.showRuleMenu(page + 1) });
        }
        if (page > 0) {
            items.push({ label: `⬅️ ${this.t('prev_page')} (${page}/${totalPages})`, action: () => this.showRuleMenu(page - 1) });
        }

        const title = `${this.t('rules_title')} (${page + 1}/${totalPages})`;
        this._renderMenu(title, items, () => this.showMainMenu());
    }

    manage(k) {
        const l = this.config.get(k);
        const title = `[ ${k} ]\n${l.join(', ') || '(Empty)'}`;
        
        const items = [
            { label: this.t('adv_add'), action: () => this.addItem(k, l) },
            { label: this.t('adv_remove'), action: () => this.removeItem(k, l) },
            { label: this.t('adv_clear'), action: () => this.clearList(k) },
            { label: this.t('adv_restore'), action: () => this.restoreDefaults(k) }
        ];

        this._renderMenu(title, items, () => this.showAdvancedMenu());
    }

    // --- Helper Methods ---

    toggle(k, isAdvanced = false) {
        this.config.set(k, !this.config.get(k));
        this.onRefresh();
        isAdvanced ? this.showAdvancedMenu() : this.showMainMenu();
    }

    promptNumber(key, promptKey) {
        const v = prompt(this.t(promptKey), this.config.get(key));
        const num = Number(v);
        if (v !== null && !isNaN(num)) {
            this.config.set(key, num);
            this.onRefresh();
        } else if (v !== null) {
            alert('❌ ' + this.t('invalid_number'));
        }
        this.showMainMenu();
    }

    promptDuration() {
        const min = prompt(this.t('adv_min'), this.config.get('DURATION_MIN') / 60);
        const max = prompt(this.t('adv_max'), this.config.get('DURATION_MAX') / 60);

        if (min !== null) {
            const m = Number(min);
            if (!isNaN(m)) this.config.set('DURATION_MIN', m * 60);
        }
        if (max !== null) {
            const m = Number(max);
            if (!isNaN(m)) this.config.set('DURATION_MAX', m * 60);
        }
        this.onRefresh();
        this.showAdvancedMenu();
    }

    addItem(k, currentList) {
        const v = prompt(`${this.t('adv_add')}:`);
        if (!v) { this.manage(k); return; }

        let itemsToAdd = v.split(',').map(s => s.trim()).filter(Boolean);
        
        if (k === 'CHANNEL_WHITELIST' && itemsToAdd.length > 0) {
            const mode = prompt(this.t('adv_exact_prompt'), '1');
            if (mode === '1') itemsToAdd = itemsToAdd.map(item => '=' + item);
        }
        
        this.config.set(k, [...new Set([...currentList, ...itemsToAdd])]);
        this.onRefresh();
        this.manage(k);
    }

    removeItem(k, currentList) {
        const v = prompt(`${this.t('adv_remove')}:`);
        if (v) {
            this.config.set(k, currentList.filter(i => i !== v.trim()));
            this.onRefresh();
        }
        this.manage(k);
    }

    clearList(k) {
        if (confirm(this.t('adv_clear') + '?')) {
            this.config.set(k, []);
            this.onRefresh();
        }
        this.manage(k);
    }

    restoreDefaults(k) {
        if (confirm(this.t('adv_restore') + '?')) {
            const allDefaults = this.config.defaults[k];
            if (Array.isArray(allDefaults) && k === 'SECTION_TITLE_BLACKLIST') {
                const currentLang = I18N.lang;
                const filtered = allDefaults.filter(item => {
                    const isEnglish = /[a-zA-Z]/.test(item);
                    const isChinese = /[\u4e00-\u9fa5]/.test(item);
                    const isJapanese = /[\u3040-\u30ff]/.test(item);
                    if (currentLang.startsWith('zh')) return isChinese || isEnglish;
                    if (currentLang === 'ja') return isJapanese || isEnglish;
                    return isEnglish;
                });
                this.config.set(k, filtered);
            } else {
                this.config.set(k, [...allDefaults]);
            }
            this.onRefresh();
        }
        this.manage(k);
    }

    resetSettings() {
        if (confirm(this.t('reset_confirm'))) {
            Object.keys(this.config.defaults).forEach(k => {
                this.config.set(k, this.config.defaults[k]);
            });
            this.onRefresh();
            alert('✅ ' + this.t('import_success'));
        }
        this.showMainMenu();
    }

    showStats() {
        const summary = FilterStats.getSummary();
        alert(`${this.t('stats_title')}\n\n${summary || this.t('stats_empty')}`);
        this.showMainMenu();
    }

    showLanguageMenu() {
        const langs = I18N.availableLanguages;
        const keys = Object.keys(langs);
        const current = I18N.lang;
        
        const items = keys.map(k => ({
            label: `${k === current ? '✅' : '⬜'} ${langs[k]}`,
            action: () => {
                I18N.lang = k;
                alert(`✅ ${langs[k]}`);
                this.showMainMenu();
            }
        }));

        this._renderMenu(this.t('lang_title'), items, () => this.showMainMenu());
    }

    showExportImportMenu() {
        const items = [
            { label: this.t('export_export'), action: () => this.exportSettings() },
            { label: this.t('export_import'), action: () => this.importSettings() }
        ];
        this._renderMenu(this.t('export_title'), items, () => this.showMainMenu());
    }

    exportSettings() {
        const exportData = {
            version: GM_info.script.version,
            timestamp: new Date().toISOString(),
            settings: this.config.state,
            language: I18N.lang
        };
        const json = JSON.stringify(exportData, null, 2);
        try {
            GM_setClipboard(json);
            alert(this.t('export_success'));
        } catch (e) {
            prompt(this.t('export_copy'), json);
        }
        this.showExportImportMenu();
    }

    importSettings() {
        const json = prompt(this.t('import_prompt'));
        if (!json) { this.showExportImportMenu(); return; }
        try {
            const data = JSON.parse(json);
            if (!data.settings) throw new Error('Invalid format');
            for (const key in data.settings) {
                if (key in this.config.defaults) {
                    this.config.set(key, data.settings[key]);
                }
            }
            if (data.language) I18N.lang = data.language;
            alert(this.t('import_success'));
            this.onRefresh();
        } catch (e) {
            alert(this.t('import_fail') + e.message);
        }
        this.showExportImportMenu();
    }
}