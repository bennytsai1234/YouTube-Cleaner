import { FilterStats } from '../core/stats.js';
import { I18N } from './i18n.js';

// --- 9. Module: UI Manager (Enhanced with i18n) ---
export class UIManager {
    constructor(config, onRefresh) { this.config = config; this.onRefresh = onRefresh; }

    t(key, ...args) { return I18N.t(key, ...args); }

    showMainMenu() {
        const i = (k) => this.config.get(k) ? '✅' : '❌';
        const statsInfo = FilterStats.session.total > 0 ? ` (${FilterStats.session.total})` : '';
        const langName = I18N.availableLanguages[I18N.lang];
        const choice = prompt(
            `【 ${this.t('title')} v${GM_info.script.version} 】\n\n` +
            `1. ${this.t('menu_rules')}\n` +
            `2. ${i('ENABLE_LOW_VIEW_FILTER')} ${this.t('menu_low_view')}\n` +
            `3. ${this.t('menu_threshold')} (${this.config.get('LOW_VIEW_THRESHOLD')})\n` +
            `4. ${this.t('menu_grace')} (${this.config.get('GRACE_PERIOD_HOURS')}h)\n` +
            `5. ${this.t('menu_advanced')}\n` +
            `6. ${i('OPEN_IN_NEW_TAB')} ${this.t('menu_new_tab')}\n` +
            `7. ${i('OPEN_NOTIFICATIONS_IN_NEW_TAB')} ${this.t('menu_notification_new_tab')}\n` +
            `8. ${i('DEBUG_MODE')} ${this.t('menu_debug')}\n` +
            `9. ${this.t('menu_reset')}\n` +
            `10. ${this.t('menu_stats')}${statsInfo}\n` +
            `11. ${this.t('menu_export')}\n` +
            `12. ${this.t('menu_lang')} [${langName}]\n\n` +
            this.t('menu_input')
        );
        if (choice) this.handleMenu(choice);
    }

    handleMenu(c) {
        switch (c.trim()) {
            case '1': this.showRuleMenu(); break;
            case '2': this.toggle('ENABLE_LOW_VIEW_FILTER'); break;
            case '3': {
                const v = prompt(this.t('threshold_prompt'), this.config.get('LOW_VIEW_THRESHOLD'));
                const num = Number(v);
                if (v !== null && !isNaN(num)) this.update('LOW_VIEW_THRESHOLD', num);
                else if (v !== null) alert('❌ 請輸入有效的數字');
                this.showMainMenu();
                break;
            }
            case '4': {
                const v = prompt(this.t('grace_prompt'), this.config.get('GRACE_PERIOD_HOURS'));
                const num = Number(v);
                if (v !== null && !isNaN(num)) this.update('GRACE_PERIOD_HOURS', num);
                else if (v !== null) alert('❌ 請輸入有效的數字');
                this.showMainMenu();
                break;
            }
            case '5': this.showAdvancedMenu(); break;
            case '6': this.toggle('OPEN_IN_NEW_TAB'); break;
            case '7': this.toggle('OPEN_NOTIFICATIONS_IN_NEW_TAB'); break;
            case '8': this.toggle('DEBUG_MODE'); break;
            case '9': 
                if (confirm(this.t('reset_confirm'))) { 
                    Object.keys(this.config.defaults).forEach(k => this.config.set(k, this.config.defaults[k])); 
                    this.update('', null); 
                } 
                break;
            case '10': this.showStats(); break;
            case '11': this.showExportImportMenu(); break;
            case '12': this.showLanguageMenu(); break;
        }
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
        const menu = keys.map((k, i) => `${i + 1}. ${k === current ? '✅' : '⬜'} ${langs[k]}`).join('\n');
        const c = prompt(`${this.t('lang_title')}\n\n${menu}\n\n0. ${this.t('back')}`);
        if (c && c !== '0') {
            const idx = parseInt(c) - 1;
            if (keys[idx]) {
                I18N.lang = keys[idx];
                alert(`✅ ${langs[keys[idx]]}`);
            }
        }
        this.showMainMenu();
    }

