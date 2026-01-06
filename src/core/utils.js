import { MAP_TC, MAP_SC } from '../data/chinese-map.js';

// --- 2. Core: Utilities (Enhanced i18n Support) ---
export const Utils = {
    debounce: (func, delay) => {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => func(...args), delay); };
    },

    // 國際化數字解析 (支援多語言)
    parseNumeric: (text, type = 'any') => {
        if (!text) return null;
        const clean = text.replace(/,/g, '').toLowerCase().trim();

        // 排除時間字串
        if (type === 'view' && /(ago|前|hour|minute|day|week|month|year|秒|分|時|天|週|月|年|時間|전|日|ヶ月|年前)/.test(clean)) return null;

        // 支援各種語言的數字單位
        const match = clean.match(/([\d.]+)\s*([kmb千萬万億亿]|천|만|억|lakh|crore)?/i);
        if (!match) return null;

        let num = parseFloat(match[1]);
        const unit = match[2]?.toLowerCase();
        if (unit) {
            const unitMap = {
                // 英文
                'k': 1e3, 'm': 1e6, 'b': 1e9,
                // 繁體中文
                '千': 1e3, '萬': 1e4, '億': 1e8,
                // 簡體中文
                '万': 1e4, '亿': 1e8,
                // 日文 (同中文)
                // 韓文
                '천': 1e3, '만': 1e4, '억': 1e8,
                // 印度
                'lakh': 1e5, 'crore': 1e7
            };
            num *= (unitMap[unit] || 1);
        }
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

    // 國際化時間解析 (支援多語言)
    parseTimeAgo: (text) => {
        if (!text) return null;
        const raw = text.toLowerCase();

        // 秒
        if (/second|秒|초|วินาที/.test(raw)) return 0;

        const match = raw.match(/(\d+)/);
        if (!match) return null;
        const val = parseInt(match[1], 10);

        // 分鐘
        if (/minute|分鐘|分钟|分|분|นาที/.test(raw)) return val;
        // 小時
        if (/hour|小時|小时|時間|시간|ชั่วโมง/.test(raw)) return val * 60;
        // 天
        if (/day|天|日|일|วัน/.test(raw)) return val * 1440;
        // 週
        if (/week|週|周|주|สัปดาห์/.test(raw)) return val * 10080;
        // 月
        if (/month|月|ヶ月|개월|เดือน/.test(raw)) return val * 43200;
        // 年
        if (/year|年|년|ปี/.test(raw)) return val * 525600;

        return null;
    },

    // 解析直播觀看數 (支援「正在觀看」「觀眾」等關鍵字)
    parseLiveViewers: (text) => {
        if (!text) return null;
        const liveKeywords = /(正在觀看|觀眾|watching|viewers)/i;
        if (!liveKeywords.test(text)) return null;
        return Utils.parseNumeric(text, 'any');
    },

    // 從 aria-label 提取觀看數資訊
    extractAriaTextForCounts: (container) => {
        const a1 = container.querySelector(':scope a#video-title-link[aria-label]');
        if (a1?.ariaLabel) return a1.ariaLabel;
        const a2 = container.querySelector(':scope a#thumbnail[aria-label]');
        if (a2?.ariaLabel) return a2.ariaLabel;
        return '';
    },

    // 輕量級繁簡轉換 (繁 -> 簡)
    // 包含最常用的 2500+ 對照字，使用 Lazy Map 加速查詢
    toSimplified: (str) => {
        if (!str) return '';

        // 優先使用外部大字典 (若載入成功)
        if (window.chineseConv && typeof window.chineseConv.sify === 'function') {
            return window.chineseConv.sify(str);
        }

        // Lazy Initialization (只在第一次需要時建立 Map)
        if (!Utils._conversionMap) {
            Utils._conversionMap = new Map();
            for (let i = 0; i < MAP_TC.length; i++) {
                Utils._conversionMap.set(MAP_TC[i], MAP_SC[i]);
            }
        }

        let res = '';
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const mapped = Utils._conversionMap.get(char);
            res += mapped || char;
        }
        return res;
    },

    // 產生繁簡體雙向支援的正則表達式
    // text: "预告" -> regex: /(预|預)(告|告)/i
    generateCnRegex: (text) => {
         if (!text) return null;

         // 建構變體 Map (Lazy Init)
         if (!Utils._variantMap) {
             Utils._variantMap = new Map();
             for (let i = 0; i < MAP_TC.length; i++) {
                 const t = MAP_TC[i];
                 const s = MAP_SC[i];
                 if (t !== s) {
                     Utils._variantMap.set(t, s);
                     Utils._variantMap.set(s, t);
                 }
             }
         }

         // 跳脫正則特殊字元
         const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
         let pattern = '';

         for (let i = 0; i < escaped.length; i++) {
             const char = escaped[i];
             // 因為前面已經 escape 過，這裡只處理一般中文字元
             if (Utils._variantMap.has(char)) {
                 const variant = Utils._variantMap.get(char);
                 pattern += `[${char}${variant}]`;
             } else {
                 pattern += char;
             }
         }

         try {
             return new RegExp(pattern, 'i');
         } catch (e) {
             console.error('Regex gen failed', e);
             return null;
         }
    }
};
