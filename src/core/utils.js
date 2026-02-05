/* global OpenCC */
import { I18N } from '../ui/i18n.js';

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

        // Fast fail for view type if it looks like a date
        if (type === 'view' && RX_TIME_AGO_CHECK.test(text)) return null;

        const clean = text.replace(/,/g, '').trim();
        const match = clean.match(RX_NUMERIC);
        if (!match) return null;

        let num = parseFloat(match[1]);
        const unit = match[2]?.toLowerCase();

        if (unit && MULTIPLIERS[unit]) {
            num *= MULTIPLIERS[unit];
        }

        return Math.floor(num);
    },

    parseDuration: (text) => {
        if (!text) return null;
        const parts = text.trim().split(':').map(Number);
        if (parts.some(isNaN)) return null;
        // 處理 "MM:SS" 或 "HH:MM:SS"
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        // 處理純秒數 (雖然 YouTube 目前少見)
        if (parts.length === 1) return parts[0];
        return null;
    },

    parseTimeAgo: (text) => {
        if (!text) return null;

        // 0 seconds check
        if (RX_ZERO_TIME.test(text)) return 0;

        const match = text.match(RX_TIME_AGO_PARSE);
        if (!match) return null;

        const val = parseFloat(match[1]);
        const unitStr = match[2].toLowerCase();

        // Check exact match first
        if (TIME_UNIT_KEYS[unitStr]) return val * TIME_UNIT_KEYS[unitStr];

        // Fallback for partial matches (e.g. "minutes" -> "minute")
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

    // 初始化 OpenCC 轉換器 (懶載入)
    _initOpenCC: () => {
        if (Utils._openccToSimp) return true;
        if (typeof OpenCC === 'undefined') return false;
        try {
            Utils._openccToSimp = OpenCC.Converter({ from: 'tw', to: 'cn' });
            Utils._openccToTrad = OpenCC.Converter({ from: 'cn', to: 'tw' });
            return true;
        } catch (e) {
            console.warn('[YT Cleaner] OpenCC init failed');
            return false;
        }
    },

    toSimplified: (str) => {
        if (!str) return '';
        if (Utils._initOpenCC()) {
            try { return Utils._openccToSimp(str); } catch (e) { /* fallback */ }
        }
        return str;
    },

    generateCnRegex: (text, exact = false) => {
        // ... (existing)
    },

    /**
     * 清洗頻道名稱，從 I18N 字典中彙整所有語言的噪音字串並移除
     */
    cleanChannelName: (name) => {
        if (!name) return '';
        
        // 1. 移除 Unicode 不可見字元與特殊空格 (如 ZWSP, NBSP)
        let clean = name.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ');
        
        // 懶載入並編譯全語系清理正則
        if (!Utils._channelCleanerRX) {
            const prefixes = [];
            const suffixes = [];
            
            for (const lang in I18N.strings) {
                const data = I18N.strings[lang];
                if (data.channel_prefixes) prefixes.push(...data.channel_prefixes);
                if (data.channel_suffixes) suffixes.push(...data.channel_suffixes);
            }

            const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const prePattern = prefixes.length > 0 ? `^(${prefixes.map(esc).join('|')})` : '';
            const sufPattern = suffixes.length > 0 ? `(${suffixes.map(esc).join('|')})$` : '';
            
            Utils._channelCleanerRX = {
                prefix: prePattern ? new RegExp(prePattern, 'i') : null,
                suffix: sufPattern ? new RegExp(sufPattern, 'i') : null
            };
        }

        if (Utils._channelCleanerRX.prefix) clean = clean.replace(Utils._channelCleanerRX.prefix, '');
        if (Utils._channelCleanerRX.suffix) clean = clean.replace(Utils._channelCleanerRX.suffix, '');
        
        // 2. 移除剩餘的引號與點綴字元
        clean = clean.replace(/[「」『』""'']/g, '');
        
        return clean.replace(/·.*$/, '').trim();
    }
};
