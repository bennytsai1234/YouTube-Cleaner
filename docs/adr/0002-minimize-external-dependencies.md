# 2. Minimize External Dependencies

Date: 2026-01-06

## Status

Accepted

## Context

Userscripts should be lightweight, fast, and secure. Relying on too many external libraries (npm packages bundled via rollup) increases the file size significantly. Relying on too many `@require` scripts introduces privacy and security risks (if the CDN is compromised).

## Decision

We adopt a **Hybrid Strategy**:

1.  **Core Logic**: Must be dependency-free. The main userscript should work standalone.
2.  **Enhancements via `@require`**:
    *   Large, specialized datasets (like full Chinese Dictionary) that would bloat the script can be loaded via `@require` from trusted CDNs (jsdelivr, unpkg).
    *   The script **must** handle the absence of these external libraries gracefully (Feature Detection).
    *   If the library fails to load, the script should fall back to a lightweight internal implementation.

## Consequences

*   **Performance**: Main script remains small (<100KB). The browser handles caching of external resources.
*   **Resilience**: The script still works (with reduced functionality) even if the CDN is down.
*   **Flexibility**: Users can remove the `@require` line if they are paranoid about security, without breaking the script completely.
