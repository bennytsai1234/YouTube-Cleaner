import { MenuItem } from './menu-types';

export class MenuRenderer {
    private translate: (key: string, ...args: any[]) => string;

    constructor(translate: (key: string, ...args: any[]) => string) {
        this.translate = translate;
    }

    public render(title: string, items: MenuItem[], backAction: (() => void) | null = null): void {
        const visibleItems = items.filter(item => item.show !== false);
        const menuString = visibleItems.map((item, idx) => `${idx + 1}. ${item.label}`).join('\n');
        const footer = backAction ? `\n0. ${this.translate('back')}` : '';
        const promptText = `【 ${title} 】\n\n${menuString}${footer}\n\n${this.translate('menu_input')}`;

        const choice = prompt(promptText);
        if (choice === '0' && backAction) {
            backAction();
            return;
        }

        if (choice !== null) {
            const selected = visibleItems[parseInt(choice, 10) - 1];
            selected?.action?.();
        }
    }
}
