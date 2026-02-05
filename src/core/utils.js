/* global OpenCC */
import { CLEANING_RULES } from './constants.js';

// --- 常數定義 ---
const TIME_UNITS = {
    MINUTE: 1,
    HOUR: 60,
    DAY: 1440,
    WEEK: 10080,
    MONTH: 43200,
    YEAR: 525600
};

const MULTIPLIERS = {
    'k': 1e3, 'm': 1e6, 'b': 1e9,
    'K': 1e3, 'M': 1e6, 'B': 1e9,
    '千': 1e3, '萬': 1e4, '億': 1e8,
    '万': 1e4, '亿': 1e8
};

// Pre-compiled regexes
const RX_NUMERIC = /([\d.]+)\s*([kmb千萬万億亿])?/i;
const RX_TIME_AGO_CHECK = /(ago|前|hour|minute|day|week|month|year|秒|分|時|天|週|月|年)/i;
const RX_TIME_AGO_PARSE = /([\d.]+)\s*(second|minute|min|hour|hr|day|week|month|year|秒|分|小時|時|天|日|週|周|月|年)s?/i;
const RX_ZERO_TIME = /second|秒/i;

const TIME_UNIT_KEYS = {
    'minute': TIME_UNITS.MINUTE, 'min': TIME_UNITS.MINUTE, '分': TIME_UNITS.MINUTE,
    'hour': TIME_UNITS.HOUR, 'hr': TIME_UNITS.HOUR, '時': TIME_UNITS.HOUR, '小時': TIME_UNITS.HOUR,
    'day': TIME_UNITS.DAY, '天': TIME_UNITS.DAY, '日': TIME_UNITS.DAY,
    'week': TIME_UNITS.WEEK, '週': TIME_UNITS.WEEK, '周': TIME_UNITS.WEEK,
    'month': TIME_UNITS.MONTH, '月': TIME_UNITS.MONTH,
    'year': TIME_UNITS.YEAR, '年': TIME_UNITS.YEAR
};

// --- 工具函式 ---
export const Utils = {
    // 快取 OpenCC 轉換器
    _openccToSimp: null,
    _openccToTrad: null,
    _channelCleanerRX: null,

    debounce: (func, delay) => {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => func(...args), delay); };
    },

    throttle: (func, limit) => {
        let inThrottle;
        return function(...args) {
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    parseNumeric: (text, type = 'any') => {
        if (!text) return null;
        if (type === 'view' && RX_TIME_AGO_CHECK.test(text)) return null;

        const clean = text.replace(/,/g, '').trim();
        const match = clean.match(RX_NUMERIC);
        if (!match) return null;

        let num = parseFloat(match[1]);
        const unit = match[2]; // 不使用 toLowerCase 以支援原件比對，雖然 MULTIPLIERS 有處理

        if (unit && MULTIPLIERS[unit]) {
            num *= MULTIPLIERS[unit];
        } else if (unit && MULTIPLIERS[unit.toLowerCase()]) {
            num *= MULTIPLIERS[unit.toLowerCase()];
        }

        return Math.floor(num);
    },

    parseDuration: (text) => {
        if (!text) return null;
        const parts = text.trim().split(':').map(Number);
        if (parts.some(isNaN)) return null;
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 1) return parts[0];
        return null;
    },

    parseTimeAgo: (text) => {
        if (!text) return null;
        if (RX_ZERO_TIME.test(text)) return 0;
        const match = text.match(RX_TIME_AGO_PARSE);
        if (!match) return null;
        const val = parseFloat(match[1]);
        const unitStr = match[2].toLowerCase();
        if (TIME_UNIT_KEYS[unitStr]) return val * TIME_UNIT_KEYS[unitStr];
        for (const [key, multiplier] of Object.entries(TIME_UNIT_KEYS)) {
            if (unitStr.includes(key)) return val * multiplier;
        }
        return null;
    },

    parseLiveViewers: (text) => {
        if (!text) return null;
        if (!/(正在觀看|觀眾|watching|viewers)/i.test(text)) return null;
        return Utils.parseNumeric(text, 'any');
    },

    _initOpenCC: () => {
        if (Utils._openccToSimp) return true;
        if (typeof OpenCC === 'undefined') return false;
        try {
            Utils._openccToSimp = OpenCC.Converter({ from: 'tw', to: 'cn' });
            Utils._openccToTrad = OpenCC.Converter({ from: 'cn', to: 'tw' });
            return true;
        } catch (e) {
            return false;
        }
    },

    escapeRegex: (s) => {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    generateCnRegex: (text, exact = false) => {
        if (!text) return null;
        const escape = Utils.escapeRegex;
        const wrap = s => exact ? `^${s}$` : s;

        if (Utils._initOpenCC()) {
            try {
                const simp = Utils._openccToSimp(text);
                const trad = Utils._openccToTrad(text);
                const escSimp = escape(simp);
                const escTrad = escape(trad);
                if (escSimp === escTrad) return new RegExp(wrap(escSimp), 'i');
                return new RegExp(wrap(`(?:${escSimp}|${escTrad})`), 'i');
            } catch (e) { /* fallback */ }
        }

        try {
            return new RegExp(wrap(escape(text)), 'i');
        } catch (e) {
            return null;
        }
    },

    cleanChannelName: (name) => {
        if (!name) return '';
        let clean = name.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ');
        if (!Utils._channelCleanerRX) {
            const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const prePattern = `^(${CLEANING_RULES.PREFIXES.map(esc).join('|')})`;
            const sufPattern = `(${CLEANING_RULES.SUFFIXES.map(esc).join('|')})$`;
            Utils._channelCleanerRX = {
                prefix: new RegExp(prePattern, 'i'),
                suffix: new RegExp(sufPattern, 'i')
            };
        }
        clean = clean.replace(Utils._channelCleanerRX.prefix, '');
        clean = clean.replace(Utils._channelCleanerRX.suffix, '');
        clean = clean.replace(/[「」『』"''（）()]/g, '');
        return clean.replace(/·.*$/, '').trim();
    }
};