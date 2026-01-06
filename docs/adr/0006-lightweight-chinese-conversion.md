# 6. Lightweight Chinese Region Conversion

Date: 2026-01-06

## Status

Accepted

## Context

Users want to filter keywords (e.g., "Genshin Impact") regardless of whether they are written in Traditional ("原神") or Simplified ("原神") Chinese.
Importing a full-fledged conversion library (like OpenCC) would bloat the userscript size significantly (MBs), violating our "Lightweight" and "No External Dependencies" principles (ADR-0002).

## Decision

We implement a **Lightweight Mapping Strategy**:

1.  **Embedded Mapping Table**: We include a compact string containing the ~500 most frequent character pairs that differ between Traditional and Simplified Chinese.
2.  **One-way Normalization**: We convert both the `target text` (video title) and the `filter keyword` to **Simplified Chinese** before comparison.
3.  **Opt-out**: Provide a toggle (`ENABLE_REGION_CONVERT`) in the Advanced Menu for users who need strict matching.

## Consequences

### Positive
*   **Zero Dependencies**: No external libraries required.
*   **Tiny Footprint**: The mapping string adds < 2KB to the script size.
*   **High Coverage**: Covers >90% of common keywords used in video titles.
*   **Performance**: Simple string lookup is extremely fast (O(n)).

### Negative
*   **Edge Cases**: Rare characters might not be converted, leading to potential filter misses (acceptable trade-off for size).
*   **Maintenance**: The mapping string is manually curated; might need updates if users report missing common characters.
