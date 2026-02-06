# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.2] - 2026-02-06

### 🚀 Architecture & I18n Refactor
- **Refactor**: Centralized all UI strings and detection patterns into `src/ui/i18n.ts`.
- **Improved**: Language detection now uses YouTube's internal `yt.config_` for higher reliability.
- **Improved**: Enhanced members-only video detection with multi-language support (TW/CN/EN/JA).
- **Optimization**: Moved static UI blocks (Premium banner, surveys, etc.) to CSS-first filtering to eliminate flickering.
- **Logic**: Introduced `RULE_PRIORITIES` to ensure critical filters (like Members-only) override channel whitelists.

## [2.0.1] - 2026-02-06

### 🛡️ Reliability & Whitelist Enhancement
- **Strong/Weak Filtering**: Implemented a layered filtering system.
    - **Strong Filters**: Shorts, Mixes, and Members-only videos are prioritized for removal.
    - **Weak Filters**: Low view counts, duration, and keywords can be bypassed by the whitelist.
- **Dedicated Whitelist Menu**: Centralized all whitelist management (Channel, Members, Keywords) into a focused sub-menu with universal icons (🛡️/🚫).
- **Members-Only Whitelist**: Added a specific whitelist for members-only videos, allowing users to support favorite creators while still filtering other member content.

### 🐛 Critical Bug Fixes
- **Circular Dependency**: Resolved a fatal race condition between `Utils.js` and `I18N.js` that caused regex compilation to fail silently.
- **Settings Integrity**: Fixed a data contamination issue where internal regex caches were being included in JSON exports.
- **Invisible Character Handling**: Implemented aggressive channel name cleaning to strip hidden Unicode characters (ZWSP) and UI-injected sentence fragments from YouTube Live labels.
- **Fail-safe Logic**: Added a string-based fallback mechanism for whitelists if the regex engine fails during initialization.

### 🎨 UI & UX Improvements
- **Layout Support**: Added full compatibility for the new `yt-lockup-view-model` YouTube layout.
- **Precision Logging**: Enhanced developer logs to display exact numerical comparisons (e.g., `Actual: 99 < Threshold: 1000`) and raw DOM text.
- **Menu Pagination**: Implemented pagination for the Rule Menu to prevent text truncation in browser prompt dialogs.

## [2.0.0] - 2026-02-05

### 🚀 Major Architecture Overhaul
- **Decoupled Core Logic**: Refactored the monolithic `App` controller into focused modules.
    - Moved `AdBlockGuard` configuration patching to its own module.
    - Encapsulated `MutationObserver` logic within `VideoFilter` (`start`/`stop` methods).
- **Selector Health Check (Debug)**: Added a new "Self-Healing" diagnostic tool.
    - In Debug Mode, the script now automatically validates if critical CSS selectors (Titles, Metadata) are finding elements on the page.
    - Logs specific warnings if YouTube's DOM structure has changed, enabling faster fixes.

### Changed
- **Robustness**: Improved the initialization sequence to ensure `AdBlockGuard` patches YouTube's config *before* any other logic runs.
- **Maintenance**: Cleaned up `main.js` to serve as a pure composition root.

---

## [1.9.3] - 2026-01-28

### Added
- **Core Logic Tests**: Introduced comprehensive unit tests (`test/logic-test.js`) to verify the stability of keyword filtering, view count logic, and duration filters.
- **Testing Infrastructure**: Unified test commands. `npm run test` now executes both logic and utility tests.

---

## [1.9.2] - 2026-01-26

### Fixed
- **Page-Aware Filtering**: The script now intelligently detects "Trusted Pages" to prevent accidental cleaning of user content.
    - **Safe Pages**: Playlists Feed (`/feed/playlists`), Library (`/feed/library`), Subscriptions (`/feed/subscriptions`), and Channel Playlists (`/@.../playlists`).
    - On these pages, content-based filters (Low views, Duration, Playlists) are **disabled**, while Ad Blocking remains active.
    - Resolves issue where the "Playlists" page would appear empty because the script hid all playlists as "recommendations".
- **Menu UX Fix**: Fixed navigation in "Manage List" sub-menus (Keywords, Channels, etc.).
    - Previously, clicking "Cancel" would return to the parent menu instead of closing, requiring a second cancellation.
    - Now, "Cancel" or "Empty OK" immediately closes the menu system.
    - Added "Loop-back" behavior: After adding/removing an item, the menu stays in the list manager for easier bulk editing.

---

## [1.9.1] - 2026-01-26

### Fixed
- **User Playlist Whitelist**: Fixed an issue where the user's own playlists (Liked Videos, Watch Later, Favorites) were being hidden by the "Recommended Playlists" filter.
    - Added specific checks for `list=LL`, `list=WL`, `list=FL`.
    - Added metadata analysis to whitelist playlists containing "Private", "Unlisted", "Public" (and Chinese equivalents) in their description, identifying them as user-owned content rather than algorithmic recommendations.

---

## [1.9.0] - 2026-01-25

### Changed
- **Menu UX Improvement**: Split "Low View Settings" into two separate menu options for better usability.
    - **Option 3**: Set View Threshold (設定閾值)
    - **Option 4**: Set Grace Period (設定豁免期)
    - This change resolves issues with browser popup blocking and makes configuration more straightforward.

---

## [1.8.9] - 2026-01-25

### Added
- **Customizable low View Grace Period**: Users can now set the "Grace Period" (豁免期) for low view count filtering directly from the main menu (Option 3).
    - Setting it to `0` disables the grace period, filtering strictly by view count.
    - Default remains 4 hours.
    - The menu now displays both Threshold and Grace Period (e.g., `1000 / 4h`).

---

## [1.8.8] - 2026-01-25

### Fixed
- **Mix Filter Logic**: Fixed an issue where "Mix" (合輯) videos in the new Rich Grid layout were not being correctly identified as playlists.
    - Updated `isPlaylist` logic to detect `list=` parameters in watch URLs (common for Mixes).
    - Added fallback checks for Badge text ("合輯") and Title keywords.
    - Relaxed the regex for `mix_only` rule to better handle leading whitespace in text content.

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

<details>
<summary>📁 <b>Historical Versions (v1.7.9 and older)</b></summary>
<br>

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

</details>

---

[Unreleased]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.9.3...HEAD
[1.9.3]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.9.2...v1.9.3
[1.9.2]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.9.1...v1.9.2
[1.9.1]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.9.0...v1.9.1
[1.9.0]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.9...v1.9.0
[1.8.9]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.8...v1.8.9
[1.8.8]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.7...v1.8.8
[1.8.7]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.6...v1.8.7
[1.8.6]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.5...v1.8.6
[1.8.5]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.4...v1.8.5
[1.8.4]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.3...v1.8.4
[1.8.3]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.2...v1.8.3
[1.8.2]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.1...v1.8.2
[1.8.1]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.8.0...v1.8.1
[1.8.0]: https://github.com/bennytsai1234/youtube-homepage-cleaner/compare/v1.7.9...v1.8.0
