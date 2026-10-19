async () => {
    // 整段當成 browser_evaluate 的 function，在 Playwright 的連線頁執行。
    // 連線頁是 Playwright 擴充功能自己的頁面，有 debugger 權限：用 chrome.debugger 接上使用者的 YouTube 分頁，
    // 不導頁、不刷新。之後的步驟呼叫這裡掛在 window 上的 ycEval／ycDetach。
    const tabs = (await chrome.tabs.query({ url: '*://www.youtube.com/*' }))
        .map(t => ({ id: t.id, windowId: t.windowId, active: t.active, title: t.title, url: t.url }));

    // 沒指定 window.ycTarget 時才自動選：各視窗選取中的 YouTube 分頁只有一個就用它，
    // 好幾個就取最後聚焦的一般視窗裡那個；還是分不出來就不接，回傳候選讓呼叫端設 window.ycTarget = { tabId } 再跑
    if (!window.ycTarget) {
        const active = tabs.filter(t => t.active);
        let tab = active.length === 1 ? active[0] : null;
        if (!tab && active.length > 1) {
            const focused = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
            tab = active.find(t => t.windowId === focused.id) || null;
        }
        if (!tab) return { error: '分不出要接哪個 YouTube 分頁，請設 window.ycTarget = { tabId } 再跑一次', tabs };
        window.ycTarget = { tabId: tab.id };
    }
    const target = window.ycTarget;

    // 換了目標就先斷開上一個，避免舊分頁一直留著偵錯連線
    if (window.ycAttached && window.ycAttached.tabId !== target.tabId) {
        await chrome.debugger.detach(window.ycAttached).catch(() => {});
        window.ycAttached = null;
    }

    const attach = async () => {
        try {
            await chrome.debugger.attach(target, '1.3');
        } catch (e) {
            if (!/already attached/i.test(String(e))) throw e;
        }
        window.ycAttached = target;
    };

    window.ycEval = async (expression) => {
        await attach();
        const r = await chrome.debugger.sendCommand(target, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        return r.exceptionDetails ? { error: r.exceptionDetails } : r.result.value;
    };
    window.ycDetach = async () => {
        await chrome.debugger.detach(target);
        window.ycAttached = null;
    };

    // Console.enable 會把分頁已經印過的訊息重送一次，等一下收齊（1.5 秒在實測時足夠）
    await attach();
    const msgs = [];
    const onEvent = (src, method, params) => {
        if (src.tabId === target.tabId && method === 'Console.messageAdded') msgs.push(params.message);
    };
    chrome.debugger.onEvent.addListener(onEvent);
    try {
        await chrome.debugger.sendCommand(target, 'Console.enable');
        await new Promise(r => setTimeout(r, 1500));
    } finally {
        chrome.debugger.onEvent.removeListener(onEvent);
        await chrome.debugger.sendCommand(target, 'Console.disable').catch(() => {});
    }

    const strip = text => text.replace(/^%c/, '').replace(/ color:#3498db;font-weight:bold$/, '');
    const purifier = msgs.map(m => strip(m.text)).filter(t => t.startsWith('[Purifier]'));

    return {
        target,
        tabs,
        page: await window.ycEval(`({
            url: location.href,
            lang: document.documentElement.lang,
            checked: document.querySelectorAll('[data-yp-checked]').length,
            hidden: document.querySelectorAll('[data-yp-hidden]').length
        })`),
        // 啟動行帶版本號；主控台被清過時會撈不到，要跟其他紀錄和 page.checked 一起看
        started: purifier.filter(t => t.includes('啟動')),
        purifierCount: purifier.length,
        // Keep 行說明被哪個白名單或訂閱保護救回、原本命中哪條規則
        kept: purifier.filter(t => t.includes('✅ Keep')),
        hiddenCount: purifier.filter(t => t.includes('Hidden [')).length,
        errors: msgs.filter(m => m.level === 'error' || m.level === 'warning')
            .map(m => `${m.level} ${m.url || ''}: ${m.text.slice(0, 200)}`)
    };
}
