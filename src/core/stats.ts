// --- 0.1 Filter Statistics ---
export interface StatsData {
    total: number;
    byRule: Record<string, number>;
}

export const FilterStats = {
    counts: {} as Record<string, number>,
    session: { total: 0, byRule: {} } as StatsData,

    record(reason: string): void {
        const count = Reflect.get(this.counts, reason) || 0;
        Reflect.set(this.counts, reason, count + 1);
        this.session.total++;
        const sessionCount = Reflect.get(this.session.byRule, reason) || 0;
        Reflect.set(this.session.byRule, reason, sessionCount + 1);
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
