async () => {
    // 整段當成 browser_evaluate 的 function：回報腳本隱藏了什麼、CSS 藏了什麼、還有沒有廣告露出
    await new Promise(r => setTimeout(r, 5000));
    document.querySelector('video')?.pause();

    const CARDS = 'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, yt-lockup-view-model';
    const AD_MARKERS = 'ytd-ad-slot-renderer, ytd-search-pyv-renderer, ad-badge-view-model, feed-ad-metadata-view-model';
    const isAd = el => !!el.querySelector(AD_MARKERS) || !!el.closest('ytd-ad-slot-renderer, ytd-search-pyv-renderer');
    const titleOf = el => (el.querySelector('h3, #video-title, #title, h2')?.textContent || '').trim().slice(0, 60);
    const badgesOf = el => [...el.querySelectorAll('badge-shape')].map(b => b.textContent.trim()).filter(t => t && !/^\d/.test(t));

    // 只看最外層的卡片（ytd-rich-item-renderer 裡還包著 yt-lockup-view-model）
    const cards = [...document.querySelectorAll(CARDS)].filter(c => !c.parentElement?.closest(CARDS));
    const ads = [...document.querySelectorAll('ytd-ad-slot-renderer, ytd-search-pyv-renderer')];

    return {
        page: location.pathname + location.search.slice(0, 40),
        visibility: document.visibilityState,
        cardCount: cards.length,
        // 腳本（JS 規則）隱藏的元素與原因
        scriptHidden: [...document.querySelectorAll('[data-yp-hidden]')].map(h => ({
            tag: h.tagName.toLowerCase(),
            reason: h.getAttribute('data-yp-hidden'),
            title: titleOf(h),
            badges: badgesOf(h)
        })),
        // 被 CSS 藏掉、卻不是廣告的卡片：應為空
        cssHiddenNonAds: cards
            .filter(c => !c.closest('[data-yp-hidden]') && getComputedStyle(c).display === 'none' && !isAd(c))
            .map(c => ({ tag: c.tagName.toLowerCase(), title: titleOf(c) })),
        adsTotal: ads.length,
        // 仍然看得到的廣告：應為 0
        adsVisible: ads.filter(a => a.checkVisibility()).length
    };
}
