# Proposal: Optimize Chinese Conversion Performance

## Why
The newly implemented Chinese conversion function uses `String.indexOf` on a ~2500 character string for every single character in a video title. This results in an $O(N \cdot M)$ complexity (where N is text length, M is dictionary size). With many videos on the homepage, this linear scanning can consume unnecessary CPU cycles during scrolling.

## What Changes
- **Algorithm**: Switch from linear string scanning to a `Map`-based O(1) lookup.
- **Lazy Loading**: Construct the `Map` only upon the first call to `toSimplified` to avoid impacting script startup time.

## Impact
- **Performance**: Significant reduction in CPU usage for filtering operations.
- **Code**: Local change within `src/core/utils.js`.
