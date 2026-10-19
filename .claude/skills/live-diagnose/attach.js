async () => {
    // 整段當成 browser_evaluate 的 function，在 Playwright 的連線頁執行。
    // 連線頁是 Playwright 擴充功能自己的頁面，有 debugger 權限：用 chrome.debugger 接上使用者的 YouTube 分頁，
    // 不導頁、不刷新。之後的步驟呼叫這裡掛在 window 上的 ycEval／ycDetach。
    const tabs = (await chrome.tabs.query({ url: '*://www.youtube.com/*' }))
        .map(t => ({ id: t.id, active: t.active, title: t.title, url: t.url }));
    // 預設接使用中的 YouTube 分頁；有好幾個時，回傳的 tabs 讓你確認，要換就設 window.ycTarget = { tabId } 再跑一次
    if (!window.ycTarget) {
        const tab = tabs.find(t => t.active) || (tabs.length === 1 ? tabs[0] : null);
        if (!tab) return { error: '找不到使用中的 YouTube 分頁', tabs };
        window.ycTarget = { tabId: tab.id };
    }
    const target = window.ycTarget;

    const attach = async () => {
        try {
            await chrome.debugger.attach(target, '1.3');
        } catch (e) {
            if (!/already attached/i.test(String(e))) throw e;
        }
    };

    window.ycEval = async (expression) => {
        await attach();
        const r = await chrome.debugger.sendCommand(target, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        return r.exceptionDetails ? { error: r.exceptionDetails } : r.result.value;
    };
    window.ycDetach = () => chrome.debugger.detach(target);

    // Console.enable 會把分頁已經印過的訊息重送一次，等一下收齊（1.5 秒在實測時足夠）
    await attach();
    const msgs = [];
    const onEvent = (src, method, params) => {
        if (src.tabId === target.tabId && method === 'Console.messageAdded') msgs.push(params.message);
    };
    chrome.debugger.onEvent.addListener(onEvent);
    await chrome.debugger.sendCommand(target, 'Console.enable');
    await new Promise(r => setTimeout(r, 1500));
    await chrome.debugger.sendCommand(target, 'Console.disable');
    chrome.debugger.onEvent.removeListener(onEvent);

    const strip = text => text.replace(/^%c/, '').replace(/ color:#3498db;font-weight:bold$/, '');
    const purifier = msgs.map(m => strip(m.text)).filter(t => t.startsWith('[Purifier]'));

    return {
        target,
        tabs,
        page: await window.ycEval('({ url: location.href, lang: document.documentElement.lang })'),
        // 啟動行帶版本號；沒有任何 [Purifier] 行代表腳本沒跑，或使用者關了 Debug Mode
        started: purifier.filter(t => t.includes('啟動')),
        // Keep 行說明被哪個白名單或訂閱保護救回、原本命中哪條規則
        kept: purifier.filter(t => t.includes('✅ Keep')),
        hiddenCount: purifier.filter(t => t.includes('Hidden [')).length,
        errors: msgs.filter(m => m.level === 'error' || m.level === 'warning')
            .map(m => `${m.level} ${m.url || ''}: ${m.text.slice(0, 200)}`)
    };
}
