import { ConfigManager } from './core/config.js';
import { StyleManager } from './features/style-manager.js';
import { AdBlockGuard } from './features/adblock-guard.js';
import { VideoFilter } from './features/video-filter.js';
import { InteractionEnhancer } from './features/interaction.js';
import { UIManager } from './ui/menu.js';
import { Logger } from './core/logger.js';
import { Utils } from './core/utils.js';

// --- 10. App Entry ---
class App {
    constructor() {
        this.config = new ConfigManager();
        this.styleManager = new StyleManager(this.config);
        this.adGuard = new AdBlockGuard();
        this.filter = new VideoFilter(this.config);
        this.enhancer = new InteractionEnhancer(this.config);
        this.ui = new UIManager(this.config, () => this.refresh());
    }

    // **ANTI-ADBLOCK PATCH**: 透過 YouTube 自身的配置對象來阻止偵測
    patchYouTubeConfig() {
        try {
            const config = window.yt?.config_ || window.ytcfg?.data_;
            if (config?.openPopupConfig?.supportedPopups?.adBlockMessageViewModel) {
                config.openPopupConfig.supportedPopups.adBlockMessageViewModel = false;
            }
            if (config?.EXPERIMENT_FLAGS) {
                config.EXPERIMENT_FLAGS.ad_blocker_notifications_disabled = true;
                config.EXPERIMENT_FLAGS.web_enable_adblock_detection_block_playback = false;
            }
        } catch (e) {
            // 忽略錯誤
        }
    }

    init() {
        Logger.enabled = this.config.get('DEBUG_MODE');

        // 先嘗試 patch YouTube 配置
        this.patchYouTubeConfig();

        this.styleManager.apply();
        this.adGuard.start();
        this.enhancer.init();
        GM_registerMenuCommand('⚙️ 淨化大師設定', () => this.ui.showMainMenu());

        // 優化：使用 Debounce + Queue 處理高頻 Mutation (防止 Chip 切換時卡死)
        let mutationQueue = [];
        const processQueue = Utils.debounce(() => {
            this.filter.processMutations(mutationQueue);
            mutationQueue = [];
        }, 50); // 50ms 延遲足夠收集一批變更

        const obs = new MutationObserver((mutations) => {
            mutationQueue.push(...mutations);
            processQueue();
        });
        obs.observe(document.body, { childList: true, subtree: true });

        window.addEventListener('yt-navigate-finish', () => {
            this.patchYouTubeConfig(); // 每次導航後重新 patch
            this.filter.clearCache(); // 清除快取，防止 DOM 重用導致過濾失效
            this.filter.processPage();
            this.adGuard.checkAndClean();
        });

        this.filter.processPage();

        // 檢測 OpenCC-JS 載入狀態
        if (typeof OpenCC !== 'undefined') {
            Logger.info('✅ 成功載入 OpenCC-JS 繁簡轉換庫');
        } else {
            Logger.info('⚠️ OpenCC-JS 未載入，繁簡過濾功能受限');
        }

        Logger.info(`🚀 YouTube 淨化大師 v${GM_info.script.version} 啟動`);
    }

    refresh() {
        Logger.enabled = this.config.get('DEBUG_MODE');
        this.filter.reset();
        this.styleManager.apply();
        this.filter.processPage();
    }
}

// 防止腳本重複初始化
if (!window.ytPurifierInitialized) {
    window.ytPurifierInitialized = true;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => new App().init());
    else new App().init();
}
