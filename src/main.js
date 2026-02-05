import { ConfigManager } from './core/config.js';
import { StyleManager } from './features/style-manager.js';
import { AdBlockGuard } from './features/adblock-guard.js';
import { VideoFilter } from './features/video-filter.js';
import { InteractionEnhancer } from './features/interaction.js';
import { UIManager } from './ui/menu.js';
import { Logger } from './core/logger.js';

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

    init() {
        Logger.enabled = this.config.get('DEBUG_MODE');

        this.styleManager.apply();
        this.adGuard.start(); // Internally calls patchConfig
        this.filter.start();  // Internally starts MutationObserver
        this.enhancer.init();
        GM_registerMenuCommand('⚙️ 淨化大師設定', () => this.ui.showMainMenu());

        window.addEventListener('yt-navigate-finish', () => {
            this.adGuard.patchConfig(); // 每次導航後重新 patch
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
