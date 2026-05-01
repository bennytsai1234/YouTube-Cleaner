import { Logger } from '../core/logger';
import { ConfigManager } from '../core/config';
import { SELECTORS } from '../data/selectors';
import { FilterEngine } from './filter-engine';
import { FilterDetail, WhitelistReason } from './filter-types';
import { clearFilterState, getFilterContainer, hideElement, markChecked, resetHiddenState } from './dom-visibility';
import { LazyVideoData } from './video-data';

const BATCH_SIZE = 50;
const IDLE_TIMEOUT = 500;
const MUTATION_THRESHOLD = 100;

declare global {
    interface HTMLElement {
        dataset: DOMStringMap & {
            ypChecked?: string;
            ypHidden?: string;
        };
    }
    function requestIdleCallback(callback: (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void, options?: { timeout: number }): number;
}

export { LazyVideoData } from './video-data';

export class VideoFilter {
    private config: ConfigManager;
    private engine: FilterEngine;
    private observer: MutationObserver | null = null;
    private hasValidatedSelectors = false;

    constructor(config: ConfigManager) {
        this.config = config;
        this.engine = new FilterEngine(config);
    }

    public start(): void {
        if (this.observer) return;

        this.observer = new MutationObserver((mutations) => this.processMutations(mutations));
        this.observer.observe(document.body, { childList: true, subtree: true });
        this.engine.subManager.init(); // 初始化訂閱監聽
        Logger.info('👁️ VideoFilter observer started');
    }

    public stop(): void {
        this.observer?.disconnect();
        this.observer = null;
        this.engine.subManager.destroy();
    }

    get isPageAllowingContent(): boolean {
        const path = window.location.pathname;
        if (this.config.get('DISABLE_FILTER_ON_CHANNEL') && /^\/(@|channel\/|c\/|user\/)/.test(path)) return true;

        return /^\/feed\/(playlists|library|subscriptions)/.test(path) ||
            /^\/playlists?$/.test(path) ||
            /^\/playlist/.test(path);
    }

    public processMutations(mutations: MutationRecord[]): void {
        if (mutations.length > MUTATION_THRESHOLD) {
            this.processPage();
            return;
        }

        const candidates = new Set<HTMLElement>();
        for (const mutation of mutations) {
            for (const node of Array.from(mutation.addedNodes)) {
                if (node.nodeType !== 1) continue;
                const el = node as HTMLElement;

                if (el.matches?.(SELECTORS.allContainers)) candidates.add(el);
                el.querySelectorAll?.(SELECTORS.allContainers).forEach(c => candidates.add(c as HTMLElement));

                const parentContainer = el.closest?.(SELECTORS.allContainers) as HTMLElement;
                if (parentContainer) {
                    if (parentContainer.dataset.ypChecked) delete parentContainer.dataset.ypChecked;
                    candidates.add(parentContainer);
                }
            }
        }

        if (candidates.size > 0) this.processBatch(Array.from(candidates), 0);
    }

    public processPage(): void {
        const elements = Array.from(document.querySelectorAll<HTMLElement>(SELECTORS.allContainers));
        this.validateSelectors(elements);

        const unprocessed = elements.filter(el => !el.dataset.ypChecked);
        if (unprocessed.length === 0) return;

        if ('requestIdleCallback' in window) {
            this.processBatch(unprocessed, 0);
        } else {
            unprocessed.forEach(el => this.processElement(el));
        }
    }

    public processElement(element: HTMLElement): void {
        const container = getFilterContainer(element);
        if (container.dataset.ypChecked || container.dataset.ypHidden) {
            element.dataset.ypChecked = 'true';
            return;
        }

        if (element.hidden || element.hasAttribute('hidden')) {
            hideElement(element, { reason: 'native_hidden' });
            return;
        }

        if (element.tagName === 'YTD-PLAYLIST-PANEL-VIDEO-RENDERER') {
            markChecked(container, element);
            return;
        }

        const detail = this.engine.findFilterDetail(element, this.isPageAllowingContent);
        if (!detail) {
            markChecked(container, element);
            return;
        }

        const item = new LazyVideoData(element);
        const whitelistReason = this.engine.applyWhitelistDecision(item, detail);
        if (whitelistReason) {
            markChecked(container, element);
            return;
        }

        hideElement(element, detail, item);
    }

    public clearCache(): void {
        clearFilterState();
        this.hasValidatedSelectors = false;
    }

    public reset(): void {
        resetHiddenState();
    }

    public async scanSubscriptions(): Promise<void> {
        await this.engine.subManager.scan();
    }

    private _checkSectionFilter(element: HTMLElement): FilterDetail | null {
        return this.engine.checkSectionFilter(element);
    }

    private _checkWhitelist(item: LazyVideoData): WhitelistReason | null {
        return this.engine.checkWhitelist(item);
    }

    private _getFilterKeyword(item: LazyVideoData): FilterDetail | null {
        return this.engine.getFilterKeyword(item);
    }

    private _getFilterChannel(item: LazyVideoData): FilterDetail | null {
        return this.engine.getFilterChannel(item);
    }

    private _getFilterView(item: LazyVideoData): FilterDetail | null {
        return this.engine.getFilterView(item);
    }

    private _getFilterDuration(item: LazyVideoData): FilterDetail | null {
        return this.engine.getFilterDuration(item);
    }

    private _getFilterPlaylist(item: LazyVideoData): FilterDetail | null {
        return this.engine.getFilterPlaylist(item);
    }

    private validateSelectors(elements: HTMLElement[]): void {
        if (this.hasValidatedSelectors || !this.config.get('DEBUG_MODE') || elements.length === 0) return;

        const sample = elements.find(el =>
            /VIDEO|LOCKUP|RICH-ITEM/.test(el.tagName) &&
            !el.hidden &&
            el.offsetParent !== null &&
            el.querySelector(SELECTORS.METADATA.TITLE)
        );

        if (!sample) return;

        this.hasValidatedSelectors = true;
        const issues: string[] = [];
        if (!sample.querySelector(SELECTORS.METADATA.CHANNEL)) issues.push('METADATA.CHANNEL');

        if (issues.length > 0) {
            Logger.warn(`⚠️ Selector Health Check Failed: ${issues.join(', ')} not found in active element`, sample);
        } else {
            Logger.info('✅ Selector Health Check Passed');
        }
    }

    private processBatch(elements: HTMLElement[], startIndex: number): void {
        requestIdleCallback((deadline) => {
            let i = startIndex;
            while (i < elements.length && (deadline.timeRemaining() > 0 || deadline.didTimeout)) {
                this.processElement(elements[i]);
                i++;
                if (i - startIndex >= BATCH_SIZE) break;
            }
            if (i < elements.length) this.processBatch(elements, i);
        }, { timeout: IDLE_TIMEOUT });
    }
}
