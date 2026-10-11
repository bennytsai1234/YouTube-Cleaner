// 頂層容器 (用於過濾)
const VIDEO_CONTAINERS = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',  // 播放頁側邊欄
    'ytd-grid-video-renderer',
    'yt-lockup-view-model',
    'ytd-compact-radio-renderer',   // 播放頁自動播放清單
    'ytd-playlist-panel-video-renderer', // 播放清單面板
    'ytd-playlist-video-renderer'   // 播放清單頁面中的影片項目
];

const SECTION_CONTAINERS = [
    'ytd-rich-section-renderer',
    'ytd-rich-shelf-renderer',
    'ytd-reel-shelf-renderer',
    'grid-shelf-view-model'
];

// 以 aria-label 辨識標記；影片標題（h3、標題連結、#video-title）與頻道頭像的 aria-label
// 是標題或頻道名稱本身，排除掉，避免標題含關鍵字的一般影片被當成標記
const ariaLabelMarker = (text: string): string =>
    `[aria-label*="${text}"]:not(a):not(h3):not(#video-title):not(yt-avatar-shape *)`;

const ALL_CONTAINERS_STR =[...VIDEO_CONTAINERS, ...SECTION_CONTAINERS].join(', ');
const VIDEO_CONTAINERS_STR = VIDEO_CONTAINERS.join(', ');

export interface SelectorsMetadata {
    TEXT: string;
    TITLE_LINKS: string[];
    DURATION: string;
    CHANNEL: string;
    TITLE: string;
}

export interface SelectorsBadges {
    MEMBERS: string;
    AD: string;
    SHORTS: string;
    TEXT: string;
}

export interface SelectorsType {
    VIDEO_CONTAINERS: string[];
    SECTION_CONTAINERS: string[];
    METADATA: SelectorsMetadata;
    SHELF_TITLE: string[];
    SHELF_HEADER_TEXT: string;
    MEMBERSHIP_UPSELL_SECTION: string;
    BADGES: SelectorsBadges;
    INTERACTION_EXCLUDE: string;
    CLICKABLE: string[];
    PREVIEW_PLAYER: string;
    LINK_CANDIDATES: string[];
    allContainers: string;
    videoContainersStr: string;
}