    showExportImportMenu() {
        const c = prompt(`${this.t('export_title')}\n\n1. ${this.t('export_export')}\n2. ${this.t('export_import')}\n0. ${this.t('back')}`);
        if (c === '1') this.exportSettings();
        else if (c === '2') this.importSettings();
        else if (c === '0') this.showMainMenu();
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

    showRuleMenu() {
        const r = this.config.get('RULE_ENABLES'); 
        const k = Object.keys(r);
        const c = prompt(`${this.t('rules_title')} ${this.t('rules_back')}\n` + k.map((key, i) => `${i + 1}. [${r[key] ? '✅' : '❌'}] ${I18N.getRuleName(key)}`).join('\n'));
        if (c && c !== '0') { 
            this.config.toggleRule(k[parseInt(c) - 1]); 
            this.onRefresh(); 
            this.showRuleMenu(); 
        } else if (c === '0') {
            this.showMainMenu();
        }
    }

    showAdvancedMenu() {
        const i = (k) => this.config.get(k) ? '✅' : '❌';
        const c = prompt(
            `1. ${i('ENABLE_KEYWORD_FILTER')} ${this.t('adv_keyword_filter')}\n` +
            `2. ${this.t('adv_keyword_list')}\n` +
            `3. ${i('ENABLE_CHANNEL_FILTER')} ${this.t('adv_channel_filter')}\n` +
            `4. ${this.t('adv_channel_list')}\n` +
                        `5. ${this.t('adv_channel_whitelist')}\n` +
                        `6. ${i('EXACT_CHANNEL_WHITELIST')} ${this.t('adv_exact_match')}\n` + // 新增選項
                        `7. ${this.t('adv_keyword_whitelist')}\n` +
                        `8. ${i('ENABLE_SECTION_FILTER')} ${this.t('adv_section_filter')}\n` +
                        `9. ${this.t('adv_section_list')}\n` +
                        `10. ${i('ENABLE_DURATION_FILTER')} ${this.t('adv_duration_filter')}\n` +
                        `11. ${this.t('adv_duration_set')}\n` +
                        `12. ${i('ENABLE_REGION_CONVERT')} ${this.t('adv_region_convert')}\n` +
                        `13. ${i('DISABLE_FILTER_ON_CHANNEL')} ${this.t('adv_disable_channel')}\n` +
                        `0. ${this.t('back')}`
                    );
                    if (c === '1') this.toggle('ENABLE_KEYWORD_FILTER', true);
                    else if (c === '2') this.manage('KEYWORD_BLACKLIST');
                    else if (c === '3') this.toggle('ENABLE_CHANNEL_FILTER', true);
                    else if (c === '4') this.manage('CHANNEL_BLACKLIST');
                    else if (c === '5') this.manage('CHANNEL_WHITELIST');
                    else if (c === '6') this.toggle('EXACT_CHANNEL_WHITELIST', true); // 新增處理
                    else if (c === '7') this.manage('KEYWORD_WHITELIST'); 
                    else if (c === '8') this.toggle('ENABLE_SECTION_FILTER', true);
                    else if (c === '9') this.manage('SECTION_TITLE_BLACKLIST');
                    else if (c === '10') this.toggle('ENABLE_DURATION_FILTER', true);
                    else if (c === '11') {
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
                        this.onRefresh(); this.showAdvancedMenu();
                    }
                    else if (c === '12') this.toggle('ENABLE_REGION_CONVERT', true);
                    else if (c === '13') this.toggle('DISABLE_FILTER_ON_CHANNEL', true);
                    else if (c === '0') this.showMainMenu();
                }
            
                manage(k) {
                    const l = this.config.get(k);
                    const choice = prompt(
                        `[ ${k} ]\n${l.join(', ') || '(Empty)'}\n\n` +
                        `1. ${this.t('adv_add')}  2. ${this.t('adv_remove')}\n` +
                        `3. ${this.t('adv_clear')}  4. ${this.t('adv_restore')}\n` +
                        `0. ${this.t('back')}`
                    );
            
                    if (!choice) return;
            
                    const c = choice.trim();
                    if (c === '0') { this.showAdvancedMenu(); return; }
            
                    if (c === '1') { 
                        const v = prompt(`${this.t('adv_add')}:`); 
                        if (v) this.config.set(k, [...new Set([...l, ...v.split(',').map(s => s.trim())])]); 
                    }
                    if (c === '2') { 
                        const v = prompt(`${this.t('adv_remove')}:`); 
                        if (v) this.config.set(k, l.filter(i => i !== v.trim())); 
                    }
                    if (c === '3') { 
                        if (confirm(this.t('adv_clear') + '?')) this.config.set(k, []); 
                    }
                    if (c === '4') { 
                        if (confirm(this.t('adv_restore') + '?')) {
                            // 智慧恢復邏輯：根據當前語言篩選
                            const allDefaults = this.config.defaults[k];
                            if (Array.isArray(allDefaults) && k === 'SECTION_TITLE_BLACKLIST') {
                                const currentLang = I18N.lang;
                                // 保留英文 + 當前語言
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
                        }
                    }
            
                    this.onRefresh();
                    this.manage(k);
                }
    toggle(k, adv) { 
        this.config.set(k, !this.config.get(k)); 
        this.onRefresh(); 
        adv ? this.showAdvancedMenu() : this.showMainMenu(); 
    }

    update(k, v) { 
        if (k) this.config.set(k, v); 
        this.onRefresh(); 
        this.showMainMenu(); 
    }
}