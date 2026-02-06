import { FilterStats } from '../core/stats';
import { I18N, SupportedLang } from './i18n';
import { ConfigManager, ConfigState, RuleEnables } from '../core/config';

declare const GM_info: {
    script: {
        version: string;
    };
};
declare const GM_setClipboard: (text: string) => void;

interface MenuItem {
    label: string;
    action?: () => void;
    show?: boolean;
}

type MenuContext = 'filter' | 'list' | 'ux' | 'system' | 'main';

// --- UI Manager: Redesigned Logical Structure ---
export class UIManager {
    private config: ConfigManager;
    private onRefresh: () => void;

    constructor(config: ConfigManager, onRefresh: () => void) {
        this.config = config;
        this.onRefresh = onRefresh;
    }

    private t(key: string, ...args: any[]): string {
        return I18N.t(key, ...args);
    }

    /**
     * 通用選單渲染器
     */
    private _renderMenu(title: string, items: MenuItem[], backAction: (() => void) | null = null): void {
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

        if (choice !== null) {
            const selected = visibleItems[parseInt(choice) - 1];
            if (selected && selected.action) {
                selected.action();
            }
        }
    }

    public showMainMenu(): void {
        const items: MenuItem[] = [
            { label: this.t('menu_content'), action: () => this.showFilterMenu() },
            { label: this.t('menu_lists'), action: () => this.showListMenu() },
            { label: this.t('menu_ux'), action: () => this.showUXMenu() },
            { label: this.t('menu_system'), action: () => this.showSystemMenu() }
        ];

        this._renderMenu(`${this.t('title')} v${GM_info.script.version}`, items);
    }

    // --- 1. 過濾功能設定 (Filtering Settings) ---
    public showFilterMenu(): void {
        const i = (k: keyof ConfigState) => this.config.get(k) ? '✅' : '❌';
        const items: MenuItem[] = [
            { label: this.t('menu_rules'), action: () => this.showRuleMenu() },
            { label: `${i('ENABLE_LOW_VIEW_FILTER')} ${this.t('menu_low_view')}`, action: () => this.toggle('ENABLE_LOW_VIEW_FILTER', 'filter') },
            { label: `${this.t('menu_threshold')} (${this.config.get('LOW_VIEW_THRESHOLD')})`, action: () => this.promptNumber('LOW_VIEW_THRESHOLD', 'threshold_prompt', 'filter') },
            { label: `${this.t('menu_grace')} (${this.config.get('GRACE_PERIOD_HOURS')}h)`, action: () => this.promptNumber('GRACE_PERIOD_HOURS', 'grace_prompt', 'filter') },
            { label: `${i('ENABLE_DURATION_FILTER')} ${this.t('adv_duration_filter')}`, action: () => this.toggle('ENABLE_DURATION_FILTER', 'filter') },
            { label: this.t('adv_duration_set'), action: () => this.promptDuration() }
        ];
        this._renderMenu(this.t('menu_content'), items, () => this.showMainMenu());
    }

    // --- 2. 黑/白名單管理 (List Management) ---
    public showListMenu(): void {
        const i = (k: keyof ConfigState) => this.config.get(k) ? '✅' : '❌';
        const items: MenuItem[] = [
            { label: `[黑] ${this.t('adv_keyword_list')}`, action: () => this.manage('KEYWORD_BLACKLIST') },
            { label: `[黑] ${this.t('adv_channel_list')}`, action: () => this.manage('CHANNEL_BLACKLIST') },
            { label: `[黑] ${this.t('adv_section_list')}`, action: () => this.manage('SECTION_TITLE_BLACKLIST') },
            { label: `[白] ${this.t('adv_channel_whitelist')}`, action: () => this.manage('CHANNEL_WHITELIST') },
            { label: `[白] ${this.t('adv_members_whitelist')}`, action: () => this.manage('MEMBERS_WHITELIST') },
            { label: `[白] ${this.t('adv_keyword_whitelist')}`, action: () => this.manage('KEYWORD_WHITELIST') },
            { label: `${i('ENABLE_KEYWORD_FILTER')} ${this.t('adv_keyword_filter')}`, action: () => this.toggle('ENABLE_KEYWORD_FILTER', 'list') },
            { label: `${i('ENABLE_CHANNEL_FILTER')} ${this.t('adv_channel_filter')}`, action: () => this.toggle('ENABLE_CHANNEL_FILTER', 'list') },
            { label: `${i('ENABLE_SECTION_FILTER')} ${this.t('adv_section_filter')}`, action: () => this.toggle('ENABLE_SECTION_FILTER', 'list') }
        ];
        this._renderMenu(this.t('menu_lists'), items, () => this.showMainMenu());
    }

