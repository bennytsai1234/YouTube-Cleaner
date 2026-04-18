import { ConfigManager } from '../core/config';
import { SELECTORS } from '../data/selectors';
import { Logger } from '../core/logger';
import { getWhitelistScope, isStrongRule } from '../data/rules';
import { CustomRuleManager } from './custom-rules';
import { SubscriptionManager } from './subscription-manager';
import { FilterDetail, WhitelistReason } from './filter-types';
import { LazyVideoData } from './video-data';

export class FilterEngine {
    private config: ConfigManager;
    private customRules: CustomRuleManager;
    public subManager: SubscriptionManager;

    constructor(config: ConfigManager) {
        this.config = config;
        this.customRules = new CustomRuleManager(config);
        this.subManager = new SubscriptionManager(config);
    }

    public findFilterDetail(element: HTMLElement, allowPageContent: boolean): FilterDetail | null {
        const textMatch = this.customRules.check(element, element.textContent || '');
        if (textMatch) return { reason: textMatch.key, trigger: textMatch.trigger };

        const sectionMatch = this.checkSectionFilter(element);
        if (sectionMatch) return sectionMatch;

        const isVideoElement = /VIDEO|LOCKUP|RICH-ITEM|PLAYLIST-PANEL-VIDEO/.test(element.tagName);
        if (!isVideoElement || allowPageContent) return null;

        const item = new LazyVideoData(element);

        return this.getFilterKeyword(item) ||
            this.getFilterChannel(item) ||
            this.getStrongRuleMatch(item) ||
            this.getFilterView(item) ||
            this.getFilterDuration(item) ||
            this.getFilterPlaylist(item);
    }

    public checkSectionFilter(element: HTMLElement): FilterDetail | null {
        if (!/RICH-SECTION|REEL-SHELF|SHELF-RENDERER/.test(element.tagName)) return null;
        if (!this.config.get('ENABLE_SECTION_FILTER')) return null;

        let titleText = '';
        for (const sel of SELECTORS.SHELF_TITLE) {
            const titleEl = element.querySelector(sel);
            if (titleEl) {
                titleText = titleEl.textContent?.trim() || '';
                break;
            }
        }

        if (!titleText) return null;

        const compiled = this.config.get('compiledSectionBlacklist');
        if (!compiled) return null;

        for (const rx of compiled) {
            if (rx.test(titleText)) {
                return { reason: 'section_blacklist', trigger: `Title: "${titleText}"`, rule: rx.toString() };
            }
        }

        return null;
    }

    public checkWhitelist(item: LazyVideoData): WhitelistReason | null {
        const channel = item.channel;
        const title = item.title;

        const compiledChannels = this.config.get('compiledChannelWhitelist');
        const rawChannels = this.config.get('CHANNEL_WHITELIST') || [];

        if (channel) {
            if (compiledChannels && compiledChannels.length > 0) {
                if (compiledChannels.some(rx => rx.test(channel))) return 'channel_whitelist';
            } else if (rawChannels.length > 0) {
                const cLower = channel.toLowerCase();
                if (rawChannels.some(k => cLower.includes(k.toLowerCase()))) return 'channel_whitelist';
            }
        }

        const compiledKeywords = this.config.get('compiledKeywordWhitelist');
        const rawKeywords = this.config.get('KEYWORD_WHITELIST') || [];

        if (title) {
            if (compiledKeywords && compiledKeywords.length > 0) {
                if (compiledKeywords.some(rx => rx.test(title))) return 'keyword_whitelist';
            } else if (rawKeywords.length > 0) {
                const tLower = title.toLowerCase();
                if (rawKeywords.some(k => tLower.includes(k.toLowerCase()))) return 'keyword_whitelist';
            }
        }

        return null;
    }

    public getFilterKeyword(item: LazyVideoData): FilterDetail | null {
        if (!this.config.get('ENABLE_KEYWORD_FILTER') || !item.title) return null;

        const compiled = this.config.get('compiledKeywords');
        if (this.config.get('ENABLE_REGION_CONVERT') && compiled) {
            for (const rx of compiled) {
                if (rx.test(item.title)) return { reason: 'keyword_blacklist', trigger: `Title: "${item.title}"`, rule: rx.toString() };
            }
            return null;
        }

        const title = item.title.toLowerCase();
        const rawList = this.config.get('KEYWORD_BLACKLIST');
        for (const k of rawList) {
            if (title.includes(k.toLowerCase())) return { reason: 'keyword_blacklist', trigger: `Keyword: "${k}"` };
        }

        return null;
    }

