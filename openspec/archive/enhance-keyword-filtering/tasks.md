# Tasks: Enhance Keyword Filtering

- [x] **Create comprehensive conversion map** <!-- id: 1 -->
  - Implement `src/data/chinese-map.js` (or similar) containing the full TC/SC char mapping.
  - Verification: Check if common missing chars like "預" are present.

- [x] **Update `Utils.toSimplified`** <!-- id: 2 -->
  - Refactor `src/core/utils.js` to utilize the new massive dictionary.
  - Implement efficient lookup (string index or hash map).
  - Verification: Unit test `Utils.toSimplified('預告') === '预告'`.

- [x] **Refactor `VideoFilter` to use canonical matching** <!-- id: 3 -->
  - Update `src/features/video-filter.js`.
  - Ensure both `item.title`/`item.channel` AND the blacklist keywords are passed through `toSimplified` before checking `.includes()`.
  - Verification: Add a test case/log to confirm "預告" matches "预告".

- [x] **Verify Performance** <!-- id: 4 -->
  - Ensure the larger dictionary doesn't cause noticeable lag on script init or page scroll.
  - Verification: Check execution time of `processPage`.