    // --- 3. 介面與體驗 (Interface & UX) ---
    public showUXMenu(): void {
        const i = (k: keyof ConfigState) => this.config.get(k) ? '✅' : '❌';
        const items: MenuItem[] = [
            { label: `${i('OPEN_IN_NEW_TAB')} ${this.t('menu_new_tab')}`, action: () => this.toggle('OPEN_IN_NEW_TAB', 'ux') },
            { label: `${i('OPEN_NOTIFICATIONS_IN_NEW_TAB')} ${this.t('menu_notification_new_tab')}`, action: () => this.toggle('OPEN_NOTIFICATIONS_IN_NEW_TAB', 'ux') },
            { label: `${i('ENABLE_REGION_CONVERT')} ${this.t('adv_region_convert')}`, action: () => this.toggle('ENABLE_REGION_CONVERT', 'ux') },
            { label: `${i('DISABLE_FILTER_ON_CHANNEL')} ${this.t('adv_disable_channel')}`, action: () => this.toggle('DISABLE_FILTER_ON_CHANNEL', 'ux') }
        ];
        this._renderMenu(this.t('menu_ux'), items, () => this.showMainMenu());
    }

    // --- 4. 系統與工具 (System Tools) ---
    public showSystemMenu(): void {
        const i = (k: keyof ConfigState) => this.config.get(k) ? '✅' : '❌';
        const statsInfo = FilterStats.session.total > 0 ? ` (${FilterStats.session.total})` : '';
        const langName = I18N.availableLanguages[I18N.lang];

        const items: MenuItem[] = [
            { label: `${this.t('menu_stats')}${statsInfo}`, action: () => this.showStats() },
            { label: this.t('menu_export'), action: () => this.showExportImportMenu() },
            { label: `${this.t('menu_lang')} [${langName}]`, action: () => this.showLanguageMenu() },
            { label: `${i('DEBUG_MODE')} ${this.t('menu_debug')}`, action: () => this.toggle('DEBUG_MODE', 'system') },
            { label: this.t('menu_reset'), action: () => this.resetSettings() }
        ];
        this._renderMenu(this.t('menu_system'), items, () => this.showMainMenu());
    }

    // --- 功能子選單 ---

    public showRuleMenu(page = 0): void {
        const r = this.config.get('RULE_ENABLES');
        const keys = Object.keys(r) as (keyof RuleEnables)[];
        const PAGE_SIZE = 10;
        const totalPages = Math.ceil(keys.length / PAGE_SIZE);
        
        const start = page * PAGE_SIZE;
        const end = Math.min(start + PAGE_SIZE, keys.length);
        const pageKeys = keys.slice(start, end);
        
        const items: MenuItem[] = pageKeys.map(key => ({
            label: `[${r[key] ? '✅' : '❌'}] ${I18N.getRuleName(key)}`,
            action: () => {
                this.config.toggleRule(key);
                this.onRefresh();
                this.showRuleMenu(page);
            }
        }));

        if (page < totalPages - 1) {
            items.push({ label: `➡️ ${this.t('next_page')} (${page + 2}/${totalPages})`, action: () => this.showRuleMenu(page + 1) });
        }
        if (page > 0) {
            items.push({ label: `⬅️ ${this.t('prev_page')} (${page}/${totalPages})`, action: () => this.showRuleMenu(page - 1) });
        }

        this._renderMenu(`${this.t('rules_title')} (${page + 1}/${totalPages})`, items, () => this.showFilterMenu());
    }

    public manage(k: keyof ConfigState): void {
        const l = this.config.get(k) as string[];
        const title = `[ ${k} ]\n${l.join(', ') || '(Empty)'}`;
        
        const items: MenuItem[] = [
            { label: this.t('adv_add'), action: () => this.addItem(k, l) },
            { label: this.t('adv_remove'), action: () => this.removeItem(k, l) },
            { label: this.t('adv_clear'), action: () => this.clearList(k) },
            { label: this.t('adv_restore'), action: () => this.restoreDefaults(k) }
        ];

        this._renderMenu(title, items, () => this.showListMenu());
    }

    // --- 工具函式 ---

    private toggle(k: keyof ConfigState, context: MenuContext = 'main'): void {
        // @ts-ignore
        this.config.set(k, !this.config.get(k));
        this.onRefresh();
        this._returnToContext(context);
    }

    private promptNumber(key: 'LOW_VIEW_THRESHOLD' | 'GRACE_PERIOD_HOURS', promptKey: string, context: MenuContext = 'main'): void {
        const v = prompt(this.t(promptKey), String(this.config.get(key)));
        if (v !== null) {
            const num = Number(v);
            if (!isNaN(num)) {
                this.config.set(key, num);
                this.onRefresh();
            } else {
                alert('❌ ' + this.t('invalid_number'));
            }
        }
        this._returnToContext(context);
    }

    private _returnToContext(context: MenuContext): void {
        const map: Record<string, () => void> = { 
            filter: () => this.showFilterMenu(), 
            list: () => this.showListMenu(), 
            ux: () => this.showUXMenu(), 
            system: () => this.showSystemMenu() 
        };
        if (map[context]) map[context]();
        else this.showMainMenu();
    }

