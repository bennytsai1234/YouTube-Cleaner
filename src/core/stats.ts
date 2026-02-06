// --- 0.1 Filter Statistics ---
export interface StatsData {
    total: number;
    byRule: Record<string, number>;
}

export const FilterStats = {
    counts: {} as Record<string, number>,
    session: { total: 0, byRule: {} } as StatsData,

    record(reason: string): void {
        this.counts[reason] = (this.counts[reason] || 0) + 1;
        this.session.total++;
        this.session.byRule[reason] = (this.session.byRule[reason] || 0) + 1;
    },

    getSummary(): string {
        return `已過濾 ${this.session.total} 個項目\n` +
            Object.entries(this.session.byRule)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `  ${k}: ${v}`)
                .join('\n');
    },

    reset(): void {
        this.session = { total: 0, byRule: {} };
    }
};
