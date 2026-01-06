# Proposal: Enhance Keyword Filtering with TC/SC Conversion

## Summary
Enhance the blocking feature by implementing a robust dictionary-based Traditional/Simplified Chinese conversion, ensuring that keywords filter out videos regardless of the regional character variant used.

## Why
The current keyword filtering mechanism relies on an incomplete ad-hoc conversion function. Users expecting to block videos by keyword fail to do so if the video title uses a different character variant (e.g., "預" vs "预") than the one in their blocklist. This leads to user frustration and "leaky" filtering.

## What
1.  **New Dictionary Module**: Introduce `src/data/chinese-conversion-map.js` containing a comprehensive mapping of ~2500 common Traditional/Simplified character pairs.
2.  **Updated `Utils.toSimplified`**: Refactor the utility function to use this new map for O(1) character conversion.
3.  **Canonical Matching**: Update `VideoFilter.js` to normalize both the target content (title, channel) and the user's blocklist keywords to Simplified Chinese before comparison, ensuring bidirectional matching support.