    private promptDuration(): void {
        const min = prompt(this.t('adv_min'), String(this.config.get('DURATION_MIN') / 60));
        const max = prompt(this.t('adv_max'), String(this.config.get('DURATION_MAX') / 60));
        if (min !== null) {
            const m = Number(min);
            if (!isNaN(m)) this.config.set('DURATION_MIN', m * 60);
        }
        if (max !== null) {
            const m = Number(max);
            if (!isNaN(m)) this.config.set('DURATION_MAX', m * 60);
        }
        this.onRefresh();
        this.showFilterMenu();
    }

    private addItem(k: keyof ConfigState, currentList: string[]): void {
        const v = prompt(`${this.t('adv_add')}:`);
        if (!v) { this.manage(k); return; }
        let itemsToAdd = v.split(',').map(s => s.trim()).filter(Boolean);
        if ((k === 'CHANNEL_WHITELIST' || k === 'MEMBERS_WHITELIST') && itemsToAdd.length > 0) {
            const mode = prompt(this.t('adv_exact_prompt'), '1');
            if (mode === '1') itemsToAdd = itemsToAdd.map(item => '=' + item);
        }
        this.config.set(k, [...new Set([...currentList, ...itemsToAdd])] as any);
        this.onRefresh();
        this.manage(k);
    }

    private removeItem(k: keyof ConfigState, currentList: string[]): void {
        const v = prompt(`${this.t('adv_remove')}:`);
        if (v) {
            this.config.set(k, currentList.filter(i => i !== v.trim()) as any);
            this.onRefresh();
        }
        this.manage(k);
    }

    private clearList(k: keyof ConfigState): void {
        if (confirm(this.t('adv_clear') + '?')) {
            this.config.set(k, [] as any);
            this.onRefresh();
        }
        this.manage(k);
    }

    private restoreDefaults(k: keyof ConfigState): void {
        if (confirm(this.t('adv_restore') + '?')) {
            // @ts-ignore
            const allDefaults = this.config.defaults[k];
            if (Array.isArray(allDefaults) && k === 'SECTION_TITLE_BLACKLIST') {
                const currentLang = I18N.lang;
                const filtered = allDefaults.filter(item => {
                    const s = String(item);
                    const isEnglish = /[a-zA-Z]/.test(s);
                    const isChinese = /[\u4e00-\u9fa5]/.test(s);
                    const isJapanese = /[\u3040-\u30ff]/.test(s);
                    if (currentLang.startsWith('zh')) return isChinese || isEnglish;
                    if (currentLang === 'ja') return isJapanese || isEnglish;
                    return isEnglish;
                });
                this.config.set(k, filtered as any);
            } else {
                this.config.set(k, [...(allDefaults as any)] as any);
            }
            this.onRefresh();
        }
        this.manage(k);
    }

    public resetSettings(): void {
        if (confirm(this.t('reset_confirm'))) {
            // @ts-ignore
            Object.keys(this.config.defaults).forEach(k => this.config.set(k as keyof ConfigState, this.config.defaults[k as keyof ConfigState]));
            this.onRefresh();
            alert('✅ ' + this.t('import_success'));
        }
        this.showSystemMenu();
    }

    public showStats(): void {
        const summary = FilterStats.getSummary();
        alert(`${this.t('stats_title')}\n\n${summary || this.t('stats_empty')}`);
        this.showSystemMenu();
    }

    public showLanguageMenu(): void {
        const langs = I18N.availableLanguages;
        const keys = Object.keys(langs) as SupportedLang[];
        const current = I18N.lang;
        const items: MenuItem[] = keys.map(k => ({
            label: `${k === current ? '✅' : '⬜'} ${langs[k]}`,
            action: () => { I18N.lang = k; alert(`✅ ${langs[k]}`); this.showSystemMenu(); }
        }));
        this._renderMenu(this.t('lang_title'), items, () => this.showSystemMenu());
    }

    public showExportImportMenu(): void {
        const items: MenuItem[] = [
            { label: this.t('export_export'), action: () => this.exportSettings() },
            { label: this.t('export_import'), action: () => this.importSettings() }
        ];
        this._renderMenu(this.t('export_title'), items, () => this.showSystemMenu());
    }

    public exportSettings(): void {
        const cleanSettings: any = {};
        for (const key in this.config.state) {
            if (!key.startsWith('compiled')) {
                // @ts-ignore
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
            alert(this.t('export_success'));
        } catch {
            prompt(this.t('export_copy'), json);
        }
        this.showExportImportMenu();
    }

    public importSettings(): void {
        const json = prompt(this.t('import_prompt'));
        if (!json) { this.showExportImportMenu(); return; }
        try {
            const data = JSON.parse(json);
            if (!data.settings) throw new Error('Invalid format');
            for (const key in data.settings) {
                if (key in this.config.defaults) {
                    this.config.set(key as keyof ConfigState, data.settings[key]);
                }
            }
            if (data.language) I18N.lang = data.language;
            alert(this.t('import_success'));
            this.onRefresh();
        } catch (err) {
            alert(this.t('import_fail') + (err as Error).message);
        }
        this.showExportImportMenu();
    }
}
