import { ConfigManager, RuleEnables } from '../core/config';
import { getTextRuleDefinitions } from '../data/rules';

export interface RuleDefinition {
    key: keyof RuleEnables;
    rules: (RegExp | string)[];
    type?: 'text';
}

export interface RuleCheckResult {
    key: keyof RuleEnables;
    trigger: string;
}

// --- 4. Module: Custom Rule Manager (Extensibility) ---
/**
 * Designed to make adding new simple text-based rules easy.
 * Add new entries to the `definitions` array here.
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

    public check(element: Element, textContent: string): RuleCheckResult | null {
        const enables = this.config.get('RULE_ENABLES');
        for (const def of this.definitions) {
            if (enables[def.key]) { // Only check if enabled in config
                for (const rule of def.rules) {
                    if (rule instanceof RegExp) {
                        if (rule.test(textContent)) return { key: def.key, trigger: rule.toString() };
                    } else if (textContent.includes(rule as string)) {
                        return { key: def.key, trigger: rule as string };
                    }
                }
            }
        }
        return null;
    }
}
