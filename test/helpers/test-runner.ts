export class TestRunner {
    public passed = 0;
    public failed = 0;

    constructor(private summaryLabel: string) {}

    public suite(name: string, fn: () => void): void {
        console.log(`\n📦 ${name}`);
        console.log('─'.repeat(40));
        fn();
    }

    public assert(description: string, condition: unknown): void {
        if (condition) {
            console.log(`  ✅ ${description}`);
            this.passed++;
            return;
        }

        console.error(`  ❌ ${description}`);
        this.failed++;
    }

    public assertEqual<T>(description: string, actual: T, expected: T): void {
        if (actual === expected) {
            console.log(`  ✅ ${description}`);
            this.passed++;
            return;
        }

        console.error(`  ❌ ${description}`);
        console.error(`     期望: ${expected}, 實際: ${actual}`);
        this.failed++;
    }

    public summary(): boolean {
        console.log('\n' + '═'.repeat(40));
        console.log(`📊 ${this.summaryLabel}: ${this.passed} 通過, ${this.failed} 失敗`);
        console.log('═'.repeat(40));
        return this.failed === 0;
    }
}

export const exitWithSummary = (runner: TestRunner): void => {
    if (!runner.summary()) {
        process.exit(1);
    }
};
