# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- None

### Changed
- None

### Fixed
- None

---

## [1.8.7] - 2026-01-25

### Fixed
- **Notification Interaction**: Fixed a regression in `src/` modules where enhanced notification click blocking was missing, causing `v1.8.5/v1.8.6` builds to lose the feature.
    - Re-synced logic to support `ytd-comment-video-thumbnail-header-renderer` and `a[href*="/watch?"]` correctly.
    - Ensures comment replies with video thumbnails in the notification dropdown properly open in a new tab.

---

## [1.8.6] - 2026-01-25

### Changed
- **Performance Optimization**:
    - Switched from `innerText` to `textContent` for text filtering, significantly reducing layout thrashing (Reflow) during scrolling.
    - Implemented **Throttling** (250ms) for `AdBlockGuard` to reduce CPU usage during rapid page mutations.
    - Implemented **Singleton Pattern** for `ConfigManager` to ensure state consistency across modules.

---

## [1.8.5] - 2026-01-25

### Fixed
- **AdBlockGuard Initialization**: Implemented **Smart Retry** mechanism. Instead of a hard 2-second delay, it now retries connection to the popup container every 500ms (up to 5s), fixing race conditions on slow connections.
- **Menu Input Validation**: Added `NaN` checks for numeric inputs (Threshold, Duration) to prevent settings corruption from invalid user input.
- **Utils Robustness**:
    - Updated time parser regex to support floating point values (e.g., "1.5 hours").
    - Enhanced duration parser to handle edge cases better.

---

## [1.8.4] - 2026-01-25

### Fixed
- **Notification Panel: Comment Video Thumbnail Not Opening in New Tab**: Fixed an issue where clicking on video thumbnails in comment notifications (`ytd-comment-video-thumbnail-header-renderer`) did not trigger the "open in new tab" behavior.
    - Extended notification panel detection to include: `ytd-notification-renderer`, `ytd-comment-video-thumbnail-header-renderer`, and `#sections.ytd-multi-page-menu-renderer`.
    - Also improved link detection to include `a[href*="/watch?"]` in addition to `a.yt-simple-endpoint`.

---

## [1.8.3] - 2026-01-25

### Fixed
- **Critical: Settings Not Persisting (New Tab, Low View Filter, etc.)**: Fixed a bug where several settings were not being saved/loaded correctly.
    - **Root Cause**: `ConfigManager.defaults` was missing 6 key configuration entries: `OPEN_IN_NEW_TAB`, `OPEN_NOTIFICATIONS_IN_NEW_TAB`, `ENABLE_LOW_VIEW_FILTER`, `LOW_VIEW_THRESHOLD`, `DEBUG_MODE`, `ENABLE_REGION_CONVERT`.
    - Since these keys were not in `defaults`, the `_load()` method never restored them from storage, causing settings to reset on page reload.
    - **Reported by**: User "Leadra" on Greasy Fork.

### Changed
- **Dynamic Version Display**: Menu and export now use `GM_info.script.version` instead of hardcoded strings.
- **Default Settings Changed**: All filter options now default to **enabled**:
    - `ENABLE_LOW_VIEW_FILTER`: false → true
    - `ENABLE_CHANNEL_FILTER`: false → true
    - `ENABLE_DURATION_FILTER`: false → true
    - `DEBUG_MODE`: false → true

---

## [1.8.2] - 2026-01-24

### Fixed
- **Critical: Filtering Broken Since v1.8.0**: Fixed a critical regression where all filtering rules stopped working.
    - **Root Cause**: In v1.8.0, `ConfigManager.defaults` was accidentally renamed to `ConfigManager.DEFAULT_SETTINGS`, but `_load()` method still referenced `this.defaults`.
    - This caused `this.defaults` to be `undefined`, resulting in an empty configuration loop and no rules being applied.
    - **Impact**: All keyword, channel, section, and custom rule filtering was non-functional in v1.8.0 and v1.8.1.

---

## [1.8.1] - 2026-01-23

### Changed
- **Performance Optimization**: Deep optimization of `Utils` class including pre-compiled regexes and optimized numeric parsing to reduce GC pressure.
- **Selector Caching**: Static caching of complex selector strings to improve MutationObserver performance.

### Added
- **Test Coverage**: Added comprehensive JSDOM-based unit tests for `CustomRuleManager` and `LazyVideoData` to ensure stability.

---

## [1.8.0] - 2026-01-22

### Added
- **Section Blocker (Shelf Filter)**: Added a new feature to hide entire homepage sections/shelves based on their title.
    - Users can now filter out sections like "New to you" (耳目一新), "Relive old favorites" (重溫舊愛), "Mixes" (合輯), "Latest posts", etc.
    - **Settings UI**: Added "Section Filter" options in the Advanced Menu.
    - **Default Blacklist**: Pre-populated with common clutter sections.
    - **Regex Support**: Supports keywords and regular expressions.

