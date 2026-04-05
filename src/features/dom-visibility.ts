import { FilterStats } from '../core/stats';
import { Logger } from '../core/logger';
import { FilterDetail } from './filter-types';
import { LazyVideoData } from './video-data';

const FILTER_CONTAINER_SELECTOR = [
    'ytd-rich-item-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-playlist-renderer',
    'ytd-rich-section-renderer',
    'ytd-reel-shelf-renderer',
    'ytd-playlist-panel-video-renderer',
    'ytd-playlist-video-renderer'
].join(', ');

export const getFilterContainer = (element: HTMLElement): HTMLElement =>
    element.closest<HTMLElement>(FILTER_CONTAINER_SELECTOR) || element;

export const markChecked = (container: HTMLElement, element: HTMLElement): void => {
    container.dataset.ypChecked = 'true';
    element.dataset.ypChecked = 'true';
};

export const hideElement = (element: HTMLElement, detail: FilterDetail, item: LazyVideoData | null = null): void => {
    const reason = detail.reason;
    const trigger = detail.trigger ? ` [${detail.trigger}]` : '';
    const ruleInfo = detail.rule ? ` {Rule: ${detail.rule}}` : '';
    const container = getFilterContainer(element);

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

    if (reason === 'native_hidden') return;

    const logMsg = `Hidden [${reason}]${trigger}${ruleInfo}`;
    if (item && item.url) {
        Logger.info(`${logMsg}
Title: ${item.title}
Channel: "${item.channel}"
URL: ${item.url}`);
        return;
    }

    Logger.info(logMsg);
};

export const clearFilterState = (): void => {
    document.querySelectorAll<HTMLElement>('[data-yp-checked], [data-yp-hidden]').forEach(el => {
        if (el.dataset.ypHidden) {
            el.style.display = '';
            el.style.visibility = '';
            delete el.dataset.ypHidden;
        }
        delete el.dataset.ypChecked;
    });
};

export const resetHiddenState = (): void => {
    document.querySelectorAll<HTMLElement>('[data-yp-hidden]').forEach(el => {
        el.style.display = '';
        delete el.dataset.ypHidden;
        delete el.dataset.ypChecked;
    });
    FilterStats.reset();
};
