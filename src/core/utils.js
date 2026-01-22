/* global OpenCC */

// --- 常數定義 ---
const TIME_UNITS = {
    MINUTE: 1,
    HOUR: 60,
    DAY: 1440,
    WEEK: 10080,
    MONTH: 43200,
    YEAR: 525600
};

const UNIT_MAP = {
    'k': 1e3, 'm': 1e6, 'b': 1e9,
    '千': 1e3, '萬': 1e4, '億': 1e8,
    '万': 1e4, '亿': 1e8
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

    parseNumeric: (text, type = 'any') => {
        if (!text) return null;
        const clean = text.replace(/,/g, '').toLowerCase().trim();

        // 排除時間字串
        if (type === 'view' && /(ago|前|hour|minute|day|week|month|year|秒|分|時|天|週|月|年)/.test(clean)) return null;

        const match = clean.match(/([\d.]+)\s*([kmb千萬万億亿])?/i);
        if (!match) return null;

        let num = parseFloat(match[1]);
        const unit = match[2]?.toLowerCase();
        if (unit && UNIT_MAP[unit]) num *= UNIT_MAP[unit];

        return Math.floor(num);
    },

    parseDuration: (text) => {
        if (!text) return null;
        const parts = text.trim().split(':').map(Number);
        if (parts.some(isNaN)) return null;
        return parts.length === 3
            ? parts[0] * 3600 + parts[1] * 60 + parts[2]
            : (parts.length === 2 ? parts[0] * 60 + parts[1] : null);
    },

    parseTimeAgo: (text) => {
        if (!text) return null;
        const raw = text.toLowerCase();
        if (/second|秒/.test(raw)) return 0;

        const match = raw.match(/(\d+)/);
        if (!match) return null;
        const val = parseInt(match[1], 10);

        if (/minute|分/.test(raw)) return val * TIME_UNITS.MINUTE;
        if (/hour|小時|時/.test(raw)) return val * TIME_UNITS.HOUR;
        if (/day|天|日/.test(raw)) return val * TIME_UNITS.DAY;
        if (/week|週|周/.test(raw)) return val * TIME_UNITS.WEEK;
        if (/month|月/.test(raw)) return val * TIME_UNITS.MONTH;
        if (/year|年/.test(raw)) return val * TIME_UNITS.YEAR;

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

    generateCnRegex: (text) => {
        if (!text) return null;
        const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        if (Utils._initOpenCC()) {
            const simp = Utils._openccToSimp(text);
            const trad = Utils._openccToTrad(text);
            const escSimp = escape(simp);
            const escTrad = escape(trad);

            try {
                return escSimp === escTrad
                    ? new RegExp(escSimp, 'i')
                    : new RegExp(`(?:${escSimp}|${escTrad})`, 'i');
            } catch (e) {
                return null;
            }
        }

        try {
            return new RegExp(escape(text), 'i');
        } catch (e) {
            return null;
        }
    }
};
