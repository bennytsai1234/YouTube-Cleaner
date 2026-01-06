import { Utils } from '../src/core/utils.js';

// Mock Config Manager
class MockConfig {
    constructor() {
        this.kw = [];
        this.compiled = [];
    }
    setKeywords(list) {
        this.kw = list;
        this.compiled = list.map(k => Utils.generateCnRegex(k)).filter(Boolean);
    }
    check(title) {
        return this.compiled.some(rx => rx.test(title));
    }
}

// Test Runner
function runTests() {
    let passed = 0;
    let failed = 0;
    const config = new MockConfig();

    const assert = (scenario, condition) => {
        if (condition) {
            console.log(`✅ [PASS] ${scenario}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${scenario}`);
            failed++;
        }
    };

    console.log('--- Starting Filter Validation ---');

    // Scenario 1: Basic Simp Keyword -> Trad Title
    config.setKeywords(['预告']);
    assert('Simplified keyword matches Traditional title', config.check('最新電影預告片'));

    // Scenario 2: Trad Keyword -> Simp Title
    config.setKeywords(['預告']);
    assert('Traditional keyword matches Simplified title', config.check('最新电影预告片'));

    // Scenario 3: Mixed Variants (Simp Title with Trad parts)
    config.setKeywords(['预告']);
    assert('Keyword matches mixed content', config.check('最新预告片'));

    // Scenario 4: Special Regex Chars in Keyword
    config.setKeywords(['Live.']); // Should match "Live." literally, not "LiveX"
    assert('Escapes special chars', config.check('YouTube Live. Stream'));
    assert('Does not treat dot as wildcard', !config.check('LiveXStream'));

    // Scenario 5: Case Insensitive
    config.setKeywords(['game']);
    assert('Case insensitive matching', config.check('Best GAME Ever'));

    // Scenario 6: No Match
    config.setKeywords(['Minecraft']);
    assert('Correctly ignores non-matching titles', !config.check('Roblox Gameplay'));

    console.log('----------------------------------');
    console.log(`Tests Completed: ${passed} Passed, ${failed} Failed.`);
}

runTests();
