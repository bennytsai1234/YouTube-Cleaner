# 🏗️ Architecture Documentation

The project follows a **Modular Architecture** designed for maintainability, performance, and extensibility.

## 📂 Directory Structure

```
src/
├── main.js                  # Entry point (initializes modules)
├── meta.json                # Userscript metadata (version, includes, etc.)
├── core/                    # Core infrastructure
│   ├── config.js            # Configuration management (GM_getValue/GM_setValue)
│   ├── logger.js            # Centralized logging with levels
│   ├── stats.js             # Filter statistics tracking
│   └── utils.js             # Shared utilities (i18n helpers, parsing, debounce)
├── data/                    # Static data
│   └── selectors.js         # CSS Selectors for DOM elements (Centralized)
├── features/                # Feature modules
│   ├── adblock-guard.js     # Anti-Adblock popup handling
│   ├── custom-rules.js      # Logic for custom toggleable rules
│   ├── interaction.js       # UI interactions (New Tab, etc.)
│   ├── style-manager.js     # CSS injection and management
│   └── video-filter.js      # Main filtering engine (High Performance)
└── ui/                      # User Interface
    ├── i18n.js              # Localization (zh-TW, zh-CN, en, ja)
    └── menu.js              # Tampermonkey Menu implementation
```

## 🧩 Key Modules

### Core (`src/core/`)

*   **ConfigManager**: Handles persistent settings. Uses a `Snake_Case` to `camelCase` mapping strategy for internal keys vs. storage keys.
*   **Utils**: Provides essential helpers like `debounce`, `parseNumeric` (handling '1.2萬', '50K', etc.), and `toSimplified` (for cross-region filtering).

### Features (`src/features/`)

*   **VideoFilter**: The heart of the cleaner.
    *   **Strategy**: Uses `LazyVideoData` to parse DOM elements only when needed.
    *   **Performance**: Implements `requestIdleCallback` to process video elements in batches, preventing UI blocking.
    *   **Logic**: Applies filtering based on Views, Duration, Keywords, Channels, and specific element types (Shorts, Ads).
*   **AdBlockGuard**: Monitors for the "Ad blockers violate YouTube's Terms of Service" popup and dismisses it non-intrusively.

### UI (`src/ui/`)

*   **Menu**: Renders the settings menu using standard `prompt` and `alert` dialogs (to keep the script lightweight and native-feeling, per [ADR-0005](adr/0005-native-ui-over-custom-modal.md)).
*   **I18N**: Manages translations. Auto-detects user language based on YouTube's `html` lang attribute or browser settings.

## 🔄 Data Flow

1.  **Initialization**: `main.js` instantiates `ConfigManager`, `StyleManager`, and `I18N`.
2.  **Observation**: `MutationObserver` (in `main.js`) watches `document.body` for changes.
3.  **Processing**:
    *   When nodes are added, `VideoFilter.processPage()` is triggered (debounced).
    *   `VideoFilter` queues elements for processing via `requestIdleCallback`.
    *   `LazyVideoData` extracts metadata (title, views) from the DOM.
    *   Rules are checked against the metadata.
    *   If a rule matches, the element is hidden (`display: none`) and flagged (`data-yp-hidden`).

## 🛠️ Design Decisions (ADRs)

See `docs/adr/` for detailed Architecture Decision Records.

*   **ADR-001**: CSS-First Filtering - Prefer CSS for static elements for best performance.
*   **ADR-002**: No External Dependencies - Keep the script self-contained and lightweight.
*   **ADR-006**: Lightweight Chinese Conversion - Use a compact mapping string instead of a full library.
