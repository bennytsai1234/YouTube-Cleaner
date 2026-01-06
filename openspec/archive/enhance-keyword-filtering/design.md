# Design: robust-chinese-conversion

## Context
The script needs to filter videos based on keywords in both Traditional (TC) and Simplified (SC) Chinese. Currently, it tries to convert everything to Simplified before checking, but the dictionary is incomplete (e.g., missing "預").

## Architecture

### 1. New Module: `src/core/i18n-utils.js` (or enhance `src/core/utils.js`)
We will introduce a dedicated logic for Chinese conversion.

#### Data Structure
A single string-based dictionary is efficient for storage and parsing.
```javascript
// Compact dictionary format: "繁體=简体|繁體=简体..." or separate strings
const TC = "萬與醜專業...預...";
const SC = "万与丑专业...预...";
```

#### Conversion Logic
`toSimplified(str)`:
1. Iterate through `str`.
2. Find index of char in `TC`.
3. If found, replace with char at same index in `SC`.
4. Else, keep original.

### 2. Matching Strategy
In `VideoFilter.js`:
Instead of just `toSimplified(title).includes(keyword)`, we need to ensure the `keyword` is also converted to the same canonical form.

```javascript
// In processElement:
const canonicalTitle = Utils.toSimplified(item.title);
const blacklist = this.config.get('KEYWORD_BLACKLIST');

const matched = blacklist.some(keyword => {
    const canonicalKeyword = Utils.toSimplified(keyword);
    return canonicalTitle.includes(canonicalKeyword);
});
```
This ensures that if the user types "預告" (TC) in settings:
- `canonicalKeyword` -> "预告" (SC)
- Title "最新預告" (TC) -> `canonicalTitle` -> "最新预告" (SC)
- Match: TRUE.

If the user types "预告" (SC) in settings:
- `canonicalKeyword` -> "预告" (SC)
- Title "最新預告" (TC) -> `canonicalTitle` -> "最新预告" (SC)
- Match: TRUE.

## Alternatives Considered
- **OpenCC**: Too heavy to bundle (megabytes of data).
- **Online API**: Unacceptable latency and privacy risk.
- **Regex `(预|預)`**: Complex to generate dynamically for every keyword. Normalization to SC is standard practice for search/match.

## Implementation Plan
1. Extract a comprehensive TC/SC map (Top ~2500-3000 chars covers 99.9% of usage).
2. Update `Utils.toSimplified` to use this new map.
3. Update `VideoFilter` to normalize both source and target before comparison.
