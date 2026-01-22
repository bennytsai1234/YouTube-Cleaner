import { SELECTORS } from '../data/selectors.js';

// --- 8. Module: Interaction Enhancer (使用集中選擇器) ---
export class InteractionEnhancer {
    constructor(config) {
        this.config = config;
    }

    findPrimaryLink(container) {
        if (!container) return null;
        for (const sel of SELECTORS.LINK_CANDIDATES) {
            const a = container.querySelector(sel);
            if (a?.href) return a;
        }
        return container.querySelector('a[href*="/watch?"], a[href*="/shorts/"], a[href*="/playlist?"]');
    }

    init() {
        document.addEventListener('click', (e) => {
            // 0. 檢查是否點擊到被過濾隱藏的元素
            if (e.target.closest('[data-yp-hidden]')) return;

            // 1. 通知新分頁開啟邏輯 (優先處理)
            if (this.config.get('OPEN_NOTIFICATIONS_IN_NEW_TAB')) {
                const notification = e.target.closest('ytd-notification-renderer');
                if (notification) {
                    const link = e.target.closest('a.yt-simple-endpoint');
                    // 確保只是點擊通知內容，而非側邊選單或其他按鈕
                    if (link && link.href && !e.target.closest('yt-icon-button')) {
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
            if (e.target.closest(SELECTORS.INTERACTION_EXCLUDE)) return;

            let targetLink = null;
            const previewPlayer = e.target.closest(SELECTORS.PREVIEW_PLAYER);

            if (previewPlayer) {
                targetLink = this.findPrimaryLink(previewPlayer) || this.findPrimaryLink(previewPlayer.closest(SELECTORS.CLICKABLE.join(',')));
            } else {
                const container = e.target.closest(SELECTORS.CLICKABLE.join(', '));
                if (!container) return;

                // 頻道連結處理
                const channelLink = e.target.closest('a#avatar-link, .ytd-channel-name a, a[href^="/@"], a[href^="/channel/"]');
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
            } catch (err) { /* ignore */ }
        }, { capture: true });
    }
}