    public getFilterChannel(item: LazyVideoData): FilterDetail | null {
        if (!this.config.get('ENABLE_CHANNEL_FILTER') || !item.channel) return null;

        const compiled = this.config.get('compiledChannels');
        if (this.config.get('ENABLE_REGION_CONVERT') && compiled) {
            for (const rx of compiled) {
                if (rx.test(item.channel)) return { reason: 'channel_blacklist', trigger: `Channel: "${item.channel}"`, rule: rx.toString() };
            }
            return null;
        }

        const channel = item.channel.toLowerCase();
        const rawList = this.config.get('CHANNEL_BLACKLIST');
        for (const k of rawList) {
            if (channel.includes(k.toLowerCase())) return { reason: 'channel_blacklist', trigger: `Channel Keyword: "${k}"` };
        }

        return null;
    }

    public getFilterView(item: LazyVideoData): FilterDetail | null {
        if (!this.config.get('ENABLE_LOW_VIEW_FILTER') || item.isShorts) return null;

        const threshold = this.config.get('LOW_VIEW_THRESHOLD');
        const grace = this.config.get('GRACE_PERIOD_HOURS') * 60;

        if (item.isLive && item.liveViewers !== null && item.liveViewers < threshold) {
            return { reason: 'low_viewer_live', trigger: `Viewers: ${item.liveViewers} < Threshold: ${threshold} | Raw: "${item.raw.viewers}"` };
        }

        if (!item.isLive && item.viewCount !== null && item.timeAgo !== null && item.timeAgo > grace && item.viewCount < threshold) {
            return { reason: 'low_view', trigger: `Views: ${item.viewCount} < Threshold: ${threshold} | Age: ${Math.floor(item.timeAgo / 60)}h (Grace: ${this.config.get('GRACE_PERIOD_HOURS')}h) | Raw: "${item.raw.views}"` };
        }

        return null;
    }

    public getFilterDuration(item: LazyVideoData): FilterDetail | null {
        if (!this.config.get('ENABLE_DURATION_FILTER') || item.isShorts || item.duration === null) return null;

        const min = this.config.get('DURATION_MIN');
        const max = this.config.get('DURATION_MAX');

        if (min > 0 && item.duration < min) {
            return { reason: 'duration_filter', trigger: `Duration: ${item.duration}s < Min: ${min}s | Raw: "${item.raw.duration}"` };
        }
        if (max > 0 && item.duration > max) {
            return { reason: 'duration_filter', trigger: `Duration: ${item.duration}s > Max: ${max}s | Raw: "${item.raw.duration}"` };
        }

        return null;
    }

    public getFilterPlaylist(item: LazyVideoData): FilterDetail | null {
        if (!this.config.get('RULE_ENABLES').recommended_playlists || !item.isPlaylist) return null;
        if (item.isUserPlaylist) return null;
        return { reason: 'recommended_playlists', trigger: 'Detected as algorithmic Mix/Playlist' };
    }

    public applyWhitelistDecision(item: LazyVideoData, detail: FilterDetail): WhitelistReason | null {
        const priorities = this.config.get('RULE_PRIORITIES');
        const scope = getWhitelistScope(detail.reason);

        // 訂閱頻道保護：自動赦免非強規則的過濾
        if (scope !== 'none' && !isStrongRule(detail.reason, priorities)) {
            if (this.subManager.isSubscribed(item.channel)) {
                Logger.info(`✅ Keep [Protected by Subscription]: ${item.channel} | ${item.title}
(Originally Triggered: ${detail.reason})`);
                return 'channel_whitelist';
            }
        }

        if (scope === 'members') {
            const compiledMembers = this.config.get('compiledMembersWhitelist');
            if (compiledMembers && compiledMembers.some(rx => rx.test(item.channel))) {
                Logger.info(`✅ Keep [Saved by Members Whitelist]: ${item.channel} | ${item.title}`);
                return 'channel_whitelist';
            }
            return null;
        }

        if (scope === 'none' || isStrongRule(detail.reason, priorities)) return null;

        const whitelistReason = this.checkWhitelist(item);
        if (!whitelistReason) return null;

        const savedBy = whitelistReason === 'channel_whitelist' ? 'Channel' : 'Keyword';
        const trigger = detail.trigger ? ` [${detail.trigger}]` : '';
        const ruleInfo = detail.rule ? ` {Rule: ${detail.rule}}` : '';
        Logger.info(`✅ Keep [Saved by ${savedBy} Whitelist]: ${item.channel} | ${item.title}
(Originally Triggered: ${detail.reason}${trigger}${ruleInfo})`);

        return whitelistReason;
    }

    private getStrongRuleMatch(item: LazyVideoData): FilterDetail | null {
        if (this.config.get('RULE_ENABLES').shorts_item && item.isShorts) {
            return { reason: 'shorts_item_js', trigger: 'Shorts video detected' };
        }
        if (this.config.get('RULE_ENABLES').members_only && item.isMembers) {
            return { reason: 'members_only_js' };
        }

        return null;
    }
}
