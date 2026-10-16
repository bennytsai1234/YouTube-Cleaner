import { Logger } from '../core/logger';
import { ConfigManager } from '../core/config';
import { SELECTORS } from '../data/selectors';
import { FilterEngine } from './filter-engine';
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
        // 大批次改走整頁掃描，但整頁掃描只處理沒有檢查標記的容器，內容晚到的容器仍要先清掉標記
        const isLargeBatch = mutations.length > MUTATION_THRESHOLD;
        const candidates = new Set<HTMLElement>();
        for (const mutation of mutations) {
            for (const node of Array.from(mutation.addedNodes)) {
                // Polymer 元件會先插入空的文字容器，之後才另外補上文字節點（例如區塊副標題的「YouTube 精選」），
                // 從文字節點的父元素找所屬容器重新檢查；只有空白的文字節點略過
                const el = node.nodeType === 1 ? node as HTMLElement
                    : node.nodeType === 3 && node.textContent?.trim() ? node.parentElement
                        : null;
                if (!el) continue;

                if (!isLargeBatch) {
                    if (el.matches?.(SELECTORS.allContainers)) candidates.add(el);
                    el.querySelectorAll?.(SELECTORS.allContainers).forEach(c => candidates.add(c as HTMLElement));
                }

                const parentContainer = el.closest?.(SELECTORS.allContainers) as HTMLElement;
                if (parentContainer) {
                    // 首頁卡片是兩層容器（ytd-rich-item-renderer 包 yt-lockup-view-model），
                    // processElement 看的是外層的檢查標記，兩層都要清掉才會重新檢查
                    delete parentContainer.dataset.ypChecked;
                    delete getFilterContainer(parentContainer).dataset.ypChecked;
                    candidates.add(parentContainer);
                }
            }
        }

        if (isLargeBatch) {
            this.processPage();
            return;
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

        const item = new LazyVideoData(element);
        const detail = this.engine.findFilterDetail(item, this.isPageAllowingContent);
        if (!detail) {
            markChecked(container, element);
            return;
        }

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
                this.processElement(Reflect.get(elements, i) as HTMLElement);
                i++;
                if (i - startIndex >= BATCH_SIZE) break;
            }
            if (i < elements.length) this.processBatch(elements, i);
        }, { timeout: IDLE_TIMEOUT });
    }
}
