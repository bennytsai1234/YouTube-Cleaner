// --- 國際化 (i18n) - 繁中、簡中、英文 ---
export const I18N = {
    _lang: null,

    // 語言字典
    strings: {
        'zh-TW': {
            title: 'YouTube 淨化大師',
            menu_rules: '📂 設定過濾規則',
            menu_low_view: '低觀看數過濾 (含直播)',
            menu_threshold: '🔢 設定閾值',
            menu_advanced: '🚫 進階過濾',
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
            threshold_prompt: '閾值:',
            reset_confirm: '重設?',
            lang_title: '【 選擇語言 】',
            back: '返回',
            adv_keyword_filter: '關鍵字過濾',
            adv_keyword_list: '✏️ 關鍵字清單',
            adv_channel_filter: '頻道過濾',
            adv_channel_list: '✏️ 頻道清單',
            adv_duration_filter: '長度過濾',
            adv_duration_set: '⏱️ 設定長度',
            adv_min: '最短(分):',
            adv_max: '最長(分):',
            adv_add: '新增',
            adv_remove: '刪除',
            adv_clear: '清空',
            adv_region_convert: '繁簡通用過濾'
        },
        'zh-CN': {
            title: 'YouTube 净化大师',
            menu_rules: '📂 设置过滤规则',
            menu_low_view: '低观看数过滤 (含直播)',
            menu_threshold: '🔢 设置阈值',
            menu_advanced: '🚫 高级过滤',
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
            threshold_prompt: '阈值:',
            reset_confirm: '重置?',
            lang_title: '【 选择语言 】',
            back: '返回',
            adv_keyword_filter: '关键字过滤',
            adv_keyword_list: '✏️ 关键字列表',
            adv_channel_filter: '频道过滤',
            adv_channel_list: '✏️ 频道列表',
            adv_duration_filter: '时长过滤',
            adv_duration_set: '⏱️ 设置时长',
            adv_min: '最短(分):',
            adv_max: '最长(分):',
            adv_add: '新增',
            adv_remove: '删除',
            adv_clear: '清空',
            adv_region_convert: '繁简通用过滤'
        },
        'en': {
            title: 'YouTube Cleaner',
            menu_rules: '📂 Filter Rules',
            menu_low_view: 'Low View Filter (incl. Live)',
            menu_threshold: '🔢 Set Threshold',
            menu_advanced: '🚫 Advanced Filters',
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
            threshold_prompt: 'Threshold:',
            reset_confirm: 'Reset?',
            lang_title: '【 Select Language 】',
            back: 'Back',
            adv_keyword_filter: 'Keyword Filter',
            adv_keyword_list: '✏️ Keyword List',
            adv_channel_filter: 'Channel Filter',
            adv_channel_list: '✏️ Channel List',
            adv_duration_filter: 'Duration Filter',
            adv_duration_set: '⏱️ Set Duration',
            adv_min: 'Min (min):',
            adv_max: 'Max (min):',
            adv_add: 'Add',
            adv_remove: 'Remove',
            adv_clear: 'Clear',
            adv_region_convert: 'Region Agnostic Filter'
        }
    },

    // 規則名稱翻譯
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
        }
    },

    getRuleName(ruleKey) {
        return this.ruleNames[this.lang]?.[ruleKey] || this.ruleNames['en'][ruleKey] || ruleKey;
    },

    detectLanguage() {
        const ytLang = document.documentElement.lang || navigator.language || 'zh-TW';
        if (ytLang.startsWith('zh-CN') || ytLang.startsWith('zh-Hans')) return 'zh-CN';
        if (ytLang.startsWith('zh')) return 'zh-TW';
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
            'en': 'English'
        };
    }
};
