import { Logger } from '../core/logger';
import { Utils } from '../core/utils';
import { YtConfig } from '../core/types'; // Import strict typings
import type { ConfigManager } from '../core/config';

declare global {
    interface HTMLElement {
        _adGuardObserved?: boolean;
    }
}

// --- 常數定義 ---
const TIMING = {
    RESUME_COOLDOWN: 3000  // 恢復播放冷卻時間 (ms)
} as const;

// --- AdBlock Guard (優化版：使用 MutationObserver 取代輪詢) ---
export class AdBlockGuard {
    private config?: Pick<ConfigManager, 'get'>;
    private keywords: string[];
    private whitelistSelectors: string[];
    private lastTrigger: number;
    private observer: MutationObserver | null;
    private checkAndCleanThrottled: ((...args: any[]) => void) | null;

    constructor(config?: Pick<ConfigManager, 'get'>) {
        this.config = config;
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
        this.checkAndCleanThrottled = null;
    }

    private isEnabled(): boolean {
        return this.config?.get('RULE_ENABLES')?.ad_block_popup !== false;
    }

    // **ANTI-ADBLOCK PATCH**: 透過 YouTube 自身的配置對象來阻止偵測
    public patchConfig(): void {
        if (!this.isEnabled()) return;

        try {
            const config = (window.yt?.config_ || window.ytcfg?.data_) as YtConfig | undefined;
            if (config?.openPopupConfig?.supportedPopups?.adBlockMessageViewModel !== undefined) {
                config.openPopupConfig.supportedPopups.adBlockMessageViewModel = false;
            }
            if (config?.EXPERIMENT_FLAGS) {
                config.EXPERIMENT_FLAGS.ad_blocker_notifications_disabled = true;
                config.EXPERIMENT_FLAGS.web_enable_adblock_detection_block_playback = false;
            }
        } catch {
            // 忽略錯誤
        }
    }

    public start(): void {
        if (!this.isEnabled()) {
            this.destroy();
            return;
        }

        // 初始 Patch
        this.patchConfig();

        if (this.observer) return;

        // 使用 Throttled check，避免頻繁 Mutation 造成效能衝擊
        this.checkAndCleanThrottled = Utils.throttle(() => this.checkAndClean(), 250);

        // 使用 MutationObserver 監聽 popup 容器
        this.observer = new MutationObserver(() => this.checkAndCleanThrottled?.());

        // 監聽 body 的直接子元素變化 (popup 通常加在這裡)
        this.observer.observe(document.body, {
            childList: true,
            subtree: false  // 只監聽直接子元素，減少觸發次數
        });

        // 嘗試連接 popup container，帶有重試機制
        const tryConnect = (attempts = 0) => {
            if (!this.isEnabled() || !this.observer) return;

            const popupContainer = document.querySelector('ytd-popup-container') as HTMLElement | null;
            if (popupContainer && !popupContainer._adGuardObserved) {
                popupContainer._adGuardObserved = true;
                this.observer?.observe(popupContainer, { childList: true, subtree: true });
                Logger.info('🛡️ AdBlockGuard attached to popup container');
            } else if (attempts < 10) {
                // 如果還沒找到，每 500ms 重試一次，最多 5 秒
                setTimeout(() => tryConnect(attempts + 1), 500);
            }
        };

        tryConnect();

        // 初始檢查一次
        this.checkAndClean();
    }

    public sync(): void {
        if (!this.isEnabled()) {
            this.destroy();
            return;
        }

        this.start();
    }

    private isWhitelisted(dialog: Element): boolean {
        return this.whitelistSelectors.some(sel => dialog.querySelector(sel));
    }

    private isAdBlockPopup(dialog: Element): boolean {
        if (dialog.tagName === 'YTD-ENFORCEMENT-MESSAGE-VIEW-MODEL') return true;
        if (dialog.querySelector('ytd-enforcement-message-view-model')) return true;
        if (dialog.textContent && this.keywords.some(k => dialog.textContent.includes(k))) return true;
        return false;
    }

    public checkAndClean(): void {
        if (!this.isEnabled()) return;

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
                dialog.querySelectorAll<HTMLElement>('[aria-label="Close"], #dismiss-button').forEach(btn => btn.click());
                dialog.remove();
                detected = true;
                Logger.info(`🚫 Removed AdBlock Popup: ${dialog.tagName}`);
            }
        }

        if (detected) {
            this.removeAdBlockBackdrops();
            this.resumeVideo();
        }
    }

    private removeAdBlockBackdrops(): void {
        const openDialogs = Array.from(document.querySelectorAll('tp-yt-paper-dialog'));
        const hasNonAdBlockDialog = openDialogs.some(dialog => !this.isAdBlockPopup(dialog) || this.isWhitelisted(dialog));
        if (hasNonAdBlockDialog) return;

        document.querySelectorAll('tp-yt-iron-overlay-backdrop.opened').forEach(backdrop => backdrop.remove());
    }

    public resumeVideo(): void {
        if (Date.now() - this.lastTrigger > TIMING.RESUME_COOLDOWN) {
            this.lastTrigger = Date.now();
            const video = document.querySelector('video');
            if (video?.paused && !video.ended) {
                video.play().catch(() => { });
            }
        }
    }

    public destroy(): void {
        this.observer?.disconnect();
        this.observer = null;
        this.checkAndCleanThrottled = null;
    }
}
