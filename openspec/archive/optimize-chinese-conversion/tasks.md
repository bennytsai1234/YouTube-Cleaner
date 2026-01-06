# Tasks: Optimize Chinese Conversion

- [x] **Implement Map-based caching in `Utils.toSimplified`** <!-- id: 1 -->
  - Refactor `src/core/utils.js`.
  - Create a file-scope variable `conversionMap` (initialized to null).
  - Inside `toSimplified`, if `conversionMap` is null, build it from `MAP_TC` and `MAP_SC`.
  - Use `conversionMap.get(char)` for O(1) replacement.
- [x] **Verify Behavior** <!-- id: 2 -->
  - Ensure "預告" still converts to "预告".