export const SELECTORS: SelectorsType = {
    VIDEO_CONTAINERS,
    SECTION_CONTAINERS,

    // Metadata 選擇器 (新舊版相容)
    METADATA: {
        // 觀看數/時間
        TEXT: '.inline-metadata-item, #metadata-line span, .yt-content-metadata-view-model__metadata-text, .ytContentMetadataViewModelMetadataText, yt-content-metadata-view-model .yt-core-attributed-string',
        // 標題連結 (用於 aria-label 提取)
        TITLE_LINKS: [
            'a#video-title-link[aria-label]',
            'a#thumbnail[aria-label]',
            'a.yt-lockup-metadata-view-model__title[aria-label]',
            'a.ytLockupMetadataViewModelTitle[aria-label]',
            'a.yt-lockup-view-model__content-image[aria-label]',
            'a[href*="/watch?"][aria-label]'
        ],
        // 時長
        DURATION: 'ytd-thumbnail-overlay-time-status-renderer, span.ytd-thumbnail-overlay-time-status-renderer, badge-shape .yt-badge-shape__text, yt-thumbnail-badge-view-model .yt-badge-shape__text, yt-thumbnail-badge-view-model .ytBadgeShapeText',
        // 頻道名稱
        CHANNEL: [
            'ytd-channel-name a',
            '.ytd-channel-name a',
            'a.yt-core-attributed-string__link[href^="/@"]',
            'a.yt-core-attributed-string__link[href^="/channel/"]',
            'a.yt-core-attributed-string__link[href^="/c/"]',
            'a.yt-core-attributed-string__link[href^="/user/"]',
            'a[href^="/@"]',
            'a[href^="/channel/"]',
            'a[href^="/c/"]',
            'a[href^="/user/"]',
            'ytd-channel-name',
            '.ytd-channel-name',
            'yt-decorated-avatar-view-model'
        ].join(', '),
        // 標題文字
        TITLE: '#video-title, #title, .yt-lockup-metadata-view-model__title, .ytLockupMetadataViewModelTitle, .yt-lockup-metadata-view-model__heading-reset, .ytLockupMetadataViewModelHeadingReset, h3'
    },

    // 欄位/區塊標題選擇器 (用於整區過濾)
    SHELF_TITLE: [
        '#rich-shelf-header #title',           // 標準首頁 Shelf
        'ytd-reel-shelf-renderer #title',      // Shorts Shelf
        'h2#title',                            // 通用
        '.ytd-shelf-renderer #title'
    ],

    // 區塊標題列的文字元素（區塊文字規則逐一比對）：標題、副標題，以及標題旁的「YouTube 精選」標記
    SHELF_HEADER_TEXT: '#title, #subtitle, #featured-badge, h2, .yt-shelf-header-layout__title, .yt-shelf-header-layout__sublabel',

    // 首頁會員招募區塊（YouTube 動態載入的推薦頻道 upsell）
    MEMBERSHIP_UPSELL_SECTION: 'ytd-rich-section-renderer:has(ytd-brand-video-shelf-renderer[has-sponsorships-channel-upsell-view-model])',

    // 會員/廣告標記
    BADGES: {
        MEMBERS: ['.badge-style-type-members-only', '.yt-badge-shape--commerce', '.yt-badge-shape--promoted', '.ytBadgeShapeCommerce', '.ytBadgeShapePromoted',
            ...['會員專屬', 'Members only', '會員優先', 'YouTube 精選'].map(ariaLabelMarker)].join(', '),
        AD: [...['廣告', 'Sponsor'].map(ariaLabelMarker), 'ad-badge-view-model', 'feed-ad-metadata-view-model'].join(', '),
        SHORTS: 'a[href*="/shorts/"]',
        // badge 文字（文字規則逐一比對）：新舊版 badge 與舊版合輯縮圖側欄
        TEXT: 'badge-shape, ytd-badge-supported-renderer .badge, ytd-thumbnail-overlay-side-panel-renderer'
    },

    // 互動排除
    INTERACTION_EXCLUDE: 'button, yt-icon-button, #menu, ytd-menu-renderer, ytd-menu-popup-renderer, ytd-toggle-button-renderer, yt-chip-cloud-chip-renderer, .yt-spec-button-shape-next, .yt-core-attributed-string__link, .ytAttributedStringLink, #subscribe-button, .ytp-progress-bar, .ytp-chrome-bottom',

    // 可點擊容器
    CLICKABLE: [
        'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-compact-video-renderer',
        'yt-lockup-view-model', 'ytd-playlist-renderer', 'ytd-compact-playlist-renderer',
        'ytd-video-owner-renderer', 'ytd-grid-video-renderer', 'ytd-playlist-video-renderer',
        'ytd-playlist-panel-video-renderer', 'ytd-guide-entry-renderer',
        'a.ytp-modern-videowall-still'
    ],

    // 內嵌預覽
    PREVIEW_PLAYER: 'ytd-video-preview',

    // 連結候選
    LINK_CANDIDATES: [
        'a#thumbnail[href*="/watch?"]', 'a#thumbnail[href*="/shorts/"]', 'a#thumbnail[href*="/playlist?"]',
        'a#video-title-link', 'a#video-title', 'a.yt-simple-endpoint#video-title',
        'a.yt-lockup-metadata-view-model__title[href*="/watch?"]',
        'a.ytLockupMetadataViewModelTitle[href*="/watch?"]',
        'a.yt-lockup-metadata-view-model__title[href*="/shorts/"]',
        'a.ytLockupMetadataViewModelTitle[href*="/shorts/"]',
        'a.yt-lockup-view-model__content-image[href*="/watch?"]',
        'a.ytLockupViewModelContentImage[href*="/watch?"]',
        'a.yt-lockup-view-model__content-image[href*="/shorts/"]',
        'a.ytLockupViewModelContentImage[href*="/shorts/"]',
        'a.yt-lockup-view-model-wiz__title'
    ],

    // 生成組合選擇器 (Properties)
    allContainers: ALL_CONTAINERS_STR,
    videoContainersStr: VIDEO_CONTAINERS_STR
};
