import { Logger } from '../core/logger.js';

// --- 常數定義 ---
const TIMING = {
    RESUME_COOLDOWN: 3000  // 恢復播放冷卻時間 (ms)
};

// --- AdBlock Guard (優化版：使用 MutationObserver 取代輪詢) ---
export class AdBlockGuard {
    constructor() {
        // 精簡關鍵字 (只保留最常見的)
        this.keywords = [
            'Ad blockers', '廣告攔截器',
            'Video player will be blocked', '影片播放器將被封鎖',
            'Allow YouTube', '允許 YouTube',
            "YouTube doesn't allow ad blockers"
        ];
        // 白名單選擇器
        this.whitelistSelectors = [
            'ytd-sponsorships-offer-renderer',
            'ytd-about-channel-renderer',
            'ytd-report-form-modal-renderer',
            'ytd-multi-page-menu-renderer',
            'ytd-playlist-add-to-option-renderer'
        ];
        this.lastTrigger = 0;
        this.observer = null;
    }

    start() {
        // 使用 MutationObserver 監聽 popup 容器，比輪詢更高效
        this.observer = new MutationObserver(() => this.checkAndClean());

        // 監聽 body 的直接子元素變化 (popup 通常加在這裡)
        this.observer.observe(document.body, {
            childList: true,
            subtree: false  // 只監聽直接子元素，減少觸發次數
        });

        // 也監聽 popup container
        const setupPopupObserver = () => {
            const popupContainer = document.querySelector('ytd-popup-container');
            if (popupContainer && !popupContainer._adGuardObserved) {
                popupContainer._adGuardObserved = true;
                this.observer.observe(popupContainer, { childList: true, subtree: true });
            }
        };

        setupPopupObserver();
        // 延遲再試一次 (popup container 可能還沒載入)
        setTimeout(setupPopupObserver, 2000);

        // 初始檢查一次
        this.checkAndClean();
    }

    isWhitelisted(dialog) {
        return this.whitelistSelectors.some(sel => dialog.querySelector(sel));
    }

    isAdBlockPopup(dialog) {
        if (dialog.tagName === 'YTD-ENFORCEMENT-MESSAGE-VIEW-MODEL') return true;
        if (dialog.querySelector('ytd-enforcement-message-view-model')) return true;
        if (dialog.innerText && this.keywords.some(k => dialog.innerText.includes(k))) return true;
        return false;
    }

    checkAndClean() {
        const popupSelectors = [
            'tp-yt-paper-dialog',
            'ytd-enforcement-message-view-model',
            'yt-playability-error-supported-renderers'
        ];

        const dialogs = document.querySelectorAll(popupSelectors.join(', '));
        let detected = false;

        for (const dialog of dialogs) {
            if (this.isWhitelisted(dialog)) continue;
            if (this.isAdBlockPopup(dialog)) {
                dialog.querySelectorAll('[aria-label="Close"], #dismiss-button').forEach(btn => btn.click());
                dialog.remove();
                detected = true;
                Logger.info(`🚫 Removed AdBlock Popup: ${dialog.tagName}`);
            }
        }

        if (detected) {
            document.querySelectorAll('tp-yt-iron-overlay-backdrop.opened').forEach(b => b.remove());
            this.resumeVideo();
        }
    }

    resumeVideo() {
        if (Date.now() - this.lastTrigger > TIMING.RESUME_COOLDOWN) {
            this.lastTrigger = Date.now();
            const video = document.querySelector('video');
            if (video?.paused && !video.ended) {
                video.play().catch(() => {});
            }
        }
    }

    destroy() {
        this.observer?.disconnect();
    }
}