---

## [1.7.9] - 2026-01-22

### Fixed
- **Ghost Element Logic**: Removed `offsetParent` check which prevented processing of already-hidden elements.
    - Previously, the script skipped elements that YouTube had "soft hidden" (making `offsetParent` null), causing them to retain clickable areas without our rigorous `!important` overrides.
    - This ensures `native_hidden` logic now correctly applies to *all* hidden elements, guaranteeing they are completely removed from layout and interaction.

---

## [1.7.8] - 2026-01-22

### Fixed
- **Ghost Element Clickable**: Fixed an issue where elements hidden by YouTube (using the `hidden` attribute) remained clickable and occupied space.
    - The script now strictly enforces `display: none !important` on any container marked with the native `hidden` attribute.
    - Prevents "empty" slots that redirect to videos when clicked.

---

## [1.7.7] - 2026-01-22

### Fixed
- **Interaction Safety**: Prevented clicks on hidden elements by adding a `data-yp-hidden` check in `InteractionEnhancer`.
- **Hiding Logic Consistency**: Unified playlist hiding logic into `VideoFilter` (JavaScript) instead of pure CSS.
- **Style Robustness**: Enforced `display: none !important` and `visibility: hidden !important` to prevent YouTube from overriding hidden states.

---

## [1.7.5] - 2026-01-19

### Fixed
- **Code Quality & Linting**: Fixed multiple code quality issues reported by ESLint.
    - Removed duplicate method definitions in `VideoFilter` class to prevent potential behavior ambiguity.
    - Added missing global declaration for `OpenCC` in utility module.
    - Removed unused imports to keep bundle size optimized.
- **Stability**: Enhanced robust error handling in `processMutations` to ensure filter continuity.

---

## [1.7.4] - 2026-01-19

### Fixed
- **Layout Gap Persistence with Shorts/Posts**: Fixed an issue where filtering out Shorts or Posts would leave visible gaps in the video grid.
    - The `_hide()` method now correctly targets `ytd-rich-section-renderer` containers (parent of Shorts/Posts shelves) in addition to individual video items.
    - Added CSS rules for `posts_block` to hide sections containing `ytd-post-renderer` and `ytd-backstage-post-renderer`.
    - This ensures filtered section elements are fully removed from the Flexbox flow, allowing remaining videos to correctly fill the space.

### Changed
- **Dynamic Version Display**: The settings menu now displays the version number dynamically using `GM_info.script.version` instead of hardcoded strings.

---

## [1.7.3] - 2026-01-18

### Fixed
- **State Machine Scheduler**: Completely refactored the filtering engine to use a **Single Task Queue** and a **State Machine**.
    - Prevents "Race Conditions" and CPU spikes caused by multiple concurrent filtering loops (especially when clicking the "New to you" chip).
    - Ensures only one idle-time processing cycle exists globally.
    - Added comprehensive `try-catch` blocks to prevent individual element errors from crashing the entire script.

---

## [1.7.2] - 2026-01-18

### Fixed
- **Freeze/Crash on Chip Click**: Fixed a critical issue where clicking category chips (e.g. "Music", "Live") caused the page to freeze.
    - Implemented **Mutation Queue + Debounce (50ms)** to handle high-frequency DOM updates safely.
    - Added **Performance Guard**: Automatically switches to efficient Full Scan mode if mutation count exceeds 100, avoiding expensive loop iterations.

---

## [1.7.1] - 2026-01-18

### Fixed
- **Layout Gap (Ghost Element)**: Fixed an issue where hiding a video would leave an empty, clickable whitespace.
    - Now correctly identifies and hides the parent Grid Item container (`ytd-rich-item-renderer`, etc.) instead of just the inner content.
    - Ensures YouTube's layout engine correctly reflows the grid.

---

## [1.7.0] - 2026-01-18

### Changed
- **Performance Optimization**: Replaced full-page scanning with **Incremental Mutation Processing**.
    - Now uses `MutationObserver` records to check only *added nodes*.
    - Significantly reduces CPU usage during infinite scrolling on Home/Shorts.
    - Combined with `requestIdleCallback` for buttery smooth performance.
- **Scroll Behavior**: Disabled `AdBlockGuard`'s scroll unlocking mechanism.

---

## [1.6.8] - 2026-01-07

### Fixed
- **Build System Sync**: Fixed `src/` source files not reflecting OpenCC-JS migration
    - Updated `src/meta.json` to use opencc-js CDN
    - Updated `src/main.js` startup logging to detect OpenCC
    - Version number now dynamically read from `GM_info.script.version`

---

## [1.6.7] - 2026-01-07

### Changed
- **Chinese Conversion Engine**: Replaced `chinese-conv` with `opencc-js@1.0.5`
    - Far superior accuracy with phrase-level conversion support
    - Coverage increased from ~500 to 8000+ character pairs
    - Supports regional variants (Taiwan, Hong Kong, Mainland)
    - Graceful fallback to internal dictionary if CDN fails

