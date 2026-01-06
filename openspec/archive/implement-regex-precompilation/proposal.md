# Proposal: Implement Regex Pre-compilation for Keyword Filtering

## Why
The current checking method performs runtime string conversion for every video title against every keyword, which is memory-intensive (allocating new strings) and CPU-intensive. A better approach is to perform the "heavy lifting" only once: by compiling text keywords into region-agnostic Regular Expressions at initialization time.

## What Changes
- **Pre-compilation**: Convert user text keywords (e.g., "预告") into Regex patterns (e.g., `/[预預][告告]/i`) immediately upon loading settings.
- **Zero-allocation Filtering**: The `VideoFilter` loop will switch from `toSimplified(title).includes(key)` to `regex.test(title)`.
- **Utils**: Add `generateCnRegex(text)` helper.

## Impact
- **Performance**: Near-native filtering speed; eliminates GC pressure from string conversions during scroll.
- **Accuracy**: Handles mixed-script inputs (TC/SC usage in same sentence) which pure conversion might miss.
