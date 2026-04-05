export interface FilterDetail {
    reason: string;
    trigger?: string;
    rule?: string;
}

export type WhitelistReason = 'channel_whitelist' | 'keyword_whitelist';
