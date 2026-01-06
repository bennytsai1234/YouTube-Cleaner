# Tasks: Implement Regex Pre-compilation

- [x] **Implement `Utils.generateCnRegex`** <!-- id: 1 -->
  - Refactor `src/core/utils.js`.
  - Create a method that takes a string and returns a `RegExp`.
  - Logic: Iterate chars, find TC/SC variants from `chinese-map.js`, build `[aA]` style pattern.
  - Optimization: Use a `VariantMap` (Map<Char, Char>) for fast lookup of counterparts.

- [x] **Update `ConfigManager` to cache Regexs** <!-- id: 2 -->
  - Modify `src/core/config.js`.
  - When `KEYWORD_BLACKLIST` or `CHANNEL_BLACKLIST` is updated/loaded, generate and store a `_compiledKeywords` array of Regex objects.

- [x] **Update `VideoFilter` to use Regex** <!-- id: 3 -->
  - Modify `src/features/video-filter.js`.
  - Remove `toSimplified` calls in the loop.
  - Use `this.config.compiledKeywords.some(rx => rx.test(text))` for matching.

- [x] **Cleanup** <!-- id: 4 -->
  - Remove the now-redundant `window.chineseConv` check from `processElement` loop (keep in Utils if useful for other things, but main path should use Regex).
