import { ConfigManager, RuleEnables } from '../core/config';
import { getTextRuleDefinitions, TextRule, TextRuleTarget } from '../data/rules';

export interface RuleDefinition {
    key: keyof RuleEnables;
    rules: TextRule[];
}

export interface RuleCheckResult {
    key: keyof RuleEnables;
    trigger: string;
}

// --- 4. Module: Custom Rule Manager (Extensibility) ---
/**
 * 依 `RULE_DEFINITIONS` 的 textRules 比對文字；呼叫端依元素類型取出對應範圍的文字
 * （區塊標題列、badge、標題）再交給 `check`。
 */
export class CustomRuleManager {
    private config: ConfigManager;
    private definitions: RuleDefinition[];

    constructor(config: ConfigManager) {
        this.config = config;
        this.definitions = getTextRuleDefinitions().map(rule => ({
            key: rule.id as keyof RuleEnables,
            rules: rule.textRules || []
        }));
    }

    public check(target: TextRuleTarget, texts: string[]): RuleCheckResult | null {
        if (texts.length === 0) return null;

        const enables = this.config.get('RULE_ENABLES');
        for (const def of this.definitions) {
            if (!Reflect.get(enables, def.key)) continue;
            for (const rule of def.rules) {
                if (rule.target !== target) continue;
                const text = texts.find(t => rule.pattern.test(t));
                if (text !== undefined) return { key: def.key, trigger: `${rule.pattern} "${text}"` };
            }
        }
        return null;
    }
}
