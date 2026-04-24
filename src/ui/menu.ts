import { FilterStats } from '../core/stats';
import { ConfigManager, ConfigState, RuleEnables } from '../core/config';
import { I18N, SupportedLang } from './i18n';
import { ListManager } from './list-manager';
import { MenuRenderer } from './menu-renderer';
import { MenuContext, MenuItem } from './menu-types';
import { SettingsIO } from './settings-io';

declare const GM_info: {
    script: {
        version: string;
    };
};

export class UIManager {
    private config: ConfigManager;
    private onRefresh: () => void;
    private renderer: MenuRenderer;
    private listManager: ListManager;
    private settingsIO: SettingsIO;

    constructor(config: ConfigManager, onRefresh: () => void) {
        this.config = config;
        this.onRefresh = onRefresh;
        this.renderer = new MenuRenderer((key, ...args) => this.t(key, ...args));
        this.listManager = new ListManager(config, onRefresh);
        this.settingsIO = new SettingsIO(config, onRefresh);
    }

    private t(key: string, ...args: any[]): string {
        return I18N.t(key, ...args);
    }

    public showMainMenu(): void {
        const items: MenuItem[] = [
            { label: this.t('menu_content'), action: () => this.showFilterMenu() },
            { label: this.t('menu_lists'), action: () => this.showListMenu() },
            { label: this.t('menu_ux'), action: () => this.showUXMenu() },
            { label: this.t('menu_system'), action: () => this.showSystemMenu() }
        ];

        this.renderer.render(`${this.t('title')} v${GM_info.script.version}`, items);
    }

    public showFilterMenu(): void {
        const enabledIcon = (k: keyof ConfigState) => this.config.get(k) ? '✅' : '❌';
        const items: MenuItem[] = [
            { label: this.t('menu_rules'), action: () => this.showRuleMenu() },
            { label: `${enabledIcon('ENABLE_LOW_VIEW_FILTER')} ${this.t('menu_low_view')}`, action: () => this.toggle('ENABLE_LOW_VIEW_FILTER', 'filter') },
            { label: `${this.t('menu_threshold')} (${this.config.get('LOW_VIEW_THRESHOLD')})`, action: () => this.promptNumber('LOW_VIEW_THRESHOLD', 'threshold_prompt', 'filter') },
            { label: `${this.t('menu_grace')} (${this.config.get('GRACE_PERIOD_HOURS')}h)`, action: () => this.promptNumber('GRACE_PERIOD_HOURS', 'grace_prompt', 'filter') },
            { label: `${enabledIcon('ENABLE_DURATION_FILTER')} ${this.t('adv_duration_filter')}`, action: () => this.toggle('ENABLE_DURATION_FILTER', 'filter') },
            { label: this.t('adv_duration_set'), action: () => this.promptDuration() }
        ];
        this.renderer.render(this.t('menu_content'), items, () => this.showMainMenu());
    }

    public showListMenu(): void {
        const enabledIcon = (k: keyof ConfigState) => this.config.get(k) ? '✅' : '❌';
        const items: MenuItem[] = [
            { label: `[黑] ${this.t('adv_keyword_list')}`, action: () => this.manage('KEYWORD_BLACKLIST') },
            { label: `[黑] ${this.t('adv_channel_list')}`, action: () => this.manage('CHANNEL_BLACKLIST') },
            { label: `[黑] ${this.t('adv_section_list')}`, action: () => this.manage('SECTION_TITLE_BLACKLIST') },
            { label: `[白] ${this.t('adv_channel_whitelist')}`, action: () => this.manage('CHANNEL_WHITELIST') },
            { label: `[白] ${this.t('adv_members_whitelist')}`, action: () => this.manage('MEMBERS_WHITELIST') },
            { label: `[白] ${this.t('adv_keyword_whitelist')}`, action: () => this.manage('KEYWORD_WHITELIST') },
            { label: `[白] ${this.t('adv_subscribed_channels')}`, action: () => this.manage('SUBSCRIBED_CHANNELS') },
            { label: `${enabledIcon('ENABLE_KEYWORD_FILTER')} ${this.t('adv_keyword_filter')}`, action: () => this.toggle('ENABLE_KEYWORD_FILTER', 'list') },
            { label: `${enabledIcon('ENABLE_CHANNEL_FILTER')} ${this.t('adv_channel_filter')}`, action: () => this.toggle('ENABLE_CHANNEL_FILTER', 'list') },
            { label: `${enabledIcon('ENABLE_SECTION_FILTER')} ${this.t('adv_section_filter')}`, action: () => this.toggle('ENABLE_SECTION_FILTER', 'list') },
            { label: `${enabledIcon('ENABLE_SUBSCRIPTION_PROTECTION')} ${this.t('adv_subscription_protection')}`, action: () => this.toggle('ENABLE_SUBSCRIPTION_PROTECTION', 'list') }
        ];
        this.renderer.render(this.t('menu_lists'), items, () => this.showMainMenu());
    }

    public showUXMenu(): void {
        const enabledIcon = (k: keyof ConfigState) => this.config.get(k) ? '✅' : '❌';
        const items: MenuItem[] = [
            { label: `${enabledIcon('OPEN_IN_NEW_TAB')} ${this.t('menu_new_tab')}`, action: () => this.toggle('OPEN_IN_NEW_TAB', 'ux') },
            { label: `${enabledIcon('OPEN_NOTIFICATIONS_IN_NEW_TAB')} ${this.t('menu_notification_new_tab')}`, action: () => this.toggle('OPEN_NOTIFICATIONS_IN_NEW_TAB', 'ux') },
            { label: `${enabledIcon('ENABLE_REGION_CONVERT')} ${this.t('adv_region_convert')}`, action: () => this.toggle('ENABLE_REGION_CONVERT', 'ux') },
            { label: `${enabledIcon('DISABLE_FILTER_ON_CHANNEL')} ${this.t('adv_disable_channel')}`, action: () => this.toggle('DISABLE_FILTER_ON_CHANNEL', 'ux') },
            { label: `${enabledIcon('FONT_FIX')} ${this.t('menu_font_fix')}`, action: () => this.toggle('FONT_FIX', 'ux') }
        ];
        this.renderer.render(this.t('menu_ux'), items, () => this.showMainMenu());
    }

