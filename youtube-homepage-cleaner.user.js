// ==UserScript==
// @name        YouTube Cleaner - Remove Garbage & Suggestions
// @description Clean YouTube interface by hiding garbage Shorts, suggestions, and clutter elements. Say goodbye to clickbait!
// @namespace   http://tampermonkey.net/
// @version     2.1.0
// @author      Benny & AI Collaborators
// @match       https://www.youtube.com/*
// @exclude     https://www.youtube.com/embed/*
// @require     https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.js
// @run-at      document-start
// @license     MIT
// @icon        https://raw.githubusercontent.com/bennytsai1234/YouTube-Cleaner/main/assets/icon.png
// @downloadURL https://raw.githubusercontent.com/bennytsai1234/YouTube-Cleaner/main/youtube-homepage-cleaner.user.js
// @updateURL   https://raw.githubusercontent.com/bennytsai1234/YouTube-Cleaner/main/youtube-homepage-cleaner.user.js
// @grant       GM_info
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_setClipboard
// @grant       GM_registerMenuCommand
// @grant       GM_unregisterMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    const CLEANING_RULES = {
        PREFIXES: [
            '前往頻道：', '前往频道：', 'Go to channel:', 'チャンネルへ移動:',
            '輕觸即可觀看「', 'Tap to watch 「', 'タップして「', '前往頻道：'
        ],
        SUFFIXES: [
            '」頻道的直播', " 's live stream", '」のライブ配信', '」のライブ配信を視聴',
            '的頻道', '的频道', "'s channel", '」'
        ]
    };

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
    const Utils = {
        _openccToSimp: null,
        _openccToTrad: null,
        _channelCleanerRX: null,
        debounce(func, delay) {
            let t;
            return (...args) => {
                clearTimeout(t);
                t = setTimeout(() => func(...args), delay);
            };
        },
        throttle(func, limit) {
            let inThrottle;
            return function (...args) {
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },
        parseNumeric: (text, type = 'any') => {
            if (!text)
                return null;
            if (type === 'view' && RX_TIME_AGO_CHECK.test(text))
                return null;
            const clean = text.replace(/,/g, '').trim();
            const match = clean.match(RX_NUMERIC);
            if (!match)
                return null;
            let num = parseFloat(match[1]);
            const unit = match[2];
            if (unit && MULTIPLIERS[unit]) {
                num *= MULTIPLIERS[unit];
            }
            else if (unit && MULTIPLIERS[unit.toLowerCase()]) {
                num *= MULTIPLIERS[unit.toLowerCase()];
            }
            return Math.floor(num);
        },
        parseDuration: (text) => {
            if (!text)
                return null;
            const parts = text.trim().split(':').map(Number);
            if (parts.some(isNaN))
                return null;
            if (parts.length === 3)
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            if (parts.length === 2)
                return parts[0] * 60 + parts[1];
            if (parts.length === 1)
                return parts[0];
            return null;
        },
        parseTimeAgo: (text) => {
            if (!text)
                return null;
            if (RX_ZERO_TIME.test(text))
                return 0;
            const match = text.match(RX_TIME_AGO_PARSE);
            if (!match)
                return null;
            const val = parseFloat(match[1]);
            const unitStr = match[2].toLowerCase();
            if (TIME_UNIT_KEYS[unitStr])
                return val * TIME_UNIT_KEYS[unitStr];
            for (const [key, multiplier] of Object.entries(TIME_UNIT_KEYS)) {
                if (unitStr.includes(key))
                    return val * multiplier;
            }
            return null;
        },
        parseLiveViewers: (text) => {
            if (!text)
                return null;
            if (!/(正在觀看|觀眾|watching|viewers)/i.test(text))
                return null;
            return Utils.parseNumeric(text, 'any');
        },
        _initOpenCC: () => {
            if (Utils._openccToSimp)
                return true;
            if (typeof OpenCC === 'undefined')
                return false;
            try {
                Utils._openccToSimp = OpenCC.Converter({ from: 'tw', to: 'cn' });
                Utils._openccToTrad = OpenCC.Converter({ from: 'cn', to: 'tw' });
                return true;
            }
            catch {
                return false;
            }
        },
        escapeRegex: (s) => {
            return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        },
        generateCnRegex: (text, exact = false) => {
            if (!text)
                return null;
            const escape = Utils.escapeRegex;
            const wrap = (s) => exact ? `^${s}$` : s;
            if (Utils._initOpenCC()) {
                try {
                    const simp = Utils._openccToSimp(text);
                    const trad = Utils._openccToTrad(text);
                    const escSimp = escape(simp);
                    const escTrad = escape(trad);
                    if (escSimp === escTrad)
                        return new RegExp(wrap(escSimp), 'i');
                    return new RegExp(wrap(`(?:${escSimp}|${escTrad})`), 'i');
                }
                catch {  }
            }
            try {
                return new RegExp(wrap(escape(text)), 'i');
            }
            catch {
                return null;
            }
        },
        cleanChannelName: (name) => {
            if (!name)
                return '';
            let clean = name.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ');
            if (!Utils._channelCleanerRX) {
                const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    const I18N = {
        _lang: null,
        strings: {
            'zh-TW': {
                title: 'YouTube 淨化大師',
                menu_rules: '📂 設定過濾規則',
                menu_low_view: '低觀看數過濾 (含直播)',
                menu_threshold: '🔢 設定閾值',
                menu_grace: '⏳ 設定豁免期',
                menu_content: '🎥 過濾功能設定',
                menu_lists: '🛡️ 黑/白名單管理',
                menu_ux: '🖱️ 介面與體驗',
                menu_system: '📊 系統與工具',
                menu_whitelist: '🛡️ 管理白名單',
                menu_new_tab: '強制新分頁 (影片)',
                menu_notification_new_tab: '強制新分頁 (通知)',
                menu_debug: 'Debug',
                menu_reset: '🔄 恢復預設',
                menu_stats: '📊 過濾統計',
                menu_export: '💾 匯出/匯入設定',
                menu_lang: '🌐 語言',
                menu_input: '輸入選項:',
                stats_title: '【 過濾統計 】',
                stats_empty: '尚未過濾任何內容',
                stats_filtered: '已過濾 {0} 個項目',
                export_title: '【 設定管理 】',
                export_export: '📤 匯出設定',
                export_import: '📥 匯入設定',
                export_success: '✅ 設定已複製到剪貼簿！',
                export_copy: '請複製以下設定 (Ctrl+C):',
                import_prompt: '請貼上設定 JSON:',
                import_success: '✅ 設定已成功匯入！',
                import_fail: '❌ 匯入失敗: ',
                rules_title: '【 過濾規則 】',
                rules_back: '(0 返回)',
                threshold_prompt: '請輸入「觀看數閾值」 (低於此數將被過濾):',
                grace_prompt: '請輸入「豁免時間 (小時)」 (設為 0 則不豁免):',
                adv_exact_prompt: '是否需精準匹配頻道名稱？ (1. 是 / 2. 否)\n\n※精準匹配：必須完全一致\n※模糊匹配：包含關鍵字即可',
                reset_confirm: '重設?',
                lang_title: '【 選擇語言 】',
                back: '返回',
                adv_keyword_filter: '關鍵字過濾',
                adv_keyword_list: '🚫 關鍵字黑名單',
                adv_channel_filter: '頻道過濾',
                adv_channel_list: '🚫 頻道黑名單',
                adv_channel_whitelist: '🛡️ 頻道白名單 (常規影片)',
                adv_members_whitelist: '🛡️ 會員白名單 (專屬影片)',
                adv_keyword_whitelist: '🛡️ 關鍵字白名單',
                adv_section_filter: '欄位過濾',
                adv_section_list: '🚫 欄位標題黑名單',
                adv_duration_filter: '長度過濾',
                adv_duration_set: '⏱️ 設定長度',
                adv_min: '最短(分):',
                adv_max: '最長(分):',
                adv_add: '新增',
                adv_remove: '刪除',
                adv_clear: '🧹 清空全部',
                adv_restore: '✨ 恢復預設',
                adv_region_convert: '繁簡通用過濾',
                adv_disable_channel: '頻道頁面停止過濾 (保留內容)',
                next_page: '下一頁',
                prev_page: '上一頁',
                movies_keyword: '電影',
                fundraiser_keyword: '募款',
                menu_font_fix: '字體修正 (中文優化)'
            },
            'zh-CN': {
                title: 'YouTube 净化大师',
                menu_rules: '📂 设置过滤规则',
                menu_low_view: '低观看数过滤 (含直播)',
                menu_threshold: '🔢 设置阈值',
                menu_grace: '⏳ 设置豁免期',
                menu_content: '🎥 过滤功能设置',
                menu_lists: '🛡️ 黑/白名单管理',
                menu_ux: '🖱️ 界面與体验',
                menu_system: '📊 系统與工具',
                menu_whitelist: '🛡️ 管理白名单',
                menu_new_tab: '强制新标签页 (视频)',
                menu_notification_new_tab: '强制新标签页 (通知)',
                menu_debug: 'Debug',
                menu_reset: '🔄 恢复默认',
                menu_stats: '📊 过滤统计',
                menu_export: '💾 导出/导入设置',
                menu_lang: '🌐 语言',
                menu_input: '输入选项:',
                stats_title: '【 过滤统计 】',
                stats_empty: '尚未过滤任何内容',
                stats_filtered: '已过滤 {0} 个项目',
                export_title: '【 设置管理 】',
                export_export: '📤 导出设置',
                export_import: '📥 导入设置',
                export_success: '✅ 设置已复制到剪贴板！',
                export_copy: '请复制以下设置 (Ctrl+C):',
                import_prompt: '请粘贴设置 JSON:',
                import_success: '✅ 设置已成功导入！',
                import_fail: '❌ 导入失败: ',
                rules_title: '【 过滤规则 】',
                rules_back: '(0 返回)',
                threshold_prompt: '请输入「观看数阈值」 (低于此数将被过滤):',
                grace_prompt: '请输入「豁免时间 (小时)」 (设为 0 则不豁免):',
                adv_exact_prompt: '是否需精準匹配频道名称？ (1. 是 / 2. 否)\n\n※精準匹配：必须完全一致\n※模糊匹配：包含关键字即可',
                reset_confirm: '重置?',
                lang_title: '【 选择语言 】',
                back: '返回',
                adv_keyword_filter: '关键字过滤',
                adv_keyword_list: '🚫 关键字黑名单',
                adv_channel_filter: '频道过滤',
                adv_channel_list: '🚫 频道黑名单',
                adv_channel_whitelist: '🛡️ 频道白名单 (常规视频)',
                adv_members_whitelist: '🛡️ 会员白名单 (专属视频)',
                adv_keyword_whitelist: '🛡️ 关键字白名单',
                adv_section_filter: '栏位过滤',
                adv_section_list: '🚫 栏位标题黑名单',
                adv_duration_filter: '时长过滤',
                adv_duration_set: '⏱️ 设置时长',
                adv_min: '最短(分):',
                adv_max: '最长(分):',
                adv_add: '新增',
                adv_remove: '删除',
                adv_clear: '🧹 清空全部',
                adv_restore: '✨ 恢复默认',
                adv_region_convert: '繁简通用过滤',
                adv_disable_channel: '频道页面停止过滤 (保留内容)',
                next_page: '下一页',
                prev_page: '上一頁',
                movies_keyword: '电影',
                fundraiser_keyword: '募款',
                menu_font_fix: '字体修正 (中文优化)'
            },
            'en': {
                title: 'YouTube Cleaner',
                menu_rules: '📂 Filter Rules',
                menu_low_view: 'Low View Count Filter (Live included)',
                menu_threshold: '🔢 Set Threshold',
                menu_grace: '⏳ Set Grace Period',
                menu_content: '🎥 Filtering Settings',
                menu_lists: '🛡️ List Management',
                menu_ux: '🖱️ Interface & UX',
                menu_system: '📊 System & Tools',
                menu_whitelist: '🛡️ Manage Whitelists',
                menu_new_tab: 'Force New Tab (Video)',
                menu_notification_new_tab: 'Force New Tab (Notif)',
                menu_debug: 'Debug',
                menu_reset: '🔄 Reset to Default',
                menu_stats: '📊 Filter Stats',
                menu_export: '💾 Export/Import Settings',
                menu_lang: '🌐 Language',
                menu_input: 'Enter option:',
                stats_title: '【 Filter Statistics 】',
                stats_empty: 'No content filtered yet',
                stats_filtered: 'Filtered {0} items',
                export_title: '【 Settings Management 】',
                export_export: '📤 Export Settings',
                export_import: '📥 Import Settings',
                export_success: '✅ Settings copied to clipboard!',
                export_copy: 'Copy settings (Ctrl+C):',
                import_prompt: 'Paste settings JSON:',
                import_success: '✅ Settings imported successfully!',
                import_fail: '❌ Import failed: ',
                rules_title: '【 Filter Rules 】',
                rules_back: '(0 Back)',
                threshold_prompt: 'Enter View Threshold:',
                grace_prompt: 'Enter Grace Period (Hours) (0 to disable):',
                adv_exact_prompt: 'Use exact match for this channel? (1. Yes / 2. No)\n\n※Exact: Must be identical\n※Partial: Contains keyword',
                reset_confirm: 'Reset?',
                lang_title: '【 Select Language 】',
                back: 'Back',
                adv_keyword_filter: 'Keyword Filter',
                adv_keyword_list: '🚫 Keyword Blacklist',
                adv_channel_filter: 'Channel Filter',
                adv_channel_list: '🚫 Channel Blacklist',
                adv_channel_whitelist: '🛡️ Channel Whitelist (Regular)',
                adv_members_whitelist: '🛡️ Members Whitelist (Exclusive)',
                adv_keyword_whitelist: '🛡️ Keyword Whitelist',
                adv_section_filter: 'Section Filter',
                adv_section_list: '🚫 Section Blacklist',
                adv_duration_filter: 'Duration Filter',
                adv_duration_set: '⏱️ Set Duration',
                adv_min: 'Min (min):',
                adv_max: 'Max (min):',
                adv_add: 'Add',
                adv_remove: 'Remove',
                adv_clear: '🧹 Clear All',
                adv_restore: '✨ Restore Defaults',
                adv_region_convert: 'Region Agnostic Filter',
                adv_disable_channel: 'Disable on Channel Pages',
                next_page: 'Next Page',
                prev_page: 'Prev Page',
                movies_keyword: 'Movies',
                fundraiser_keyword: 'Fundraiser',
                menu_font_fix: 'Font Fix (CJK Optimized)'
            },
            'ja': {
                title: 'YouTube 浄化大師',
                menu_rules: '📂 フィルタールール設定',
                menu_low_view: '低視聴回數フィルター (ライブ含む)',
                menu_threshold: '🔢 閾値を設定',
                menu_grace: '⏳ 猶予期間を設定',
                menu_content: '🎥 フィルター設定',
                menu_lists: '🛡️ リスト管理',
                menu_ux: '🖱️ インターフェース設定',
                menu_system: '📊 システムとツール',
                menu_whitelist: '🛡️ ホワイトリスト管理',
                menu_new_tab: '強制新タブ (動画)',
                menu_notification_new_tab: '強制新タブ (通知)',
                menu_debug: 'デバッグ',
                menu_reset: '🔄 デフォルトに戻す',
                menu_stats: '📊 統計情報',
                menu_export: '💾 設定のエクスポート/インポート',
                menu_lang: '🌐 言語',
                menu_input: '選んでください:',
                stats_title: '【 統計情報 】',
                stats_empty: 'まだ何もフィルタリングされていません',
                stats_filtered: '{0} 個の項目をフィルタリングしました',
                export_title: '【 設定管理 】',
                export_export: '📤 設定をエクスポート',
                export_import: '📥 設定をインポート',
                export_success: '✅ 設定をクリップボードにコピーしました！',
                export_copy: '以下の設定をコピーしてください (Ctrl+C):',
                import_prompt: '設定 JSON を貼り付けてください:',
                import_success: '✅ 設定をインポートしました！',
                import_fail: '❌ インポート失敗: ',
                rules_title: '【 フィルタールール 】',
                rules_back: '(0 戻る)',
                threshold_prompt: '「視聴回數閾值」を入力してください (これ未満は非表示):',
                grace_prompt: '「猶予期間 (時間)」を入力してください (0 は猶予なし):',
                adv_exact_prompt: 'このチャンネルを完全一致で追加しますか？ (1. はい / 2. いいえ)\n\n※完全一致：名前が完全に同じ\n※部分一致：名前の一部を含む',
                reset_confirm: 'リセットしますか？',
                lang_title: '【 言語を選択 】',
                back: '戻る',
                adv_keyword_filter: 'キーワードフィルター',
                adv_keyword_list: '🚫 キーワードブラックリスト',
                adv_channel_filter: 'チャンネルフィルター',
                adv_channel_list: '🚫 チャンネルブラックリスト',
                adv_channel_whitelist: '🛡️ チャンネルホワイトリスト (通常)',
                adv_members_whitelist: '🛡️ メンバーホワイトリスト (限定)',
                adv_keyword_whitelist: '🛡️ キーワードホワイトリスト',
                adv_section_filter: 'セクションフィルター',
                adv_section_list: '🚫 セクションブラックリスト',
                adv_duration_filter: '動画の長さフィルター',
                adv_duration_set: '⏱️ 長さを設定',
                adv_min: '最短(分):',
                adv_max: '最長(分):',
                adv_add: '追加',
                adv_remove: '削除',
                adv_clear: '🧹 全てクリア',
                adv_restore: '✨ デフォルトに戻す',
                adv_region_convert: '繁體字/簡體字共通フィルター',
                adv_disable_channel: 'チャンネルページではフィルターを無効にする',
                next_page: '次へ',
                prev_page: '前へ',
                movies_keyword: '映画',
                fundraiser_keyword: '募金',
                menu_font_fix: 'フォント修正 (CJK 最適化)'
            }
        },
        filterPatterns: {
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
        },
        defaultSectionBlacklist: {
            'zh-TW': ['耳目一新', '重溫舊愛', '合輯', '最新貼文', '發燒影片', '熱門', '為您推薦', '推薦', '先前搜尋內容', '相關內容'],
            'zh-CN': ['耳目一新', '重温旧爱', '合辑', '最新贴文', '发烧影片', '热门', '为您推荐', '推荐', '先前搜索内容', '相关内容'],
            'en': ['New to you', 'Relive', 'Mixes', 'Latest posts', 'Trending', 'Recommended', 'People also watched', 'From your search', 'Related to', 'Previously watched'],
            'ja': ['おすすめ', 'ミックス', '新着', 'トレンド', 'あなたへの', '関連']
        },
        ruleNames: {
            'zh-TW': {
                ad_block_popup: '廣告阻擋彈窗',
                ad_sponsor: '廣告/贊助',
                members_only: '會員專屬',
                shorts_item: 'Shorts 項目',
                mix_only: '合輯',
                premium_banner: 'Premium 橫幅',
                news_block: '新聞區塊',
                shorts_block: 'Shorts 區塊',
                posts_block: '社群貼文',
                playables_block: '可玩內容',
                fundraiser_block: '募款活動',
                shorts_grid_shelf: 'Shorts 網格',
                movies_shelf: '電影推薦',
                youtube_featured_shelf: 'YouTube 精選',
                popular_gaming_shelf: '熱門遊戲',
                more_from_game_shelf: '更多遊戲內容',
                trending_playlist: '熱門播放清單',
                inline_survey: '問卷調查',
                clarify_box: '資訊框',
                explore_topics: '探索主題',
                recommended_playlists: '推薦播放清單',
                members_early_access: '會員搶先看'
            },
            'zh-CN': {
                ad_block_popup: '广告拦截弹窗',
                ad_sponsor: '广告/赞助',
                members_only: '会员专属',
                shorts_item: 'Shorts 项目',
                mix_only: '合辑',
                premium_banner: 'Premium 横幅',
                news_block: '新闻区块',
                shorts_block: 'Shorts 区块',
                posts_block: '社区帖子',
                playables_block: '可玩内容',
                fundraiser_block: '募款活动',
                shorts_grid_shelf: 'Shorts 网格',
                movies_shelf: '电影推荐',
                youtube_featured_shelf: 'YouTube 精选',
                popular_gaming_shelf: '热门游戏',
                more_from_game_shelf: '更多游戏内容',
                trending_playlist: '热门播放列表',
                inline_survey: '问卷调查',
                clarify_box: '信息框',
                explore_topics: '探索主题',
                recommended_playlists: '推荐播放列表',
                members_early_access: '会员抢先看'
            },
            'en': {
                ad_block_popup: 'Ad-block Popup',
                ad_sponsor: 'Ads / Sponsors',
                members_only: 'Members Only',
                shorts_item: 'Shorts Items',
                mix_only: 'Mix Playlists',
                premium_banner: 'Premium Banner',
                news_block: 'News Section',
                shorts_block: 'Shorts Section',
                posts_block: 'Community Posts',
                playables_block: 'Playables',
                fundraiser_block: 'Fundraiser',
                shorts_grid_shelf: 'Shorts Grid',
                movies_shelf: 'Movies Shelf',
                youtube_featured_shelf: 'YouTube Featured',
                popular_gaming_shelf: 'Popular Gaming',
                more_from_game_shelf: 'More from Games',
                trending_playlist: 'Trending Playlist',
                inline_survey: 'Surveys',
                clarify_box: 'Clarify Box',
                explore_topics: 'Explore Topics',
                recommended_playlists: 'Recommended Playlists',
                members_early_access: 'Members Early Access'
            },
            'ja': {
                ad_block_popup: '広告ブロックポップアップ',
                ad_sponsor: '広告/スポンサー',
                members_only: 'メンバー限定',
                shorts_item: 'Shorts 項目',
                mix_only: 'ミックスリスト',
                premium_banner: 'Premium バナー',
                news_block: 'ニュースセクション',
                shorts_block: 'Shorts セクション',
                posts_block: 'コミュニティ投稿',
                playables_block: 'プレイアブル',
                fundraiser_block: '募金活動',
                shorts_grid_shelf: 'Shorts グリッド',
                movies_shelf: '映画の推奨',
                youtube_featured_shelf: 'YouTube 特選',
                popular_gaming_shelf: '人気のゲーム',
                more_from_game_shelf: 'このゲームの関連コンテンツ',
                trending_playlist: '急上昇プレイリスト',
                inline_survey: 'アンケート',
                clarify_box: '情報パネル',
                explore_topics: 'トピックを探索',
                recommended_playlists: 'おすすめのプレイリスト',
                members_early_access: 'メンバー限定先行公開'
            }
        },
        getRuleName(ruleKey) {
            return this.ruleNames[this.lang]?.[ruleKey] || this.ruleNames['en'][ruleKey] || ruleKey;
        },
        detectLanguage() {
            const ytConfigLang = window.yt?.config_?.HL || window.ytcfg?.get?.('HL');
            const ytLang = ytConfigLang || document.documentElement.lang || navigator.language || 'zh-TW';
            if (ytLang.startsWith('zh-CN') || ytLang.startsWith('zh-Hans'))
                return 'zh-CN';
            if (ytLang.startsWith('zh'))
                return 'zh-TW';
            if (ytLang.startsWith('ja'))
                return 'ja';
            return 'en';
        },
        get lang() {
            if (!this._lang) {
                this._lang = GM_getValue('ui_language', null) || this.detectLanguage();
            }
            return this._lang;
        },
        set lang(value) {
            this._lang = value;
            GM_setValue('ui_language', value);
        },
        t(key, ...args) {
            const str = this.strings[this.lang]?.[key] || this.strings['en'][key] || key;
            return str.replace(/\{(\d+)\}/g, (_, i) => args[i] ?? '');
        },
        get availableLanguages() {
            return {
                'zh-TW': '繁體中文',
                'zh-CN': '简体中文',
                'en': 'English',
                'ja': '日本語'
            };
        }
    };

    let instance = null;
    class ConfigManager {
        defaults;
        state;
        constructor() {
            if (instance)
                return instance;
            instance = this;
            this.defaults = {
                OPEN_IN_NEW_TAB: true,
                OPEN_NOTIFICATIONS_IN_NEW_TAB: true,
                FONT_FIX: false,
                ENABLE_LOW_VIEW_FILTER: true,
                LOW_VIEW_THRESHOLD: 1000,
                DEBUG_MODE: true,
                ENABLE_REGION_CONVERT: true,
                DISABLE_FILTER_ON_CHANNEL: true,
                ENABLE_KEYWORD_FILTER: true,
                KEYWORD_BLACKLIST: [],
                ENABLE_CHANNEL_FILTER: true,
                CHANNEL_BLACKLIST: [],
                CHANNEL_WHITELIST: [],
                MEMBERS_WHITELIST: [],
                KEYWORD_WHITELIST: [],
                ENABLE_SECTION_FILTER: true,
                SECTION_TITLE_BLACKLIST: Object.values(I18N.defaultSectionBlacklist).flat(),
                ENABLE_DURATION_FILTER: true,
                DURATION_MIN: 0,
                DURATION_MAX: 0,
                GRACE_PERIOD_HOURS: 4,
                RULE_ENABLES: {
                    ad_block_popup: true, ad_sponsor: true, members_only: true, shorts_item: true,
                    mix_only: true, premium_banner: true, news_block: true, shorts_block: true,
                    posts_block: true, playables_block: true, fundraiser_block: true,
                    shorts_grid_shelf: true, movies_shelf: true,
                    youtube_featured_shelf: true, popular_gaming_shelf: true,
                    more_from_game_shelf: true, trending_playlist: true,
                    inline_survey: true, clarify_box: true, explore_topics: true,
                    recommended_playlists: true, members_early_access: true
                },
                RULE_PRIORITIES: {
                    members_only: 'strong',
                    members_only_js: 'strong',
                    shorts_item: 'strong',
                    shorts_item_js: 'strong',
                    mix_only: 'strong',
                    recommended_playlists: 'strong',
                    ad_sponsor: 'strong',
                    premium_banner: 'strong'
                }
            };
            this.state = this._load();
        }
        _compileList(list) {
            if (!Array.isArray(list))
                return [];
            return list.map(k => {
                try {
                    if (k.startsWith('=')) {
                        return Utils.generateCnRegex(k.substring(1), true) || new RegExp(`^${Utils.escapeRegex(k.substring(1))}$`, 'i');
                    }
                    return Utils.generateCnRegex(k) || new RegExp(Utils.escapeRegex(k), 'i');
                }
                catch {
                    return null;
                }
            }).filter((x) => x !== null);
        }
        _load() {
            const get = (k, d) => GM_getValue(k, d);
            const snake = (str) => str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
            const loaded = {};
            for (const key in this.defaults) {
                const configKey = key;
                if (configKey === 'RULE_ENABLES') {
                    const saved = get('ruleEnables', {});
                    loaded[configKey] = { ...this.defaults.RULE_ENABLES, ...saved };
                }
                else if (configKey === 'RULE_PRIORITIES') {
                    const saved = get('rulePriorities', {});
                    loaded[configKey] = { ...this.defaults.RULE_PRIORITIES, ...saved };
                }
                else {
                    loaded[configKey] = get(snake(key), this.defaults[configKey]);
                    if (Array.isArray(this.defaults[configKey]) && !Array.isArray(loaded[configKey])) {
                        loaded[configKey] = [...this.defaults[configKey]];
                    }
                }
            }
            loaded.compiledKeywords = this._compileList(loaded.KEYWORD_BLACKLIST);
            loaded.compiledChannels = this._compileList(loaded.CHANNEL_BLACKLIST);
            loaded.compiledChannelWhitelist = this._compileList(loaded.CHANNEL_WHITELIST);
            loaded.compiledMembersWhitelist = this._compileList(loaded.MEMBERS_WHITELIST);
            loaded.compiledKeywordWhitelist = this._compileList(loaded.KEYWORD_WHITELIST);
            loaded.compiledSectionBlacklist = this._compileList(loaded.SECTION_TITLE_BLACKLIST);
            return loaded;
        }
        get(key) {
            return this.state[key];
        }
        set(key, value) {
            this.state[key] = value;
            const snake = (str) => str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
            if (key === 'RULE_ENABLES')
                GM_setValue('ruleEnables', value);
            else if (key === 'RULE_PRIORITIES')
                GM_setValue('rulePriorities', value);
            else
                GM_setValue(snake(key), value);
            const compileMap = {
                'KEYWORD_BLACKLIST': 'compiledKeywords',
                'CHANNEL_BLACKLIST': 'compiledChannels',
                'CHANNEL_WHITELIST': 'compiledChannelWhitelist',
                'MEMBERS_WHITELIST': 'compiledMembersWhitelist',
                'KEYWORD_WHITELIST': 'compiledKeywordWhitelist',
                'SECTION_TITLE_BLACKLIST': 'compiledSectionBlacklist'
            };
            const target = compileMap[key];
            if (target) {
                this.state[target] = this._compileList(value);
            }
        }
        toggleRule(ruleId) {
            this.state.RULE_ENABLES[ruleId] = !this.state.RULE_ENABLES[ruleId];
            this.set('RULE_ENABLES', this.state.RULE_ENABLES);
        }
    }

    const Logger = {
        enabled: false,
        prefix: `[Purifier]`,
        info(msg, ...args) {
            if (this.enabled)
                console.log(`%c${this.prefix} ${msg}`, 'color:#3498db;font-weight:bold', ...args);
        },
        warn(msg, ...args) {
            if (this.enabled)
                console.warn(`${this.prefix} ${msg}`, ...args);
        }
    };

    const VIDEO_CONTAINERS = [
        'ytd-rich-item-renderer',
        'ytd-video-renderer',
        'ytd-compact-video-renderer',
        'ytd-grid-video-renderer',
        'yt-lockup-view-model',
        'ytd-compact-radio-renderer',
        'ytd-playlist-panel-video-renderer',
        'ytd-playlist-video-renderer'
    ];
    const SECTION_CONTAINERS = [
        'ytd-rich-section-renderer',
        'ytd-rich-shelf-renderer',
        'ytd-reel-shelf-renderer',
        'grid-shelf-view-model'
    ];
    const ALL_CONTAINERS_STR = [...VIDEO_CONTAINERS, ...SECTION_CONTAINERS].join(', ');
    const SELECTORS = {
        VIDEO_CONTAINERS,
        METADATA: {
            TEXT: '.inline-metadata-item, #metadata-line span, .yt-content-metadata-view-model__metadata-text, yt-content-metadata-view-model .yt-core-attributed-string',
            TITLE_LINKS: [
                'a#video-title-link[aria-label]',
                'a#thumbnail[aria-label]',
                'a.yt-lockup-metadata-view-model__title[aria-label]',
                'a.yt-lockup-view-model__content-image[aria-label]',
                'a[href*="/watch?"][aria-label]'
            ],
            DURATION: 'ytd-thumbnail-overlay-time-status-renderer, span.ytd-thumbnail-overlay-time-status-renderer, badge-shape .yt-badge-shape__text, yt-thumbnail-badge-view-model .yt-badge-shape__text',
            CHANNEL: [
                'ytd-channel-name a',
                '.ytd-channel-name a',
                'a.yt-core-attributed-string__link[href^="/@"]',
                'a.yt-core-attributed-string__link[href^="/channel/"]',
                'a.yt-core-attributed-string__link[href^="/c/"]',
                'a.yt-core-attributed-string__link[href^="/user/"]',
                'a[href^="/@"]',
                'a[href^="/channel/"]',
                'a[href^="/c/"]',
                'a[href^="/user/"]',
                'ytd-channel-name',
                '.ytd-channel-name',
                'yt-decorated-avatar-view-model'
            ].join(', '),
            TITLE: '#video-title, #title, .yt-lockup-metadata-view-model__title, .yt-lockup-metadata-view-model__heading-reset, h3'
        },
        SHELF_TITLE: [
            '#rich-shelf-header #title',
            'ytd-reel-shelf-renderer #title',
            'h2#title',
            '.ytd-shelf-renderer #title'
        ],
        BADGES: {
            MEMBERS: '.badge-style-type-members-only, .yt-badge-shape--commerce, .yt-badge-shape--promoted, [aria-label*="會員專屬"], [aria-label*="Members only"], [aria-label*="會員優先"], [aria-label*="YouTube 精選"]',
            SHORTS: 'a[href*="/shorts/"]',
            MIX: 'a[aria-label*="合輯"], a[aria-label*="Mix"]'
        },
        INTERACTION_EXCLUDE: 'button, yt-icon-button, #menu, ytd-menu-renderer, ytd-toggle-button-renderer, yt-chip-cloud-chip-renderer, .yt-spec-button-shape-next, .yt-core-attributed-string__link, #subscribe-button, .ytp-progress-bar, .ytp-chrome-bottom',
        CLICKABLE: [
            'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-compact-video-renderer',
            'yt-lockup-view-model', 'ytd-playlist-renderer', 'ytd-compact-playlist-renderer',
            'ytd-video-owner-renderer', 'ytd-grid-video-renderer', 'ytd-playlist-video-renderer',
            'ytd-playlist-panel-video-renderer', 'ytd-guide-entry-renderer'
        ],
        PREVIEW_PLAYER: 'ytd-video-preview',
        LINK_CANDIDATES: [
            'a#thumbnail[href*="/watch?"]', 'a#thumbnail[href*="/shorts/"]', 'a#thumbnail[href*="/playlist?"]',
            'a#video-title-link', 'a#video-title', 'a.yt-simple-endpoint#video-title',
            'a.yt-lockup-metadata-view-model__title[href*="/watch?"]',
            'a.yt-lockup-metadata-view-model__title[href*="/shorts/"]',
            'a.yt-lockup-view-model__content-image[href*="/watch?"]',
            'a.yt-lockup-view-model__content-image[href*="/shorts/"]',
            'a.yt-lockup-view-model-wiz__title'
        ],
        allContainers: ALL_CONTAINERS_STR};

    var baseStyles = "/* --- YouTube Cleaner Static Global CSS --- */\n\n/* 1. Anti-Adblock popup and scroll unlocking */\ntp-yt-paper-dialog:has(ytd-enforcement-message-view-model),\nytd-enforcement-message-view-model,\n#immersive-translate-browser-popup,\ntp-yt-iron-overlay-backdrop:has(~ tp-yt-paper-dialog ytd-enforcement-message-view-model),\ntp-yt-iron-overlay-backdrop.opened,\nyt-playability-error-supported-renderers:has(ytd-enforcement-message-view-model) {\n    display: none !important;\n}\n\nytd-app:has(ytd-enforcement-message-view-model), \nbody:has(ytd-enforcement-message-view-model), \nhtml:has(ytd-enforcement-message-view-model) {\n    overflow: auto !important; \n    overflow-y: auto !important; \n    position: static !important;\n    pointer-events: auto !important; \n    height: auto !important; \n    top: 0 !important;\n    margin-right: 0 !important; \n    overscroll-behavior: auto !important;\n}\n\nytd-app[aria-hidden=\"true\"]:has(ytd-enforcement-message-view-model) {\n    display: block !important;\n}\n\nytd-app {\n    --ytd-app-scroll-offset: 0 !important;\n}\n";

    class StyleManager {
        config;
        constructor(config) {
            this.config = config;
        }
        apply() {
            const rules = [];
            const enables = this.config.get('RULE_ENABLES');
            if (enables.ad_block_popup) {
                rules.push(baseStyles);
            }
            if (this.config.get('FONT_FIX')) {
                rules.push('body, html { font-family: "YouTube Noto", Roboto, Arial, "PingFang SC", "Microsoft YaHei", sans-serif !important; }');
            }
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
                shorts_block: ['ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])', 'ytd-reel-shelf-renderer'],
                news_block: ['ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-news])'],
                movies_shelf: [
                    `ytd-rich-section-renderer:has(ytd-rich-shelf-renderer:has(#title[title*="${I18N.t('movies_keyword') || 'Movies'}"]))`
                ],
                fundraiser_block: [
                    `ytd-rich-section-renderer:has(ytd-rich-shelf-renderer:has(#title[title*="${I18N.t('fundraiser_keyword') || 'Fundraiser'}"]))`
                ]
            };
            for (const [key, selectors] of Object.entries(map)) {
                if (enables[key]) {
                    rules.push(`${selectors.join(', ')} { display: none !important; }`);
                }
            }
            const hasRules = [
                { key: 'ad_sponsor', selector: '[aria-label*="廣告"], [aria-label*="Sponsor"], [aria-label="贊助商廣告"], ad-badge-view-model, feed-ad-metadata-view-model' }
            ];
            hasRules.forEach(({ key, selector }) => {
                if (enables[key]) {
                    const containersList = SELECTORS.VIDEO_CONTAINERS || [];
                    containersList.forEach(c => rules.push(`${c}:has(${selector}) { display: none !important; }`));
                }
            });
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

    const TIMING = {
        RESUME_COOLDOWN: 3000
    };
    class AdBlockGuard {
        keywords;
        whitelistSelectors;
        lastTrigger;
        observer;
        checkAndCleanThrottled;
        constructor() {
            this.keywords = [
                'Ad blockers', '廣告攔截器',
                'Video player will be blocked', '影片播放器將被封鎖',
                'Allow YouTube', '允許 YouTube',
                "YouTube doesn't allow ad blockers"
            ];
            this.whitelistSelectors = [
                'ytd-sponsorships-offer-renderer',
                'ytd-about-channel-renderer',
                'ytd-report-form-modal-renderer',
                'ytd-multi-page-menu-renderer',
                'ytd-playlist-add-to-option-renderer'
            ];
            this.lastTrigger = 0;
            this.observer = null;
            this.checkAndCleanThrottled = null;
        }
        patchConfig() {
            try {
                const config = (window.yt?.config_ || window.ytcfg?.data_);
                if (config?.openPopupConfig?.supportedPopups?.adBlockMessageViewModel !== undefined) {
                    config.openPopupConfig.supportedPopups.adBlockMessageViewModel = false;
                }
                if (config?.EXPERIMENT_FLAGS) {
                    config.EXPERIMENT_FLAGS.ad_blocker_notifications_disabled = true;
                    config.EXPERIMENT_FLAGS.web_enable_adblock_detection_block_playback = false;
                }
            }
            catch {
            }
        }
        start() {
            this.patchConfig();
            this.checkAndCleanThrottled = Utils.throttle(() => this.checkAndClean(), 250);
            this.observer = new MutationObserver(() => this.checkAndCleanThrottled?.());
            this.observer.observe(document.body, {
                childList: true,
                subtree: false
            });
            const tryConnect = (attempts = 0) => {
                const popupContainer = document.querySelector('ytd-popup-container');
                if (popupContainer && !popupContainer._adGuardObserved) {
                    popupContainer._adGuardObserved = true;
                    this.observer?.observe(popupContainer, { childList: true, subtree: true });
                    Logger.info('🛡️ AdBlockGuard attached to popup container');
                }
                else if (attempts < 10) {
                    setTimeout(() => tryConnect(attempts + 1), 500);
                }
            };
            tryConnect();
            this.checkAndClean();
        }
        isWhitelisted(dialog) {
            return this.whitelistSelectors.some(sel => dialog.querySelector(sel));
        }
        isAdBlockPopup(dialog) {
            if (dialog.tagName === 'YTD-ENFORCEMENT-MESSAGE-VIEW-MODEL')
                return true;
            if (dialog.querySelector('ytd-enforcement-message-view-model'))
                return true;
            if (dialog.textContent && this.keywords.some(k => dialog.textContent.includes(k)))
                return true;
            return false;
        }
        checkAndClean() {
            const popupSelectors = [
                'tp-yt-paper-dialog',
                'ytd-enforcement-message-view-model',
                'yt-playability-error-supported-renderers'
            ];
            const dialogs = document.querySelectorAll(popupSelectors.join(', '));
            let detected = false;
            for (const dialog of dialogs) {
                if (this.isWhitelisted(dialog))
                    continue;
                if (this.isAdBlockPopup(dialog)) {
                    dialog.querySelectorAll('[aria-label="Close"], #dismiss-button').forEach(btn => btn.click());
                    dialog.remove();
                    detected = true;
                    Logger.info(`🚫 Removed AdBlock Popup: ${dialog.tagName}`);
                }
            }
            if (detected) {
                document.querySelectorAll('tp-yt-iron-overlay-backdrop.opened').forEach(b => b.remove());
                this.resumeVideo();
            }
        }
        resumeVideo() {
            if (Date.now() - this.lastTrigger > TIMING.RESUME_COOLDOWN) {
                this.lastTrigger = Date.now();
                const video = document.querySelector('video');
                if (video?.paused && !video.ended) {
                    video.play().catch(() => { });
                }
            }
        }
        destroy() {
            this.observer?.disconnect();
        }
    }

    const FilterStats = {
        counts: {},
        session: { total: 0, byRule: {} },
        record(reason) {
            this.counts[reason] = (this.counts[reason] || 0) + 1;
            this.session.total++;
            this.session.byRule[reason] = (this.session.byRule[reason] || 0) + 1;
        },
        getSummary() {
            return `已過濾 ${this.session.total} 個項目\n` +
                Object.entries(this.session.byRule)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => `  ${k}: ${v}`)
                    .join('\n');
        },
        reset() {
            this.session = { total: 0, byRule: {} };
        }
    };

    class CustomRuleManager {
        config;
        definitions;
        constructor(config) {
            this.config = config;
            this.definitions = [
                { key: 'members_only', rules: [/頻道會員專屬|Members only/i] },
                { key: 'mix_only', rules: [/(^|\s)(合輯|Mix)([\s\-–]|$)/i] },
                { key: 'news_block', rules: [/新聞快報|Breaking News|ニュース/i] },
                { key: 'posts_block', rules: [/貼文|Posts|投稿|Publicaciones|最新 YouTube 貼文/i] },
                { key: 'playables_block', rules: [/Playables|遊戲角落/i] },
                { key: 'fundraiser_block', rules: [/Fundraiser|募款/i] },
                { key: 'popular_gaming_shelf', rules: [/熱門遊戲直播/i] },
                { key: 'explore_topics', rules: [/探索更多主題|Explore more topics/i] },
                { key: 'movies_shelf', rules: [/為你推薦的特選電影|featured movies|YouTube 精選/i] },
                { key: 'trending_playlist', rules: [/發燒影片|Trending/i] },
                { key: 'youtube_featured_shelf', rules: [/YouTube 精選/i] },
                { key: 'shorts_block', rules: [/^Shorts$/i] },
                { key: 'shorts_grid_shelf', rules: [/^Shorts$/i] },
                { key: 'more_from_game_shelf', rules: [/^更多此遊戲相關內容$/i] },
                { key: 'members_early_access', rules: [/會員優先|Members Early Access|Early access for members/i] }
            ];
        }
        check(element, textContent) {
            const enables = this.config.get('RULE_ENABLES');
            for (const def of this.definitions) {
                if (enables[def.key]) {
                    for (const rule of def.rules) {
                        if (rule instanceof RegExp) {
                            if (rule.test(textContent))
                                return { key: def.key, trigger: rule.toString() };
                        }
                        else if (textContent.includes(rule)) {
                            return { key: def.key, trigger: rule };
                        }
                    }
                }
            }
            return null;
        }
    }

    const BATCH_SIZE = 50;
    const IDLE_TIMEOUT = 500;
    const MUTATION_THRESHOLD = 100;
    class LazyVideoData {
        el;
        _title = null;
        _channel = null;
        _url = undefined;
        _viewCount = undefined;
        _liveViewers = undefined;
        _timeAgo = undefined;
        _duration = undefined;
        _isShorts = undefined;
        _isMembers = undefined;
        _isUserPlaylist = undefined;
        _isPlaylist = undefined;
        raw = { views: '', time: '', duration: '', viewers: '' };
        constructor(element) {
            this.el = element;
        }
        get title() {
            if (this._title === null) {
                const el = this.el.querySelector(SELECTORS.METADATA.TITLE);
                this._title = el?.title?.trim() || el?.textContent?.trim() || '';
                if (!this._title) {
                    for (const sel of SELECTORS.METADATA.TITLE_LINKS) {
                        const link = this.el.querySelector(sel);
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
        get channel() {
            if (this._channel === null) {
                let rawName = '';
                const el = this.el.querySelector(SELECTORS.METADATA.CHANNEL);
                if (el) {
                    if (el.tagName === 'YT-DECORATED-AVATAR-VIEW-MODEL') {
                        const avatarBtn = el.querySelector('[aria-label]');
                        rawName = avatarBtn?.getAttribute('aria-label') || '';
                    }
                    else {
                        rawName = el.getAttribute('aria-label') || el.textContent?.trim() || '';
                    }
                }
                this._channel = Utils.cleanChannelName(rawName);
            }
            return this._channel;
        }
        get url() {
            if (this._url === undefined) {
                const anchor = this.el.querySelector(SELECTORS.LINK_CANDIDATES.join(', ')) ||
                    this.el.querySelector('a[href*="/watch?"], a[href*="/shorts/"]');
                this._url = anchor ? anchor.href : '';
            }
            return this._url;
        }
        _parseMetadata() {
            if (this._viewCount !== undefined)
                return;
            const texts = Array.from(this.el.querySelectorAll(SELECTORS.METADATA.TEXT));
            let aria = '';
            for (const sel of SELECTORS.METADATA.TITLE_LINKS) {
                const el = this.el.querySelector(`:scope ${sel}`);
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
                    if (!text || patterns.ago.test(text) || patterns.live.test(text) || text === this.channel)
                        continue;
                    const parsed = Utils.parseNumeric(text, 'view');
                    if (parsed !== null) {
                        this.raw.views = text;
                        this._viewCount = parsed;
                        break;
                    }
                }
            }
        }
        get viewCount() { this._parseMetadata(); return this._viewCount; }
        get liveViewers() { this._parseMetadata(); return this._liveViewers; }
        get timeAgo() { this._parseMetadata(); return this._timeAgo; }
        get duration() {
            if (this._duration === undefined) {
                const el = this.el.querySelector(SELECTORS.METADATA.DURATION);
                if (el) {
                    this.raw.duration = el.textContent?.trim() || '';
                    this._duration = Utils.parseDuration(this.raw.duration);
                }
                else {
                    this._duration = null;
                }
            }
            return this._duration;
        }
        get isShorts() {
            if (this._isShorts === undefined) {
                this._isShorts = !!this.el.querySelector(SELECTORS.BADGES.SHORTS);
            }
            return this._isShorts;
        }
        get isLive() { return this.liveViewers !== null; }
        get isMembers() {
            if (this._isMembers === undefined) {
                const pattern = I18N.filterPatterns[I18N.lang]?.members_only || /Members only/i;
                this._isMembers = !!this.el.querySelector(SELECTORS.BADGES.MEMBERS) ||
                    pattern.test(this.el.innerText);
            }
            return this._isMembers;
        }
        get isUserPlaylist() {
            if (this._isUserPlaylist === undefined) {
                const link = this.el.querySelector('a[href*="list="]');
                if (link && /list=(LL|WL|FL)/.test(link.href)) {
                    this._isUserPlaylist = true;
                }
                else {
                    const texts = Array.from(this.el.querySelectorAll(SELECTORS.METADATA.TEXT));
                    const ownershipKeywords = /Private|Unlisted|Public|私人|不公開|不公开|公開|公开/i;
                    this._isUserPlaylist = texts.some(t => ownershipKeywords.test(t.textContent || ''));
                }
            }
            return this._isUserPlaylist;
        }
        get isPlaylist() {
            if (this._isPlaylist === undefined) {
                const link = this.el.querySelector('a[href^="/playlist?list="], [content-id^="PL"]');
                if (link) {
                    this._isPlaylist = true;
                    return true;
                }
                if (this.el.querySelector(SELECTORS.BADGES.MIX)) {
                    this._isPlaylist = true;
                    return true;
                }
                const title = this.title;
                const pattern = I18N.filterPatterns[I18N.lang]?.playlist || /Mix/i;
                if (title && pattern.test(title)) {
                    this._isPlaylist = true;
                    return true;
                }
                this._isPlaylist = false;
            }
            return this._isPlaylist;
        }
    }
    class VideoFilter {
        config;
        customRules;
        observer = null;
        hasValidatedSelectors = false;
        constructor(config) {
            this.config = config;
            this.customRules = new CustomRuleManager(config);
        }
        start() {
            if (this.observer)
                return;
            this.observer = new MutationObserver((mutations) => this.processMutations(mutations));
            this.observer.observe(document.body, { childList: true, subtree: true });
            Logger.info('👁️ VideoFilter observer started');
        }
        stop() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        }
        _validateSelectors(elements) {
            if (this.hasValidatedSelectors || !this.config.get('DEBUG_MODE'))
                return;
            if (!elements || elements.length === 0)
                return;
            const sample = elements.find(el => /VIDEO|LOCKUP|RICH-ITEM/.test(el.tagName) &&
                !el.hidden &&
                el.offsetParent !== null &&
                el.querySelector(SELECTORS.METADATA.TITLE)
            );
            if (!sample)
                return;
            this.hasValidatedSelectors = true;
            const issues = [];
            if (!sample.querySelector(SELECTORS.METADATA.CHANNEL))
                issues.push('METADATA.CHANNEL');
            if (issues.length > 0) {
                Logger.warn(`⚠️ Selector Health Check Failed: ${issues.join(', ')} not found in active element`, sample);
            }
            else {
                Logger.info('✅ Selector Health Check Passed');
            }
        }
        get isPageAllowingContent() {
            const path = window.location.pathname;
            if (this.config.get('DISABLE_FILTER_ON_CHANNEL') && /^\/(@|channel\/|c\/|user\/)/.test(path))
                return true;
            return /^\/feed\/(playlists|library|subscriptions)/.test(path) ||
                /^\/playlists?$/.test(path) ||
                /^\/playlist/.test(path);
        }
        processMutations(mutations) {
            if (mutations.length > MUTATION_THRESHOLD) {
                this.processPage();
                return;
            }
            const candidates = new Set();
            for (const mutation of mutations) {
                for (const node of Array.from(mutation.addedNodes)) {
                    if (node.nodeType !== 1)
                        continue;
                    const el = node;
                    if (el.matches?.(SELECTORS.allContainers)) {
                        candidates.add(el);
                    }
                    el.querySelectorAll?.(SELECTORS.allContainers).forEach(c => candidates.add(c));
                    const parentContainer = el.closest?.(SELECTORS.allContainers);
                    if (parentContainer) {
                        if (parentContainer.dataset.ypChecked) {
                            delete parentContainer.dataset.ypChecked;
                        }
                        candidates.add(parentContainer);
                    }
                }
            }
            if (candidates.size > 0)
                this._processBatch(Array.from(candidates), 0);
        }
        processPage() {
            const elements = Array.from(document.querySelectorAll(SELECTORS.allContainers));
            this._validateSelectors(elements);
            const unprocessed = elements.filter(el => !el.dataset.ypChecked);
            if (unprocessed.length === 0)
                return;
            if ('requestIdleCallback' in window) {
                this._processBatch(unprocessed, 0);
            }
            else {
                unprocessed.forEach(el => this.processElement(el));
            }
        }
        _processBatch(elements, startIndex) {
            requestIdleCallback((deadline) => {
                let i = startIndex;
                while (i < elements.length && (deadline.timeRemaining() > 0 || deadline.didTimeout)) {
                    this.processElement(elements[i]);
                    i++;
                    if (i - startIndex >= BATCH_SIZE)
                        break;
                }
                if (i < elements.length)
                    this._processBatch(elements, i);
            }, { timeout: IDLE_TIMEOUT });
        }
        processElement(element) {
            const container = element.closest('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-playlist-renderer, ytd-rich-section-renderer, ytd-reel-shelf-renderer, ytd-playlist-panel-video-renderer') || element;
            if (container.dataset.ypChecked || container.dataset.ypHidden) {
                element.dataset.ypChecked = 'true';
                return;
            }
            if (element.hidden || element.hasAttribute('hidden')) {
                return this._hide(element, { reason: 'native_hidden' });
            }
            let filterDetail = null;
            const item = new LazyVideoData(element);
            const textMatch = this.customRules.check(element, element.textContent || '');
            if (textMatch)
                filterDetail = { reason: textMatch.key, trigger: textMatch.trigger };
            if (!filterDetail) {
                const sectionMatch = this._checkSectionFilter(element);
                if (sectionMatch)
                    filterDetail = sectionMatch;
            }
            const isVideoElement = /VIDEO|LOCKUP|RICH-ITEM|PLAYLIST-PANEL-VIDEO/.test(element.tagName);
            if (!filterDetail && isVideoElement && !this.isPageAllowingContent) {
                if (element.tagName === 'YTD-PLAYLIST-PANEL-VIDEO-RENDERER') {
                    container.dataset.ypChecked = 'true';
                    element.dataset.ypChecked = 'true';
                    return;
                }
                filterDetail = filterDetail || this._getFilterKeyword(item);
                filterDetail = filterDetail || this._getFilterChannel(item);
                if (!filterDetail && this.config.get('RULE_ENABLES').shorts_item && item.isShorts) {
                    filterDetail = { reason: 'shorts_item_js', trigger: 'Shorts video detected' };
                }
                if (!filterDetail && this.config.get('RULE_ENABLES').members_only && item.isMembers) {
                    filterDetail = { reason: 'members_only_js' };
                }
                filterDetail = filterDetail || this._getFilterView(item);
                filterDetail = filterDetail || this._getFilterDuration(item);
                filterDetail = filterDetail || this._getFilterPlaylist(item);
            }
            if (filterDetail) {
                if (filterDetail.reason === 'members_only' || filterDetail.reason === 'members_only_js') {
                    const compiledMembers = this.config.get('compiledMembersWhitelist');
                    if (compiledMembers && compiledMembers.some(rx => rx.test(item.channel))) {
                        Logger.info(`✅ Keep [Saved by Members Whitelist]: ${item.channel} | ${item.title}`);
                        this._markChecked(container, element);
                        return;
                    }
                }
                const priorities = this.config.get('RULE_PRIORITIES');
                const isStrong = priorities[filterDetail.reason] === 'strong';
                const whitelistReason = isStrong ? null : this._checkWhitelist(item);
                if (whitelistReason) {
                    const savedBy = whitelistReason === 'channel_whitelist' ? 'Channel' : 'Keyword';
                    const trigger = filterDetail.trigger ? ` [${filterDetail.trigger}]` : '';
                    const ruleInfo = filterDetail.rule ? ` {Rule: ${filterDetail.rule}}` : '';
                    Logger.info(`✅ Keep [Saved by ${savedBy} Whitelist]: ${item.channel} | ${item.title}
(Originally Triggered: ${filterDetail.reason}${trigger}${ruleInfo})`);
                    this._markChecked(container, element);
                }
                else {
                    this._hide(element, filterDetail, item);
                }
                return;
            }
            this._markChecked(container, element);
        }
        _markChecked(container, element) {
            container.dataset.ypChecked = 'true';
            element.dataset.ypChecked = 'true';
        }
        _checkSectionFilter(element) {
            if (!/RICH-SECTION|REEL-SHELF|SHELF-RENDERER/.test(element.tagName))
                return null;
            if (!this.config.get('ENABLE_SECTION_FILTER'))
                return null;
            let titleText = '';
            for (const sel of SELECTORS.SHELF_TITLE) {
                const titleEl = element.querySelector(sel);
                if (titleEl) {
                    titleText = titleEl.textContent?.trim() || '';
                    break;
                }
            }
            if (!titleText)
                return null;
            const compiled = this.config.get('compiledSectionBlacklist');
            if (compiled) {
                for (const rx of compiled) {
                    if (rx.test(titleText))
                        return { reason: 'section_blacklist', trigger: `Title: "${titleText}"`, rule: rx.toString() };
                }
            }
            return null;
        }
        _checkWhitelist(item) {
            const channel = item.channel;
            const title = item.title;
            const config = this.config;
            const compiledChannels = config.get('compiledChannelWhitelist');
            const rawChannels = config.get('CHANNEL_WHITELIST') || [];
            if (channel) {
                if (compiledChannels && compiledChannels.length > 0) {
                    if (compiledChannels.some(rx => rx.test(channel)))
                        return 'channel_whitelist';
                }
                else if (rawChannels.length > 0) {
                    const cLower = channel.toLowerCase();
                    if (rawChannels.some(k => cLower.includes(k.toLowerCase())))
                        return 'channel_whitelist';
                }
            }
            const compiledKeywords = config.get('compiledKeywordWhitelist');
            const rawKeywords = config.get('KEYWORD_WHITELIST') || [];
            if (title) {
                if (compiledKeywords && compiledKeywords.length > 0) {
                    if (compiledKeywords.some(rx => rx.test(title)))
                        return 'keyword_whitelist';
                }
                else if (rawKeywords.length > 0) {
                    const tLower = title.toLowerCase();
                    if (rawKeywords.some(k => tLower.includes(k.toLowerCase())))
                        return 'keyword_whitelist';
                }
            }
            return null;
        }
        _getFilterKeyword(item) {
            if (!this.config.get('ENABLE_KEYWORD_FILTER') || !item.title)
                return null;
            const compiled = this.config.get('compiledKeywords');
            if (this.config.get('ENABLE_REGION_CONVERT') && compiled) {
                for (const rx of compiled) {
                    if (rx.test(item.title))
                        return { reason: 'keyword_blacklist', trigger: `Title: "${item.title}"`, rule: rx.toString() };
                }
            }
            else {
                const title = item.title.toLowerCase();
                const rawList = this.config.get('KEYWORD_BLACKLIST');
                for (const k of rawList) {
                    if (title.includes(k.toLowerCase()))
                        return { reason: 'keyword_blacklist', trigger: `Keyword: "${k}"` };
                }
            }
            return null;
        }
        _getFilterChannel(item) {
            if (!this.config.get('ENABLE_CHANNEL_FILTER') || !item.channel)
                return null;
            const compiled = this.config.get('compiledChannels');
            if (this.config.get('ENABLE_REGION_CONVERT') && compiled) {
                for (const rx of compiled) {
                    if (rx.test(item.channel))
                        return { reason: 'channel_blacklist', trigger: `Channel: "${item.channel}"`, rule: rx.toString() };
                }
            }
            else {
                const channel = item.channel.toLowerCase();
                const rawList = this.config.get('CHANNEL_BLACKLIST');
                for (const k of rawList) {
                    if (channel.includes(k.toLowerCase()))
                        return { reason: 'channel_blacklist', trigger: `Channel Keyword: "${k}"` };
                }
            }
            return null;
        }
        _getFilterView(item) {
            if (!this.config.get('ENABLE_LOW_VIEW_FILTER') || item.isShorts)
                return null;
            const th = this.config.get('LOW_VIEW_THRESHOLD');
            const grace = this.config.get('GRACE_PERIOD_HOURS') * 60;
            if (item.isLive && item.liveViewers !== null && item.liveViewers < th) {
                return { reason: 'low_viewer_live', trigger: `Viewers: ${item.liveViewers} < Threshold: ${th} | Raw: "${item.raw.viewers}"` };
            }
            if (!item.isLive && item.viewCount !== null && item.timeAgo !== null &&
                item.timeAgo > grace && item.viewCount < th) {
                return { reason: 'low_view', trigger: `Views: ${item.viewCount} < Threshold: ${th} | Age: ${Math.floor(item.timeAgo / 60)}h (Grace: ${this.config.get('GRACE_PERIOD_HOURS')}h) | Raw: "${item.raw.views}"` };
            }
            return null;
        }
        _getFilterDuration(item) {
            if (!this.config.get('ENABLE_DURATION_FILTER') || item.isShorts || item.duration === null)
                return null;
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
        _getFilterPlaylist(item) {
            if (!this.config.get('RULE_ENABLES').recommended_playlists || !item.isPlaylist)
                return null;
            if (item.isUserPlaylist)
                return null;
            return { reason: 'recommended_playlists', trigger: 'Detected as algorithmic Mix/Playlist' };
        }
        _hide(element, detail, item = null) {
            const reason = detail.reason;
            const trigger = detail.trigger ? ` [${detail.trigger}]` : '';
            const ruleInfo = detail.rule ? ` {Rule: ${detail.rule}}` : '';
            const container = element.closest('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-playlist-renderer, ytd-rich-section-renderer, ytd-reel-shelf-renderer, ytd-playlist-panel-video-renderer') || element;
            if (container.dataset.ypHidden) {
                element.dataset.ypChecked = 'true';
                return;
            }
            container.style.cssText = 'display: none !important; visibility: hidden !important;';
            container.dataset.ypHidden = reason;
            container.dataset.ypChecked = 'true';
            if (container !== element) {
                element.dataset.ypHidden = reason;
                element.dataset.ypChecked = 'true';
            }
            FilterStats.record(reason);
            if (reason === 'native_hidden')
                return;
            const logMsg = `Hidden [${reason}]${trigger}${ruleInfo}`;
            if (item && item.url) {
                Logger.info(`${logMsg}
Title: ${item.title}
Channel: "${item.channel}"
URL: ${item.url}`);
            }
            else {
                Logger.info(logMsg);
            }
        }
        clearCache() {
            document.querySelectorAll('[data-yp-checked], [data-yp-hidden]').forEach(el => {
                if (el.dataset.ypHidden) {
                    el.style.display = '';
                    el.style.visibility = '';
                    delete el.dataset.ypHidden;
                }
                delete el.dataset.ypChecked;
            });
            this.hasValidatedSelectors = false;
        }
        reset() {
            document.querySelectorAll('[data-yp-hidden]').forEach(el => {
                el.style.display = '';
                delete el.dataset.ypHidden;
                delete el.dataset.ypChecked;
            });
            FilterStats.reset();
        }
    }

    class InteractionEnhancer {
        config;
        constructor(config) {
            this.config = config;
        }
        findPrimaryLink(container) {
            if (!container)
                return null;
            for (const sel of SELECTORS.LINK_CANDIDATES) {
                const a = container.querySelector(sel);
                if (a?.href)
                    return a;
            }
            return container.querySelector('a[href*="/watch?"], a[href*="/shorts/"], a[href*="/playlist?"]');
        }
        init() {
            document.addEventListener('click', (e) => {
                const target = e.target;
                if (target.closest('[data-yp-hidden]'))
                    return;
                if (this.config.get('OPEN_NOTIFICATIONS_IN_NEW_TAB')) {
                    const notificationPanel = target.closest('ytd-notification-renderer, ytd-comment-video-thumbnail-header-renderer, #sections.ytd-multi-page-menu-renderer');
                    if (notificationPanel) {
                        const link = target.closest('a.yt-simple-endpoint, a[href*="/watch?"]');
                        if (link && link.href && !target.closest('yt-icon-button, button')) {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            window.open(link.href, '_blank');
                            return;
                        }
                    }
                }
                if (!this.config.get('OPEN_IN_NEW_TAB'))
                    return;
                if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)
                    return;
                if (target.closest(SELECTORS.INTERACTION_EXCLUDE))
                    return;
                let targetLink = null;
                const previewPlayer = target.closest(SELECTORS.PREVIEW_PLAYER);
                if (previewPlayer) {
                    targetLink = this.findPrimaryLink(previewPlayer) || this.findPrimaryLink(previewPlayer.closest(SELECTORS.CLICKABLE.join(',')));
                }
                else {
                    const container = target.closest(SELECTORS.CLICKABLE.join(', '));
                    if (!container)
                        return;
                    if (container.tagName.toLowerCase() === 'ytd-guide-entry-renderer') {
                        const guideLink = container.querySelector('a#endpoint');
                        targetLink = guideLink?.href ? guideLink : null;
                    }
                    else {
                        const channelLink = target.closest('a#avatar-link, .ytd-channel-name a, a[href^="/@"], a[href^="/channel/"]');
                        targetLink = channelLink?.href ? channelLink : this.findPrimaryLink(container);
                    }
                }
                if (!targetLink)
                    return;
                try {
                    const hostname = new URL(targetLink.href, location.origin).hostname;
                    const isValidTarget = targetLink.href && /(^|\.)youtube\.com$/.test(hostname);
                    if (isValidTarget) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        window.open(targetLink.href, '_blank');
                    }
                }
                catch {  }
            }, { capture: true });
        }
    }

    class UIManager {
        config;
        onRefresh;
        constructor(config, onRefresh) {
            this.config = config;
            this.onRefresh = onRefresh;
        }
        t(key, ...args) {
            return I18N.t(key, ...args);
        }
        _renderMenu(title, items, backAction = null) {
            const visibleItems = items.filter(item => item.show !== false);
            const menuString = visibleItems
                .map((item, idx) => `${idx + 1}. ${item.label}`)
                .join('\n');
            const footer = backAction ? `\n0. ${this.t('back')}` : '';
            const promptText = `【 ${title} 】\n\n${menuString}${footer}\n\n${this.t('menu_input')}`;
            const choice = prompt(promptText);
            if (choice === '0' && backAction) {
                backAction();
                return;
            }
            if (choice !== null) {
                const selected = visibleItems[parseInt(choice) - 1];
                if (selected && selected.action) {
                    selected.action();
                }
            }
        }
        showMainMenu() {
            const items = [
                { label: this.t('menu_content'), action: () => this.showFilterMenu() },
                { label: this.t('menu_lists'), action: () => this.showListMenu() },
                { label: this.t('menu_ux'), action: () => this.showUXMenu() },
                { label: this.t('menu_system'), action: () => this.showSystemMenu() }
            ];
            this._renderMenu(`${this.t('title')} v${GM_info.script.version}`, items);
        }
        showFilterMenu() {
            const i = (k) => this.config.get(k) ? '✅' : '❌';
            const items = [
                { label: this.t('menu_rules'), action: () => this.showRuleMenu() },
                { label: `${i('ENABLE_LOW_VIEW_FILTER')} ${this.t('menu_low_view')}`, action: () => this.toggle('ENABLE_LOW_VIEW_FILTER', 'filter') },
                { label: `${this.t('menu_threshold')} (${this.config.get('LOW_VIEW_THRESHOLD')})`, action: () => this.promptNumber('LOW_VIEW_THRESHOLD', 'threshold_prompt', 'filter') },
                { label: `${this.t('menu_grace')} (${this.config.get('GRACE_PERIOD_HOURS')}h)`, action: () => this.promptNumber('GRACE_PERIOD_HOURS', 'grace_prompt', 'filter') },
                { label: `${i('ENABLE_DURATION_FILTER')} ${this.t('adv_duration_filter')}`, action: () => this.toggle('ENABLE_DURATION_FILTER', 'filter') },
                { label: this.t('adv_duration_set'), action: () => this.promptDuration() }
            ];
            this._renderMenu(this.t('menu_content'), items, () => this.showMainMenu());
        }
        showListMenu() {
            const i = (k) => this.config.get(k) ? '✅' : '❌';
            const items = [
                { label: `[黑] ${this.t('adv_keyword_list')}`, action: () => this.manage('KEYWORD_BLACKLIST') },
                { label: `[黑] ${this.t('adv_channel_list')}`, action: () => this.manage('CHANNEL_BLACKLIST') },
                { label: `[黑] ${this.t('adv_section_list')}`, action: () => this.manage('SECTION_TITLE_BLACKLIST') },
                { label: `[白] ${this.t('adv_channel_whitelist')}`, action: () => this.manage('CHANNEL_WHITELIST') },
                { label: `[白] ${this.t('adv_members_whitelist')}`, action: () => this.manage('MEMBERS_WHITELIST') },
                { label: `[白] ${this.t('adv_keyword_whitelist')}`, action: () => this.manage('KEYWORD_WHITELIST') },
                { label: `${i('ENABLE_KEYWORD_FILTER')} ${this.t('adv_keyword_filter')}`, action: () => this.toggle('ENABLE_KEYWORD_FILTER', 'list') },
                { label: `${i('ENABLE_CHANNEL_FILTER')} ${this.t('adv_channel_filter')}`, action: () => this.toggle('ENABLE_CHANNEL_FILTER', 'list') },
                { label: `${i('ENABLE_SECTION_FILTER')} ${this.t('adv_section_filter')}`, action: () => this.toggle('ENABLE_SECTION_FILTER', 'list') }
            ];
            this._renderMenu(this.t('menu_lists'), items, () => this.showMainMenu());
        }
        showUXMenu() {
            const i = (k) => this.config.get(k) ? '✅' : '❌';
            const items = [
                { label: `${i('OPEN_IN_NEW_TAB')} ${this.t('menu_new_tab')}`, action: () => this.toggle('OPEN_IN_NEW_TAB', 'ux') },
                { label: `${i('OPEN_NOTIFICATIONS_IN_NEW_TAB')} ${this.t('menu_notification_new_tab')}`, action: () => this.toggle('OPEN_NOTIFICATIONS_IN_NEW_TAB', 'ux') },
                { label: `${i('ENABLE_REGION_CONVERT')} ${this.t('adv_region_convert')}`, action: () => this.toggle('ENABLE_REGION_CONVERT', 'ux') },
                { label: `${i('DISABLE_FILTER_ON_CHANNEL')} ${this.t('adv_disable_channel')}`, action: () => this.toggle('DISABLE_FILTER_ON_CHANNEL', 'ux') },
                { label: `${i('FONT_FIX')} ${this.t('menu_font_fix')}`, action: () => this.toggle('FONT_FIX', 'ux') }
            ];
            this._renderMenu(this.t('menu_ux'), items, () => this.showMainMenu());
        }
        showSystemMenu() {
            const i = (k) => this.config.get(k) ? '✅' : '❌';
            const statsInfo = FilterStats.session.total > 0 ? ` (${FilterStats.session.total})` : '';
            const langName = I18N.availableLanguages[I18N.lang];
            const items = [
                { label: `${this.t('menu_stats')}${statsInfo}`, action: () => this.showStats() },
                { label: this.t('menu_export'), action: () => this.showExportImportMenu() },
                { label: `${this.t('menu_lang')} [${langName}]`, action: () => this.showLanguageMenu() },
                { label: `${i('DEBUG_MODE')} ${this.t('menu_debug')}`, action: () => this.toggle('DEBUG_MODE', 'system') },
                { label: this.t('menu_reset'), action: () => this.resetSettings() }
            ];
            this._renderMenu(this.t('menu_system'), items, () => this.showMainMenu());
        }
        showRuleMenu(page = 0) {
            const r = this.config.get('RULE_ENABLES');
            const keys = Object.keys(r);
            const PAGE_SIZE = 10;
            const totalPages = Math.ceil(keys.length / PAGE_SIZE);
            const start = page * PAGE_SIZE;
            const end = Math.min(start + PAGE_SIZE, keys.length);
            const pageKeys = keys.slice(start, end);
            const items = pageKeys.map(key => ({
                label: `[${r[key] ? '✅' : '❌'}] ${I18N.getRuleName(key)}`,
                action: () => {
                    this.config.toggleRule(key);
                    this.onRefresh();
                    this.showRuleMenu(page);
                }
            }));
            if (page < totalPages - 1) {
                items.push({ label: `➡️ ${this.t('next_page')} (${page + 2}/${totalPages})`, action: () => this.showRuleMenu(page + 1) });
            }
            if (page > 0) {
                items.push({ label: `⬅️ ${this.t('prev_page')} (${page}/${totalPages})`, action: () => this.showRuleMenu(page - 1) });
            }
            this._renderMenu(`${this.t('rules_title')} (${page + 1}/${totalPages})`, items, () => this.showFilterMenu());
        }
        manage(k) {
            const l = this.config.get(k);
            const title = `[ ${k} ]\n${l.join(', ') || '(Empty)'}`;
            const items = [
                { label: this.t('adv_add'), action: () => this.addItem(k, l) },
                { label: this.t('adv_remove'), action: () => this.removeItem(k, l) },
                { label: this.t('adv_clear'), action: () => this.clearList(k) },
                { label: this.t('adv_restore'), action: () => this.restoreDefaults(k) }
            ];
            this._renderMenu(title, items, () => this.showListMenu());
        }
        toggle(k, context = 'main') {
            this.config.set(k, !this.config.get(k));
            this.onRefresh();
            this._returnToContext(context);
        }
        promptNumber(key, promptKey, context = 'main') {
            const v = prompt(this.t(promptKey), String(this.config.get(key)));
            if (v !== null) {
                const num = Number(v);
                if (!isNaN(num)) {
                    this.config.set(key, num);
                    this.onRefresh();
                }
                else {
                    alert('❌ ' + this.t('invalid_number'));
                }
            }
            this._returnToContext(context);
        }
        _returnToContext(context) {
            const map = {
                filter: () => this.showFilterMenu(),
                list: () => this.showListMenu(),
                ux: () => this.showUXMenu(),
                system: () => this.showSystemMenu()
            };
            if (map[context])
                map[context]();
            else
                this.showMainMenu();
        }
        promptDuration() {
            const min = prompt(this.t('adv_min'), String(this.config.get('DURATION_MIN') / 60));
            const max = prompt(this.t('adv_max'), String(this.config.get('DURATION_MAX') / 60));
            if (min !== null) {
                const m = Number(min);
                if (!isNaN(m))
                    this.config.set('DURATION_MIN', m * 60);
            }
            if (max !== null) {
                const m = Number(max);
                if (!isNaN(m))
                    this.config.set('DURATION_MAX', m * 60);
            }
            this.onRefresh();
            this.showFilterMenu();
        }
        addItem(k, currentList) {
            const v = prompt(`${this.t('adv_add')}:`);
            if (!v) {
                this.manage(k);
                return;
            }
            let itemsToAdd = v.split(',').map(s => s.trim()).filter(Boolean);
            if ((k === 'CHANNEL_WHITELIST' || k === 'MEMBERS_WHITELIST') && itemsToAdd.length > 0) {
                const mode = prompt(this.t('adv_exact_prompt'), '1');
                if (mode === '1')
                    itemsToAdd = itemsToAdd.map(item => '=' + item);
            }
            this.config.set(k, [...new Set([...currentList, ...itemsToAdd])]);
            this.onRefresh();
            this.manage(k);
        }
        removeItem(k, currentList) {
            if (currentList.length === 0) {
                alert('名單是空的');
                this.manage(k);
                return;
            }
            const listString = currentList.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
            const v = prompt(`${this.t('adv_remove')}:\n\n${listString}\n\n[請輸入編號 (例如 1 或 1,3) 或完整關鍵字]`);
            if (v) {
                const input = v.trim();
                let newList = [...currentList];
                if (/^[\d,\s]+$/.test(input)) {
                    const indices = input.split(',')
                        .map(s => parseInt(s.trim()) - 1)
                        .filter(idx => idx >= 0 && idx < currentList.length)
                        .sort((a, b) => b - a);
                    if (indices.length > 0) {
                        indices.forEach(idx => newList.splice(idx, 1));
                    }
                    else {
                        return this.removeItem(k, currentList);
                    }
                }
                else {
                    newList = currentList.filter(i => i !== input);
                }
                this.config.set(k, newList);
                this.onRefresh();
            }
            this.manage(k);
        }
        clearList(k) {
            if (confirm(this.t('adv_clear') + '?')) {
                this.config.set(k, []);
                this.onRefresh();
            }
            this.manage(k);
        }
        restoreDefaults(k) {
            if (confirm(this.t('adv_restore') + '?')) {
                const allDefaults = this.config.defaults[k];
                if (Array.isArray(allDefaults) && k === 'SECTION_TITLE_BLACKLIST') {
                    const currentLang = I18N.lang;
                    const filtered = allDefaults.filter(item => {
                        const s = String(item);
                        const isEnglish = /[a-zA-Z]/.test(s);
                        const isChinese = /[\u4e00-\u9fa5]/.test(s);
                        const isJapanese = /[\u3040-\u30ff]/.test(s);
                        if (currentLang.startsWith('zh'))
                            return isChinese || isEnglish;
                        if (currentLang === 'ja')
                            return isJapanese || isEnglish;
                        return isEnglish;
                    });
                    this.config.set(k, filtered);
                }
                else {
                    this.config.set(k, [...allDefaults]);
                }
                this.onRefresh();
            }
            this.manage(k);
        }
        resetSettings() {
            if (confirm(this.t('reset_confirm'))) {
                Object.keys(this.config.defaults).forEach(k => this.config.set(k, this.config.defaults[k]));
                this.onRefresh();
                alert('✅ ' + this.t('import_success'));
            }
            this.showSystemMenu();
        }
        showStats() {
            const summary = FilterStats.getSummary();
            alert(`${this.t('stats_title')}\n\n${summary || this.t('stats_empty')}`);
            this.showSystemMenu();
        }
        showLanguageMenu() {
            const langs = I18N.availableLanguages;
            const keys = Object.keys(langs);
            const current = I18N.lang;
            const items = keys.map(k => ({
                label: `${k === current ? '✅' : '⬜'} ${langs[k]}`,
                action: () => { I18N.lang = k; alert(`✅ ${langs[k]}`); this.showSystemMenu(); }
            }));
            this._renderMenu(this.t('lang_title'), items, () => this.showSystemMenu());
        }
        showExportImportMenu() {
            const items = [
                { label: this.t('export_export'), action: () => this.exportSettings() },
                { label: this.t('export_import'), action: () => this.importSettings() }
            ];
            this._renderMenu(this.t('export_title'), items, () => this.showSystemMenu());
        }
        exportSettings() {
            const cleanSettings = {};
            for (const key in this.config.state) {
                if (!key.startsWith('compiled')) {
                    cleanSettings[key] = this.config.state[key];
                }
            }
            const exportData = {
                version: GM_info.script.version,
                timestamp: new Date().toISOString(),
                settings: cleanSettings,
                language: I18N.lang
            };
            const json = JSON.stringify(exportData, null, 2);
            try {
                GM_setClipboard(json);
                alert(this.t('export_success'));
            }
            catch {
                prompt(this.t('export_copy'), json);
            }
            this.showExportImportMenu();
        }
        importSettings() {
            const json = prompt(this.t('import_prompt'));
            if (!json) {
                this.showExportImportMenu();
                return;
            }
            try {
                const data = JSON.parse(json);
                if (!data.settings)
                    throw new Error('Invalid format');
                for (const key in data.settings) {
                    if (key in this.config.defaults) {
                        this.config.set(key, data.settings[key]);
                    }
                }
                if (data.language)
                    I18N.lang = data.language;
                alert(this.t('import_success'));
                this.onRefresh();
            }
            catch (err) {
                alert(this.t('import_fail') + err.message);
            }
            this.showExportImportMenu();
        }
    }

    class App {
        config;
        styleManager;
        adGuard;
        filter;
        enhancer;
        ui;
        constructor() {
            this.config = new ConfigManager();
            this.styleManager = new StyleManager(this.config);
            this.adGuard = new AdBlockGuard();
            this.filter = new VideoFilter(this.config);
            this.enhancer = new InteractionEnhancer(this.config);
            this.ui = new UIManager(this.config, () => this.refresh());
        }
        init() {
            Logger.enabled = this.config.get('DEBUG_MODE');
            this.styleManager.apply();
            this.adGuard.start();
            this.filter.start();
            this.enhancer.init();
            GM_registerMenuCommand('⚙️ 淨化大師設定', () => this.ui.showMainMenu());
            window.addEventListener('yt-navigate-finish', () => {
                this.adGuard.patchConfig();
                this.filter.clearCache();
                this.filter.processPage();
                this.adGuard.checkAndClean();
            });
            this.filter.processPage();
            if (typeof OpenCC !== 'undefined') {
                Logger.info('✅ 成功載入 OpenCC-JS 繁簡轉換庫');
            }
            else {
                Logger.info('⚠️ OpenCC-JS 未載入，繁簡過濾功能受限');
            }
            Logger.info(`🚀 YouTube 淨化大師 v${GM_info.script.version} 啟動`);
        }
        refresh() {
            Logger.enabled = this.config.get('DEBUG_MODE');
            this.filter.reset();
            this.styleManager.apply();
            this.filter.processPage();
        }
    }
    if (!window.ytPurifierInitialized) {
        window.ytPurifierInitialized = true;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => new App().init());
        }
        else {
            new App().init();
        }
    }

})();
