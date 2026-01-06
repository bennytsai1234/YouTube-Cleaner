// --- 3. Core: Logger ---
export const Logger = {
    enabled: false,
    prefix: `[Purifier]`,
    info(msg, ...args) { if (this.enabled) console.log(`%c${this.prefix} ${msg}`, 'color:#3498db;font-weight:bold', ...args); },
    warn(msg, ...args) { if (this.enabled) console.warn(`${this.prefix} ${msg}`, ...args); }
};
