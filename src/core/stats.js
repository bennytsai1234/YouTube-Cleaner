// --- 0.1 Filter Statistics ---
export const FilterStats = {
    counts: {},
    session: { total: 0, byRule: {} },

    record(reason) {
        this.counts[reason] = (this.counts[reason] || 0) + 1;
        this.session.total++;
        this.session.byRule[reason] = (this.session.byRule[reason] || 0) + 1;
    },

    getSummary() {
        return `已過濾 ${this.session.total} 個項目
` +
            Object.entries(this.session.byRule)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `  ${k}: ${v}`)
                .join('\n');
    },

    reset() {
        this.session = { total: 0, byRule: {} };
    }
};