    public showSystemMenu(): void {
        const enabledIcon = (k: keyof ConfigState) => this.config.get(k) ? '✅' : '❌';
        const statsInfo = FilterStats.session.total > 0 ? ` (${FilterStats.session.total})` : '';
        const langName = I18N.availableLanguages[I18N.lang];

        const items: MenuItem[] = [
            { label: `${this.t('menu_stats')}${statsInfo}`, action: () => this.showStats() },
            { label: this.t('menu_export'), action: () => this.showExportImportMenu() },
            { label: `${this.t('menu_lang')} [${langName}]`, action: () => this.showLanguageMenu() },
            { label: `${enabledIcon('DEBUG_MODE')} ${this.t('menu_debug')}`, action: () => this.toggle('DEBUG_MODE', 'system') },
            { label: this.t('menu_reset'), action: () => this.resetSettings() }
        ];
        this.renderer.render(this.t('menu_system'), items, () => this.showMainMenu());
    }

    public showRuleMenu(page = 0): void {
        const rules = this.config.get('RULE_ENABLES');
        const keys = Object.keys(rules) as (keyof RuleEnables)[];
        const pageSize = 10;
        const totalPages = Math.ceil(keys.length / pageSize);
        const pageKeys = keys.slice(page * pageSize, Math.min((page + 1) * pageSize, keys.length));

        const items: MenuItem[] = pageKeys.map(key => ({
            label: `[${rules[key] ? '✅' : '❌'}] ${I18N.getRuleName(key)}`,
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

        this.renderer.render(`${this.t('rules_title')} (${page + 1}/${totalPages})`, items, () => this.showFilterMenu());
    }

    public manage(key: keyof ConfigState): void {
        const list = this.config.get(key) as string[];
        const title = `[ ${key} ]\n${list.join(', ') || '(Empty)'}`;
        const items: MenuItem[] = [
            { label: this.t('adv_add'), action: () => { this.listManager.addItem(key, list); this.manage(key); } },
            { label: this.t('adv_remove'), action: () => { this.listManager.removeItem(key, list); this.manage(key); } },
            { label: this.t('adv_clear'), action: () => { this.listManager.clearList(key); this.manage(key); } },
            { label: this.t('adv_restore'), action: () => { this.listManager.restoreDefaults(key); this.manage(key); } }
        ];

        this.renderer.render(title, items, () => this.showListMenu());
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
        const items: MenuItem[] = keys.map(key => ({
            label: `${key === current ? '✅' : '⬜'} ${langs[key]}`,
            action: () => {
                I18N.lang = key;
                alert(`✅ ${langs[key]}`);
                this.showSystemMenu();
            }
        }));
        this.renderer.render(this.t('lang_title'), items, () => this.showSystemMenu());
    }

    public showExportImportMenu(): void {
        const items: MenuItem[] = [
            { label: this.t('export_export'), action: () => { this.settingsIO.exportSettings(); this.showExportImportMenu(); } },
            { label: this.t('export_import'), action: () => { this.settingsIO.importSettings(); this.showExportImportMenu(); } }
        ];
        this.renderer.render(this.t('export_title'), items, () => this.showSystemMenu());
    }

    public resetSettings(): void {
        if (confirm(this.t('reset_confirm'))) {
            Object.keys(this.config.defaults).forEach(key => {
                this.config.set(key as keyof ConfigState, this.config.defaults[key as keyof ConfigState]);
            });
            this.onRefresh();
            alert(`✅ ${this.t('import_success')}`);
        }
        this.showSystemMenu();
    }

    private toggle(key: keyof ConfigState, context: MenuContext = 'main'): void {
        this.config.set(key, !this.config.get(key) as ConfigState[typeof key]);
        this.onRefresh();
        this.returnToContext(context);
    }

    private promptNumber(key: 'LOW_VIEW_THRESHOLD' | 'GRACE_PERIOD_HOURS', promptKey: string, context: MenuContext = 'main'): void {
        const value = prompt(this.t(promptKey), String(this.config.get(key)));
        if (value !== null) {
            const num = Number(value);
            if (!isNaN(num)) {
                this.config.set(key, num);
                this.onRefresh();
            } else {
                alert(`❌ ${this.t('invalid_number')}`);
            }
        }
        this.returnToContext(context);
    }

    private promptDuration(): void {
        const min = prompt(this.t('adv_min'), String(this.config.get('DURATION_MIN') / 60));
        const max = prompt(this.t('adv_max'), String(this.config.get('DURATION_MAX') / 60));

        if (min !== null) {
            const num = Number(min);
            if (!isNaN(num)) this.config.set('DURATION_MIN', num * 60);
        }
        if (max !== null) {
            const num = Number(max);
            if (!isNaN(num)) this.config.set('DURATION_MAX', num * 60);
        }

        this.onRefresh();
        this.showFilterMenu();
    }

    private returnToContext(context: MenuContext): void {
        const map: Record<MenuContext, () => void> = {
            filter: () => this.showFilterMenu(),
            list: () => this.showListMenu(),
            ux: () => this.showUXMenu(),
            system: () => this.showSystemMenu(),
            main: () => this.showMainMenu()
        };
        map[context]();
    }
}
