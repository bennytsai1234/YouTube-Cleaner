export const SELECTORS = {
    // 頂層容器 (用於過濾)
    VIDEO_CONTAINERS: [
        'ytd-rich-item-renderer',
        'ytd-video-renderer',
        'ytd-compact-video-renderer',  // 播放頁側邊欄
        'ytd-grid-video-renderer',
        'yt-lockup-view-model',
        'ytd-compact-radio-renderer',   // 播放頁自動播放清單
        'ytd-playlist-panel-video-renderer'  // 播放清單面板
    ],
    SECTION_CONTAINERS: [
        'ytd-rich-section-renderer',
        'ytd-rich-shelf-renderer',
        'ytd-reel-shelf-renderer',
        'grid-shelf-view-model',
        'ytd-watch-next-secondary-results-renderer'  // 播放頁推薦區塊
    ],

    // Metadata 選擇器 (新舊版相容)
    METADATA: {
        // 觀看數/時間
        TEXT: '.inline-metadata-item, #metadata-line span, .yt-content-metadata-view-model__metadata-text, yt-content-metadata-view-model .yt-core-attributed-string',
        // 標題連結 (用於 aria-label 提取)
        TITLE_LINKS: [
            'a#video-title-link[aria-label]',
            'a#thumbnail[aria-label]',
            'a.yt-lockup-metadata-view-model__title[aria-label]',
            'a[href*="/watch?"][aria-label]'
        ],
        // 時長
        DURATION: 'ytd-thumbnail-overlay-time-status-renderer, span.ytd-thumbnail-overlay-time-status-renderer, badge-shape .yt-badge-shape__text, yt-thumbnail-badge-view-model .yt-badge-shape__text',
        // 頻道名稱
        CHANNEL: 'ytd-channel-name, .ytd-channel-name, a[href^="/@"]',
        // 標題文字
        TITLE: '#video-title, #title, .yt-lockup-metadata-view-model__title, h3'
    },

    // 會員/廣告標記
    BADGES: {
        MEMBERS: '.badge-style-type-members-only, [aria-label*="會員專屬"], [aria-label*="Members only"]',
        AD: '[aria-label*="廣告"], [aria-label*="Sponsor"], ad-badge-view-model, feed-ad-metadata-view-model',
        SHORTS: 'a[href*="/shorts/"]',
        MIX: 'a[aria-label*="合輯"], a[aria-label*="Mix"]'
    },

    // 互動排除
    INTERACTION_EXCLUDE: 'button, yt-icon-button, #menu, ytd-menu-renderer, ytd-toggle-button-renderer, yt-chip-cloud-chip-renderer, .yt-spec-button-shape-next, .yt-core-attributed-string__link, #subscribe-button, .ytp-progress-bar, .ytp-chrome-bottom',

    // 可點擊容器
    CLICKABLE: [
        'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-compact-video-renderer',
        'yt-lockup-view-model', 'ytd-playlist-renderer', 'ytd-compact-playlist-renderer',
        'ytd-video-owner-renderer', 'ytd-grid-video-renderer', 'ytd-playlist-video-renderer'
    ],

    // 內嵌預覽
    PREVIEW_PLAYER: 'ytd-video-preview',

    // 連結候選
    LINK_CANDIDATES: [
        'a#thumbnail[href*="/watch?"]', 'a#thumbnail[href*="/shorts/"]', 'a#thumbnail[href*="/playlist?"]',
        'a#video-title-link', 'a#video-title', 'a.yt-simple-endpoint#video-title', 'a.yt-lockup-view-model-wiz__title'
    ],

    // 生成組合選擇器
    get allContainers() {
        return [...this.VIDEO_CONTAINERS, ...this.SECTION_CONTAINERS].join(', ');
    },
    get videoContainersStr() {
        return this.VIDEO_CONTAINERS.join(', ');
    }
};
