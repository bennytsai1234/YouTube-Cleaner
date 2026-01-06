# Tasks: Refactor to Modular Architecture

## Phase 1: Tooling Setup
- [x] Install dev dependencies (`rollup`, `@rollup/plugin-node-resolve`, `rollup-plugin-cleanup`) <!-- id: 1 -->
- [x] Create `rollup.config.mjs` <!-- id: 2 -->
- [x] Create `src` directory and move `youtube-homepage-cleaner.user.js` content to `src/main.js` (temporarily as one file) <!-- id: 3 -->
- [x] Add `build` script to `package.json` <!-- id: 4 -->
- [x] Verify that `npm run build` generates a valid `youtube-homepage-cleaner.user.js` in root (or dist) <!-- id: 5 -->

## Phase 2: Data Extraction
- [x] Extract `SELECTORS` to `src/data/selectors.js` <!-- id: 6 -->
- [x] Extract `I18N` to `src/ui/i18n.js` <!-- id: 7 -->
- [x] Extract `Utils` to `src/core/utils.js` <!-- id: 8 -->
- [x] Extract `Logger` to `src/core/logger.js` <!-- id: 9 -->

## Phase 3: Logic Extraction
- [x] Extract `ConfigManager` to `src/core/config.js` <!-- id: 10 -->
- [x] Extract `CustomRuleManager` to `src/features/custom-rules.js` <!-- id: 11 -->
- [x] Extract `StyleManager` to `src/features/style-manager.js` <!-- id: 12 -->
- [x] Extract `AdBlockGuard` to `src/features/adblock-guard.js` <!-- id: 13 -->
- [x] Extract `LazyVideoData` & `VideoFilter` to `src/features/video-filter.js` <!-- id: 14 -->
- [x] Extract `InteractionEnhancer` to `src/features/interaction.js` <!-- id: 15 -->
- [x] Extract `UIManager` to `src/ui/menu.js` <!-- id: 16 -->
- [x] Extract `App` to `src/main.js` (entry point) <!-- id: 17 -->

## Phase 4: Integration
- [x] Update `.github/workflows/release.yml` to build assets <!-- id: 18 --> (Skipped: We commit build artifacts)
- [x] Update `.gitignore` (ignore build artifacts if using dist, but for GreasyFork we might keep root file committed - **Decision: Keep root file committed for GreasyFork direct link**) <!-- id: 19 -->
- [x] Final verification of the generated script functionality <!-- id: 20 -->
- [x] Update `package.json` lint script <!-- id: 21 -->
