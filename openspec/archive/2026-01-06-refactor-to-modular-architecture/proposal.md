# Proposal: Refactor to Modular Architecture using Rollup

## Problem
The current codebase is a "Modular Monolith" inside a single 900+ line file (`youtube-homepage-cleaner.user.js`).
This structure makes maintenance, collaboration, and testing difficult.
- **Readability**: Navigating a large file is cumbersome.
- **Collaboration**: High risk of merge conflicts.
- **Testing**: Impossible to unit test individual components (e.g., parsers).

## Proposed Solution
Migrate to a standard ES Module architecture built with **Rollup**.
This allows us to write code in separate files (`src/**/*.js`) while outputting a single, non-minified UserScript bundle (`dist/youtube-homepage-cleaner.user.js`) that is fully compatible with GreasyFork.

## Architecture
```text
src/
├── main.js                  (Entry point)
├── core/                    (Business logic)
│   ├── config.js
│   ├── logger.js
│   └── utils.js
├── features/                (Specific features)
│   ├── video-filter.js
│   ├── style-manager.js
│   ├── interaction.js
│   └── adblock-guard.js
├── ui/                      (User Interface)
│   ├── menu.js
│   └── i18n.js
└── data/
    └── selectors.js         (Static data)
```

## Phases
1.  **Phase 1: Tooling Setup**
    - Install Rollup & plugins.
    - Configure `rollup.config.mjs` to output non-minified code with UserScript headers.
    - Establish `src` and `dist` structure.
2.  **Phase 2: Data Extraction**
    - Extract `SELECTORS` and `I18N` constant data into separate modules.
3.  **Phase 3: Logic Extraction**
    - Extract core classes (`ConfigManager`, `StyleManager`, `VideoFilter`, etc.) into separate modules.
4.  **Phase 4: Integration**
    - Update GitHub Actions to build before release.
    - Update `package.json` scripts.

## Impact
- **No functional change** for end users.
- **Developer Experience**: Significantly improved.
- **GreasyFork Compatibility**: Maintained via unminified bundle output.
