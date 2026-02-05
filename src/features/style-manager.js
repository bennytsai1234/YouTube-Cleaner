import { Logger } from '../core/logger.js';

// --- 5. Module: Style Manager (CSS) ---
export class StyleManager {
    constructor(config) { this.config = config; }

    apply() {
        const rules = [];
        const enables = this.config.get('RULE_ENABLES');

        // 5.1 Global Fixes
        rules.push('body, html { font-family: "YouTube Noto", Roboto, Arial, "PingFang SC", "Microsoft YaHei", sans-serif !important; }');

        // 5.2 Anti-Adblock (完整還原 v1.4.0)
        if (enables.ad_block_popup) {
            rules.push(`
                tp-yt-paper-dialog:has(ytd-enforcement-message-view-model),
                ytd-enforcement-message-view-model,
                #immersive-translate-browser-popup,
                tp-yt-iron-overlay-backdrop:has(~ tp-yt-paper-dialog ytd-enforcement-message-view-model),
                tp-yt-iron-overlay-backdrop.opened,
                yt-playability-error-supported-renderers:has(ytd-enforcement-message-view-model) { display: none !important; }

                ytd-app:has(ytd-enforcement-message-view-model), body:has(ytd-enforcement-message-view-model), html:has(ytd-enforcement-message-view-model) {
                    overflow: auto !important; overflow-y: auto !important; position: static !important;
                    pointer-events: auto !important; height: auto !important; top: 0 !important;
                    margin-right: 0 !important; overscroll-behavior: auto !important;
                }

                ytd-app[aria-hidden="true"]:has(ytd-enforcement-message-view-model) {
                    display: block !important;
                }

                ytd-app { --ytd-app-scroll-offset: 0 !important; }
            `);
        }

        // 5.3 Simple Selection (CSS)
        // ★ Add new Selector-based rules here
        const map = {
            ad_sponsor: [
                'ytd-ad-slot-renderer',
                'ytd-promoted-sparkles-text-search-renderer',
                '#masthead-ad',
                'ytd-rich-item-renderer:has(.ytd-ad-slot-renderer)',
                'feed-ad-metadata-view-model',
                'ad-badge-view-model'
            ],
            premium_banner: ['ytd-statement-banner-renderer', 'ytd-rich-section-renderer:has(ytd-statement-banner-renderer)'],
            clarify_box: ['ytd-info-panel-container-renderer'],
            inline_survey: ['ytd-rich-section-renderer:has(ytd-inline-survey-renderer)'],
            playables_block: ['ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-playables])', 'ytd-game-card-renderer'],
            shorts_block: ['ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])']
        };

        for (const [key, selectors] of Object.entries(map)) {
            if (enables[key]) rules.push(`${selectors.join(', ')} { display: none !important; }`);
        }

        // 5.4 Advanced :has() Rules
        // ★ Add new Container rules here
        const hasRules = [
            { key: 'ad_sponsor', selector: '[aria-label*="廣告"], [aria-label*="Sponsor"], [aria-label="贊助商廣告"], ad-badge-view-model, feed-ad-metadata-view-model' },
            { key: 'members_only', selector: '[aria-label*="會員專屬"]' },
            { key: 'shorts_item', selector: 'a[href*="/shorts/"]' },
            { key: 'mix_only', selector: 'a[aria-label*="合輯"], a[aria-label*="Mix"]' }
        ];

        hasRules.forEach(({ key, selector }) => {
            if (enables[key]) {
                const containersList = SELECTORS.VIDEO_CONTAINERS || [];
                containersList.forEach(c => rules.push(`${c}:has(${selector}) { display: none !important; }`));
            }
        });

        // 5.5 首頁推薦播放清單 (已移至 JavaScript 處理)

        // 修正：避免重複注入，先檢查是否存在
        let styleEl = document.getElementById('yt-cleaner-css');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'yt-cleaner-css';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = rules.join('\n');
        Logger.info('Static CSS rules updated');
    }
}
