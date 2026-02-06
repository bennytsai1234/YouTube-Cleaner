import { SELECTORS } from '../data/selectors';
import { ConfigManager } from '../core/config';

// --- 8. Module: Interaction Enhancer (使用集中選擇器) ---
export class InteractionEnhancer {
    private config: ConfigManager;

    constructor(config: ConfigManager) {
        this.config = config;
    }

    private findPrimaryLink(container: HTMLElement | null): HTMLAnchorElement | null {
        if (!container) return null;
        for (const sel of SELECTORS.LINK_CANDIDATES) {
            const a = container.querySelector<HTMLAnchorElement>(sel);
            if (a?.href) return a;
        }
        return container.querySelector<HTMLAnchorElement>('a[href*="/watch?"], a[href*="/shorts/"], a[href*="/playlist?"]');
    }

    public init(): void {
        document.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // 0. 檢查是否點擊到被過濾隱藏的元素
            if (target.closest('[data-yp-hidden]')) return;

            // 1. 通知新分頁開啟邏輯 (優先處理)
            if (this.config.get('OPEN_NOTIFICATIONS_IN_NEW_TAB')) {
                // 擴大偵測範圍：一般通知、評論影片縮圖通知、多頁選單中的 Section
                const notificationPanel = target.closest('ytd-notification-renderer, ytd-comment-video-thumbnail-header-renderer, #sections.ytd-multi-page-menu-renderer');

                if (notificationPanel) {
                    const link = target.closest<HTMLAnchorElement>('a.yt-simple-endpoint, a[href*="/watch?"]');
                    // 確保只是點擊通知內容，而非側邊選單或其他按鈕 (如 :kebab: menu)
                    if (link && link.href && !target.closest('yt-icon-button, button')) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        window.open(link.href, '_blank');
                        return;
                    }
                }
            }

            // 2. 一般影片新分頁開啟
            if (!this.config.get('OPEN_IN_NEW_TAB')) return;
            if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

            // 使用集中管理的排除清單
            if (target.closest(SELECTORS.INTERACTION_EXCLUDE)) return;

            let targetLink: HTMLAnchorElement | null = null;
            const previewPlayer = target.closest<HTMLElement>(SELECTORS.PREVIEW_PLAYER);

            if (previewPlayer) {
                targetLink = this.findPrimaryLink(previewPlayer) || this.findPrimaryLink(previewPlayer.closest<HTMLElement>(SELECTORS.CLICKABLE.join(',')));
            } else {
                const container = target.closest<HTMLElement>(SELECTORS.CLICKABLE.join(', '));
                if (!container) return;

                // 頻道連結處理
                const channelLink = target.closest<HTMLAnchorElement>('a#avatar-link, .ytd-channel-name a, a[href^="/@"], a[href^="/channel/"]');
                targetLink = channelLink?.href ? channelLink : this.findPrimaryLink(container);
            }

            if (!targetLink) return;

            try {
                const hostname = new URL(targetLink.href, location.origin).hostname;
                const isValidTarget = targetLink.href && /(^|\.)youtube\.com$/.test(hostname);
                if (isValidTarget) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    window.open(targetLink.href, '_blank');
                }
            } catch { /* ignore */ }
        }, { capture: true });
    }
}
