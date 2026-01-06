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
    // 包含最常用的 500+ 對照字，涵蓋絕大多數關鍵字場景
    toSimplified: (str) => {
        if (!str) return '';
        const t = '萬與醜專業叢東絲丟兩嚴喪個卐豐臨為麗舉乃久么義樂喬乖乘亂乾了予爭事二于虧雲互五井亞些亡交亥亦產亨畝享京亭亮親億仁僅仆仇今介仍仔他付仙儀仔代令以仰仲件任份仿企伊伍伐休會傳倫偽佇伯估伴伸伺似伽但佈位低住佐佑体何餘佛作你佩佯佳併使來例侍供依人侮侯侵便係促俄俊俎俗俘信修俱俾倍倒倔倘候倚借倡倣偺倦倨倩倪倫倭值偃假偉偏傑做停健側偵偶偷偽傀傅傍傑傖傘備傚催傭傲傳債傷傻傾僂僅僉像僑僕偽僥僨僱價儀儂億儈儉儐儒償優儲儷儺儻儼免兒兔黨兜兢入內全兩八公六共興兵其具典養兼冀冂円冉冊再冑冒冕冗冤冠塚冤冥冬冰冷准凉凋凌凍凝几凡凰凱凳凶凸凹出函刀刁刃分切刈刊刑划列初判別利刪刮到制刷刺刻剃則削剋剌前剛劍劑剝劇剩剪副割創劃劇劈劉劍劑力功加劣助努劫劬劭効勁勃勇勉勒動勗勘務勝勞募勢勤勳勵勸勻勾勿包匆匈匍匏匕化北匙匝匠匡匣匪匱匹區醫十千升午卉半卑卒卓協南博卜占卡卮卦卣印危即卵卷卸卹卻卿廠厄厚原厭厲去參又叉及友反叔取受敘叛叟叢口古句另叨叩只叫召叭叮可台叱史右叵叶司嘆含吝吻吸吹吾呀呂呆呈吳告呎周味呵呼命和咎詠咐咒咕咖佬供使來例侍供依人侮侯侵便係促俄俊俎俗俘信修俱俾倍倒倔倘候倚借倡倣偺倦倨倩倪倫倭值偃假偉偏傑做停健側偵偶偷偽傀傅傍傑傖傘備傚催傭傲傳債傷傻傾僂僅僉像僑僕偽僥僨僱價儀儂億儈儉儐儒償優儲儷儺儻儼免兒兔黨兜兢入內全兩八公六共興兵其具典養兼冀冂円冉冊再冑冒冕冗冤冠塚冤冥冬冰冷准凉凋凌凍凝几凡凰凱凳凶凸凹出函刀刁刃分切刈刊刑划列初判別利刪刮到制刷刺刻剃則削剋剌前剛劍劑剝劇剩剪副割創劃劇劈劉劍劑力功加劣助努劫劬劭効勁勃勇勉勒動勗勘務勝勞募勢勤勳勵勸勻勾勿包匆匈匍匏匕化北匙匝匠匡匣匪匱匹區醫十千升午卉半卑卒卓協南博卜占卡卮卦卣印危即卵卷卸卹卻卿廠厄厚原厭厲去參又叉及友反叔取受敘叛叟叢口古句另叨叩只叫召叭叮可台叱史右叵叶司嘆含吝吻吸吹吾呀呂呆呈吳告呎周味呵呼命和咎詠咐咒咕咖佬';
        const s = '万与丑专业丛东丝丢两严丧个卍丰临为丽举乃久幺义乐乔乖乘乱干了予争事二于亏云互五井亚些亡交亥亦产亨亩享京亭亮亲亿仁仅仆仇今介仍仔他付仙仪仔代令以仰仲件任份仿企伊伍伐休会传伦伪伫伯估伴伸伺似伽但布位低住佐佑体何余佛作你佩佯佳并使来例侍供依人侮侯侵便系促俄俊俎俗俘信修俱俾倍倒倔倘候倚借倡仿咱倦倨倩倪伦倭值偃假伟偏杰做停健侧侦偶偷伪傀傅傍杰伧伞备效催佣傲传债伤傻倾偻仅佥像侨仆伪侥偾雇价仪侬亿侩俭傧儒偿优储俪傩傥俨免儿兔党兜兢入内全两八公六共兴兵其具典养兼冀冂円冉册再胄冒冕冗冤冠冢冤冥冬冰冷准凉凋凌冻凝几凡凰凯凳凶凸凹出函刀刁刃分切刈刊刑划列初判别利删刮到制刷刺刻剃则削克剌前刚剑剂剥剧剩剪副割创划剧劈刘剑剂力功加劣助努劫劬劭效劲勃勇勉勒动勖勘务胜劳募势勤勋励劝匀勾勿包匆匈匍匏匕化北匙匝匠匡匣匪匮匹区医十千升午卉半卑卒卓协南博卜占卡卮卦卣印危即卵卷卸恤却卿厂厄厚原厌厉去参又叉及友反叔取受叙叛叟丛口古句另叨叩只叫召叭叮可台叱史右叵叶司叹含吝吻吸吹吾呀吕呆呈吴告尺周味呵呼命和咎咏咐咒咕咖佬';
        
        let res = '';
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const idx = t.indexOf(char);
            res += idx !== -1 ? s[idx] : char;
        }
        return res;
    }
};
