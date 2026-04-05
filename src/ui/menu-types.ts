export interface MenuItem {
    label: string;
    action?: () => void;
    show?: boolean;
}

export type MenuContext = 'filter' | 'list' | 'ux' | 'system' | 'main';
