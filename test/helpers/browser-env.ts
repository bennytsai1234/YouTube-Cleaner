import { JSDOM, type ConstructorOptions } from 'jsdom';

export type GMStorage = Record<string, unknown>;

export const installGMStorage = (storage: GMStorage = {}): GMStorage => {
    const globalRef = globalThis as typeof globalThis & {
        GM_getValue: <TValue>(key: string, defaultValue?: TValue) => TValue;
        GM_setValue: (key: string, value: unknown) => void;
    };

    globalRef.GM_getValue = <TValue>(key: string, defaultValue?: TValue): TValue =>
        Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] as TValue : defaultValue as TValue;
    globalRef.GM_setValue = (key: string, value: unknown) => {
        storage[key] = value;
    };

    return storage;
};

export const installGMDefaults = (): void => {
    installGMStorage();
};

export const installDom = (html = '<!doctype html><html><body></body></html>', options: ConstructorOptions = {}): JSDOM => {
    const dom = new JSDOM(html, {
        url: 'https://www.youtube.com/',
        ...options
    });

    const globalRef = globalThis as Record<string, unknown>;
    globalRef.window = dom.window;
    globalRef.document = dom.window.document;
    globalRef.HTMLElement = dom.window.HTMLElement;
    globalRef.Element = dom.window.Element;
    globalRef.Node = dom.window.Node;
    globalRef.MutationObserver = dom.window.MutationObserver;
    globalRef.HTMLAnchorElement = dom.window.HTMLAnchorElement;
    globalRef.MouseEvent = dom.window.MouseEvent;
    globalRef.URL = dom.window.URL;
    globalRef.location = dom.window.location;

    Object.defineProperty(globalThis, 'navigator', {
        value: dom.window.navigator,
        writable: true,
        configurable: true
    });

    return dom;
};
