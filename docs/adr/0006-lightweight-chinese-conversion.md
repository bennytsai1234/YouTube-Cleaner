# 6. OpenCC-JS for Chinese Conversion

Date: 2026-01-07 (Updated)

## Status

Superseded by this revision.

## Context

Users want to filter keywords (e.g., "原神") regardless of whether they are written in Traditional or Simplified Chinese.

Previously, we used a lightweight internal mapping table (~500 characters). While this worked for common cases, it had limitations:

1.  **Limited Coverage**: Rare but important characters were missed.
2.  **Maintenance Burden**: The mapping table required manual curation.
3.  **No Phrase Conversion**: Character-level conversion can be inaccurate (e.g., "頭髮" vs "頭發").

## Decision

We adopt **OpenCC-JS** (`opencc-js@1.0.5`) as the primary Chinese conversion library.

### Implementation Details

1.  **External Resource via `@require`**:
    ```javascript
    // @require https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.js
    ```

2.  **Graceful Degradation**:
    *   If OpenCC-JS loads successfully, use `OpenCC.Converter({ from: 'tw', to: 'cn' })`.
    *   If the CDN fails or the library doesn't load, fall back to the internal lightweight mapping table.

3.  **Lazy Initialization**: The converter is created only on the first call to `Utils.toSimplified()`.

### Why OpenCC-JS?

| Feature | OpenCC-JS | Internal Map |
|---------|-----------|--------------|
| Character Coverage | 8000+ | ~500 |
| Phrase Conversion | ✅ Yes | ❌ No |
| Regional Variants | ✅ tw, hk, cn | ❌ Limited |
| Maintained | ✅ Active (2024+) | ❌ Manual |
| Zero Dependencies | ❌ External | ✅ Yes |

## Consequences

### Positive

*   **Superior Accuracy**: OpenCC handles phrase-level conversions correctly.
*   **Comprehensive Coverage**: All common and rare Traditional/Simplified characters are converted.
*   **Low Maintenance**: We don't need to manually update the mapping table.
*   **Resilience**: The script still works (with reduced accuracy) even if the CDN is down.

### Negative

*   **External Dependency**: Relies on jsDelivr CDN availability.
*   **Slightly Larger Footprint**: OpenCC full.js is ~300KB (gzipped ~80KB), but it's cached by the browser.
*   **Privacy Consideration**: Users can remove the `@require` line if they prefer; the fallback will be used.

## Related ADRs

*   ADR-0002: Minimize External Dependencies (Hybrid Strategy allows this approach)
