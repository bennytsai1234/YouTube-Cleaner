# Proposal: Support New Tab for Playlist Video Renderer

## Problem
Users cannot use the "Force New Tab" feature on playlist video items (`ytd-playlist-video-renderer`), which are commonly found in "Watch Later" or other playlist pages.

## Proposed Solution
Add `ytd-playlist-video-renderer` to the `SELECTORS.CLICKABLE` and `SELECTORS.VIDEO_CONTAINERS` lists in `youtube-homepage-cleaner.user.js`.

## Impact
- **Interaction**: Clicks on playlist video items will now correctly open in a new tab when "Force New Tab (Video)" is enabled.
- **Filtering**: These items will also be subject to the same filtering logic as other video renderers (e.g., keyword filtering).

## Proposed Version
v1.6.4
