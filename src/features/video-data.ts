import { Utils } from '../core/utils';
import { SELECTORS } from '../data/selectors';
import { I18N } from '../ui/i18n';

export class LazyVideoData {
    public el: HTMLElement;
    private _title: string | null = null;
    private _channel: string | null = null;
    private _url: string | undefined = undefined;
    private _viewCount: number | null | undefined = undefined;
    private _liveViewers: number | null | undefined = undefined;
    private _timeAgo: number | null | undefined = undefined;
    private _duration: number | null | undefined = undefined;
    private _isShorts: boolean | undefined = undefined;
    private _isMembers: boolean | undefined = undefined;
    private _isUserPlaylist: boolean | undefined = undefined;
    private _isPlaylist: boolean | undefined = undefined;
    public raw = { views: '', time: '', duration: '', viewers: '' };

    constructor(element: HTMLElement) {
        this.el = element;
    }

    get title(): string {
        if (this._title === null) {
            const el = this.el.querySelector<HTMLElement>(SELECTORS.METADATA.TITLE);
            this._title = el?.title?.trim() || el?.textContent?.trim() || '';

            if (!this._title) {
                for (const sel of SELECTORS.METADATA.TITLE_LINKS) {
                    const link = this.el.querySelector<HTMLElement>(sel);
                    const text = link?.getAttribute('title')?.trim() || link?.ariaLabel?.trim() || link?.textContent?.trim() || '';
                    if (text) {
                        this._title = text;
                        break;
                    }
                }
            }
        }

        return this._title;
    }

    get channel(): string {
        if (this._channel === null) {
            let rawName = '';
            const el = this.el.querySelector<HTMLElement>(SELECTORS.METADATA.CHANNEL);

            if (el) {
                if (el.tagName === 'YT-DECORATED-AVATAR-VIEW-MODEL') {
                    const avatarBtn = el.querySelector<HTMLElement>('[aria-label]');
                    rawName = avatarBtn?.getAttribute('aria-label') || '';
                } else {
                    rawName = el.getAttribute('aria-label') || el.textContent?.trim() || '';
                }
            }

            this._channel = Utils.cleanChannelName(rawName);
        }

        return this._channel;
    }

    get url(): string {
        if (this._url === undefined) {
            const anchor = this.el.querySelector<HTMLAnchorElement>(SELECTORS.LINK_CANDIDATES.join(', ')) ||
                this.el.querySelector<HTMLAnchorElement>('a[href*="/watch?"], a[href*="/shorts/"]');
            this._url = anchor ? anchor.href : '';
        }

        return this._url;
    }

    private _parseMetadata(): void {
        if (this._viewCount !== undefined) return;

        const texts = Array.from(this.el.querySelectorAll(SELECTORS.METADATA.TEXT));
        let aria = '';

        for (const sel of SELECTORS.METADATA.TITLE_LINKS) {
            const el = this.el.querySelector<HTMLElement>(`:scope ${sel}`);
            if (el?.ariaLabel) {
                aria = el.ariaLabel;
                break;
            }
        }

        if (texts.length === 0 && aria) {
            this.raw.views = aria;
            this._viewCount = Utils.parseNumeric(aria, 'view');
            this._liveViewers = Utils.parseLiveViewers(aria);
            this._timeAgo = Utils.parseTimeAgo(aria);
            return;
        }

        this._viewCount = null;
        this._liveViewers = null;
        this._timeAgo = null;

        const patterns = I18N.filterPatterns[I18N.lang];

        for (const t of texts) {
            const text = t.textContent || '';
            const isLive = patterns.live.test(text);
            const isView = patterns.views.test(text);
            const isAgo = patterns.ago.test(text);

            if (this._liveViewers === null && isLive) {
                this.raw.viewers = text;
                this._liveViewers = Utils.parseLiveViewers(text);
            }
            if (this._viewCount === null && isView && !isLive) {
                this.raw.views = text;
                this._viewCount = Utils.parseNumeric(text, 'view');
            }
            if (this._timeAgo === null && isAgo) {
                this.raw.time = text;
                this._timeAgo = Utils.parseTimeAgo(text);
            }
        }

        if (this._timeAgo === null) {
            for (const t of texts) {
                const text = t.textContent?.trim() || '';
                const parsed = Utils.parseTimeAgo(text);
                if (parsed !== null) {
                    this.raw.time = text;
                    this._timeAgo = parsed;
                    break;
                }
            }
        }

        if (this._viewCount === null) {
            for (const t of texts) {
                const text = t.textContent?.trim() || '';
                if (!text || patterns.ago.test(text) || patterns.live.test(text) || text === this.channel) continue;

                const parsed = Utils.parseNumeric(text, 'view');
                if (parsed !== null) {
                    this.raw.views = text;
                    this._viewCount = parsed;
                    break;
                }
            }
        }
    }

    get viewCount(): number | null { this._parseMetadata(); return this._viewCount!; }
    get liveViewers(): number | null { this._parseMetadata(); return this._liveViewers!; }
    get timeAgo(): number | null { this._parseMetadata(); return this._timeAgo!; }

    get duration(): number | null {
        if (this._duration === undefined) {
            const el = this.el.querySelector(SELECTORS.METADATA.DURATION);
            if (el) {
                this.raw.duration = el.textContent?.trim() || '';
                this._duration = Utils.parseDuration(this.raw.duration);
            } else {
                this._duration = null;
            }
        }

        return this._duration;
    }

    get isShorts(): boolean {
        if (this._isShorts === undefined) {
            this._isShorts = !!this.el.querySelector(SELECTORS.BADGES.SHORTS);
        }

        return this._isShorts;
    }

    get isLive(): boolean {
        return this.liveViewers !== null;
    }

    get isMembers(): boolean {
        if (this._isMembers === undefined) {
            const pattern = I18N.filterPatterns[I18N.lang]?.members_only || /Members only/i;
            this._isMembers = !!this.el.querySelector(SELECTORS.BADGES.MEMBERS) || pattern.test(this.el.innerText);
        }

        return this._isMembers;
    }

    get isUserPlaylist(): boolean {
        if (this._isUserPlaylist === undefined) {
            const link = this.el.querySelector<HTMLAnchorElement>('a[href*="list="]');
            if (link && /list=(LL|WL|FL)/.test(link.href)) {
                this._isUserPlaylist = true;
            } else {
                const texts = Array.from(this.el.querySelectorAll(SELECTORS.METADATA.TEXT));
                const ownershipKeywords = /Private|Unlisted|Public|私人|不公開|不公开|公開|公开/i;
                this._isUserPlaylist = texts.some(t => ownershipKeywords.test(t.textContent || ''));
            }
        }

        return this._isUserPlaylist;
    }

    get isPlaylist(): boolean {
        if (this._isPlaylist === undefined) {
            const link = this.el.querySelector('a[href^="/playlist?list="], [content-id^="PL"]');
            if (link || this.el.querySelector(SELECTORS.BADGES.MIX)) {
                this._isPlaylist = true;
                return true;
            }

            const title = this.title;
            const pattern = I18N.filterPatterns[I18N.lang]?.playlist || /Mix/i;
            this._isPlaylist = !!(title && pattern.test(title));
        }

        return this._isPlaylist;
    }
}