### Removed
- **Zero External Dependencies Principle**: Updated project guidelines to allow carefully selected external libraries with fallback mechanisms (see ADR-0002, ADR-0006)

---

## [1.6.6] - 2026-01-07

### Added
- **Enhanced Keyword Filtering**:
    - Full support for Traditional/Simplified Chinese character interoperability.
    - Keywords like "预告" will now correctly block videos with "預告" in the title.
    - Implemented Zero-Allocation regex-based filtering for maximum performance.
- **Rich Grid Support**: Fixed keyword filtering for the new YouTube `Rich Grid` layout where titles were previously undetected.

### Changed
- **Performance**:
    - Upgraded filtering engine to use pre-compiled regex matching.
    - Removed expensive runtime string conversions during scrolling.

---

## [1.6.5] - 2026-01-06

### Changed
- **Playlist Logic Refinement**:
    - Disabled **filtering** for `ytd-playlist-video-renderer` (items in Watch Later/Playlists). Your personal lists will no longer be hidden by view count or keyword filters.
    - Kept **interaction** support: "Open in New Tab" still works for these items.

---

## [1.6.4] - 2026-01-06

### Added
- **Playlist Video Support**: Added "Force New Tab" support for `ytd-playlist-video-renderer`. (Note: Filtering support was added but reverted in v1.6.5 due to UX concerns).

---

## [1.6.2] - 2026-01-04

### Changed
- **Default Language**: Changed fallback language from English to Traditional Chinese (zh-TW)
- Language detection now explicitly checks for English before falling back
- Non-supported languages (French, German, etc.) now default to Traditional Chinese

---

## [1.6.1] - 2026-01-04

### Added
- **Notification New Tab**: Force notification clicks to open in new tabs
- New menu option: "強制新分頁 (通知)" / "Force New Tab (Notif)"

### Changed
- Updated i18n strings for notification feature across all 4 languages

---

## [1.6.0] - 2025-12-26

### Added
- 🚀 **Complete Architecture Rewrite**: Modular ES6 class-based design
- 🌐 **Internationalization (i18n)**: Full support for zh-TW, zh-CN, en, ja
- 📊 **Filter Statistics Panel**: Visualize filtered content counts
- 💾 **Settings Export/Import**: Backup and restore configurations
- 🛡️ **Anti-Adblock Guard 2.0**: Whitelist mechanism to avoid false positives
- ⚡ **Performance Optimization**: `requestIdleCallback` and smart debouncing

### Changed
- Reorganized codebase into 10+ focused modules
- Improved selector resilience for YouTube A/B tests

### Fixed
- Resolved false positive on membership join dialogs

---

## [1.5.7] - 2025-12-20

### Added
- Support for new YouTube layout (`yt-lockup-view-model`)

### Changed
- Updated metadata parser for new DOM structure
- Updated duration parser accuracy

---

## [1.5.6] - 2025-12-15

### Fixed
- Restored all v1.4.0 features that were accidentally removed in v1.5.x

---

## [1.5.2] - 2025-12-10

### Changed
- Deep refactoring of core filtering engine
- Enhanced anti-detection mechanisms

### Fixed
- Performance improvements for scrolling

---

## [1.4.0] - 2025-11-01

### Added
- Initial public release with 15+ filter rules
- Low view count filtering with grace period
- Keyword and channel blacklist
- Duration filtering
- Anti-adblock popup removal
- New tab opening for videos

---

[Unreleased]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.7...HEAD
[1.8.7]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.6...v1.8.7
[1.8.6]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.5...v1.8.6
[1.8.5]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.4...v1.8.5
[1.8.4]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.3...v1.8.4
[1.8.3]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.2...v1.8.3
[1.8.2]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.1...v1.8.2
[1.8.1]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.0...v1.8.1
[1.8.0]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.7.9...v1.8.0
[1.7.9]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.7.8...v1.7.9
[1.7.8]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.7.7...v1.7.8
[1.7.7]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.7.5...v1.7.7
[1.7.5]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.7.4...v1.7.5
[1.7.4]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.7.3...v1.7.4
[1.7.3]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.7.2...v1.7.3
[1.7.2]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.6.8...v1.7.0
[1.6.8]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.6.7...v1.6.8
[1.6.7]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.6.6...v1.6.7
[1.6.6]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.6.5...v1.6.6
[1.6.5]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.6.4...v1.6.5
[1.6.4]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.6.2...v1.6.4
[1.6.2]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.5.7...v1.6.0
[1.5.7]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.5.6...v1.5.7
[1.5.6]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.5.2...v1.5.6
[1.5.2]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.4.0...v1.5.2
[1.4.0]: https://github.com/bennytsai1234/youtube-homepage-cleaner/releases/tag/v1.4.0
