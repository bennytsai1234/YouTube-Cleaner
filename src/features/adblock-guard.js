import { Logger } from '../core/logger.js';

// --- 6. Module: AdBlock Guard (Enhanced with Whitelist) ---
export class AdBlockGuard {
    constructor() {
        // 多語言關鍵字偵測
        this.keywords = [
            'Ad blockers', '廣告攔截器', '广告拦截器', '広告ブロッカー', '광고 차단기',
            'Video player will be blocked', '影片播放器將被封鎖', '视频播放器将被封锁',
            'Allow YouTube', '允許 YouTube', '允许 YouTube',
            'You have an ad blocker', '您使用了廣告攔截器',
            'YouTube 禁止使用廣告攔截器', "YouTube doesn't allow ad blockers"
        ];
        // 白名單選擇器 - 這些對話框絕不是廣告警告
        this.whitelistSelectors = [
            'ytd-sponsorships-offer-renderer',   // 會員加入視窗
            'ytd-about-channel-renderer',         // 頻道資訊視窗
            'ytd-report-form-modal-renderer',     // 檢舉視窗
            'ytd-multi-page-menu-renderer',       // 通用選單
            'ytd-playlist-add-to-option-renderer' // 加入播放清單視窗
        ];
        this.lastTrigger = 0;
    }

    start() {
        const beat = () => {
            this.checkAndClean();
            setTimeout(() => requestAnimationFrame(beat), 800);
        };
        beat();
    }

    isWhitelisted(dialog) {
        for (const sel of this.whitelistSelectors) {
            if (dialog.querySelector(sel)) {
                Logger.info(`✅ Whitelist dialog detected: ${sel}`);
                return true;
            }
        }
        return false;
    }

    isAdBlockPopup(dialog) {
        // ytd-enforcement-message-view-model 是廣告攔截專屬標籤，直接判定
        if (dialog.tagName === 'YTD-ENFORCEMENT-MESSAGE-VIEW-MODEL') {
            return true;
        }
        // 檢查是否包含廣告攔截專屬標籤
        if (dialog.querySelector('ytd-enforcement-message-view-model')) {
            return true;
        }
        // 深度關鍵字檢查
        if (dialog.innerText && this.keywords.some(k => dialog.innerText.includes(k))) {
            return true;
        }
        return false;
    }

    checkAndClean() {
        // 更積極的彈窗選擇器
        const popupSelectors = [
            'tp-yt-paper-dialog',
            'ytd-enforcement-message-view-model',
            'yt-playability-error-supported-renderers',
            'ytd-popup-container tp-yt-paper-dialog',
            '[role="dialog"]:has(ytd-enforcement-message-view-model)'
        ];

        const dialogs = document.querySelectorAll(popupSelectors.join(', '));
        let detected = false;

        for (const dialog of dialogs) {
            // ★ 白名單優先檢查 - 避免誤殺會員視窗等
            if (this.isWhitelisted(dialog)) continue;

            if (this.isAdBlockPopup(dialog)) {
                // 嘗試點擊關閉按鈕
                const dismissBtns = dialog.querySelectorAll('[aria-label="Close"], #dismiss-button, [aria-label="可能有風險"], .yt-spec-button-shape-next--call-to-action');
                dismissBtns.forEach(btn => btn.click());

                dialog.remove();
                detected = true;
                Logger.info(`🚫 Removed AdBlock Popup: ${dialog.tagName}`);
            }
        }

        if (detected) {
            // 移除背景遮罩 (包含所有可能的遮罩)
            document.querySelectorAll('tp-yt-iron-overlay-backdrop, .ytd-popup-container, [style*="z-index: 9999"]').forEach(b => {
                if (b.classList.contains('opened') || b.style.display !== 'none') {
                    b.style.display = 'none';
                    b.remove();
                }
            });
            this.resumeVideo();
        }
    }

    resumeVideo() {
        // 只有剛偵測到彈窗時才強制播放，避免過度積極
        if (Date.now() - this.lastTrigger > 3000) {
            this.lastTrigger = Date.now();
            const video = document.querySelector('video');
            if (video && video.paused && !video.ended) {
                video.play().catch(() => { });
            }
        }
    }
}
