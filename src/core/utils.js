/* global OpenCC */
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

    // 繁簡轉換：使用 OpenCC-JS（需透過 @require 載入）
    toSimplified: (str) => {
        if (!str) return '';

        // 使用 opencc-js
        if (!Utils._openccConverter && typeof OpenCC !== 'undefined') {
            try {
                Utils._openccConverter = OpenCC.Converter({ from: 'tw', to: 'cn' });
            } catch (e) {
                console.warn('[YT Cleaner] OpenCC init failed');
            }
        }
        if (Utils._openccConverter) {
            try {
                return Utils._openccConverter(str);
            } catch (e) { /* return original */ }
        }

        // 若 OpenCC 不可用，回傳原字串
        return str;
    },

    // 產生繁簡體雙向支援的正則表達式
    // 使用 OpenCC 進行雙向轉換
    generateCnRegex: (text) => {
         if (!text) return null;

         // 初始化 OpenCC 轉換器
         if (typeof OpenCC !== 'undefined') {
             if (!Utils._openccToSimp) {
                 try {
                     Utils._openccToSimp = OpenCC.Converter({ from: 'tw', to: 'cn' });
                     Utils._openccToTrad = OpenCC.Converter({ from: 'cn', to: 'tw' });
                 } catch (e) {
                     console.warn('[YT Cleaner] OpenCC regex init failed');
                 }
             }
         }

         // 若 OpenCC 可用，生成繁簡雙向正則
         if (Utils._openccToSimp && Utils._openccToTrad) {
             const simplified = Utils._openccToSimp(text);
             const traditional = Utils._openccToTrad(text);

             // 跳脫正則特殊字元
             const escSimp = simplified.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
             const escTrad = traditional.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

             // 如果繁簡相同，直接回傳
             if (escSimp === escTrad) {
                 try {
                     return new RegExp(escSimp, 'i');
                 } catch (e) {
                     return null;
                 }
             }

             // 建立匹配繁體或簡體的 pattern
             try {
                 return new RegExp(`(?:${escSimp}|${escTrad})`, 'i');
             } catch (e) {
                 console.error('Regex gen failed', e);
                 return null;
             }
         }

         // Fallback: 直接使用原文
         const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
         try {
             return new RegExp(escaped, 'i');
         } catch (e) {
             return null;
         }
    }
};
