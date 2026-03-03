// --- YouTube Internal Global Types ---

export interface YtConfig {
    openPopupConfig?: {
        supportedPopups?: {
            adBlockMessageViewModel?: boolean;
            [key: string]: any; // fallback for other popups
        };
    };
    EXPERIMENT_FLAGS?: {
        ad_blocker_notifications_disabled?: boolean;
        web_enable_adblock_detection_block_playback?: boolean;
        [key: string]: any; // fallback for other flags
    };
    [key: string]: any; // fallback for other config properties
}

declare global {
    interface Window {
        yt?: {
            config_?: YtConfig;
            [key: string]: any;
        };
        ytcfg?: {
            data_?: YtConfig;
            [key: string]: any;
        };
    }
}
