import type { SupportedLang } from '../ui/i18n';

export const FILTER_PATTERNS: Record<SupportedLang, Record<string, RegExp>> = {
    'zh-TW': {
        members_only: /頻道會員專屬|會員搶先看/i,
        shorts: /Shorts/i,
        live: /正在觀看|觀眾/i,
        views: /view|觀看|次/i,
        ago: /ago|前/i,
        playlist: /合輯|Mix/i,
        movies: /電影|Movies/i,
        fundraiser: /募款/i
    },
    'zh-CN': {
        members_only: /会员专属|会员抢先看/i,
        shorts: /Shorts/i,
        live: /正在观看|观众/i,
        views: /view|观看|次/i,
        ago: /ago|前/i,
        playlist: /合辑|Mix/i,
        movies: /电影|Movies/i,
        fundraiser: /募款/i
    },
    'en': {
        members_only: /Members only|Early access/i,
        shorts: /Shorts/i,
        live: /watching|viewers/i,
        views: /view/i,
        ago: /ago/i,
        playlist: /Mix/i,
        movies: /Movies/i,
        fundraiser: /Fundraiser/i
    },
    'ja': {
        members_only: /メンバー限定|先行公開/i,
        shorts: /Shorts/i,
        live: /視聴中|視聴者/i,
        views: /視聴|回/i,
        ago: /前/i,
        playlist: /ミックス/i,
        movies: /映画|Movies/i,
        fundraiser: /募金/i
    }
};
