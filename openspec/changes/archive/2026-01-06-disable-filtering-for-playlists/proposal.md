# Proposal: Disable Filtering for Playlist Items

## Problem
In v1.6.4, `ytd-playlist-video-renderer` was added to `VIDEO_CONTAINERS`, which subjected items in "Watch Later" and personal playlists to filtering logic (low views, keywords, etc.).
Users explicitly add videos to these lists, so they should not be hidden by automated filters.

## Proposed Solution
Remove `ytd-playlist-video-renderer` from `SELECTORS.VIDEO_CONTAINERS` but keep it in `SELECTORS.CLICKABLE`.

## Impact
- **Interaction**: "Open in New Tab" will still work for playlist items.
- **Filtering**: Filtering rules will NO LONGER apply to playlist items. "Watch Later" will show all videos regardless of view count or keywords.

## Proposed Version
v1.6.5
