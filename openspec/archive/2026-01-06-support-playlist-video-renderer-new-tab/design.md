# Design: Support New Tab for Playlist Video Renderer

## Selector Updates

### `SELECTORS.VIDEO_CONTAINERS`
Add `ytd-playlist-video-renderer` to allow filtering logic to apply to playlist items.

### `SELECTORS.CLICKABLE`
Add `ytd-playlist-video-renderer` to allow the `InteractionEnhancer` to capture clicks on these elements and trigger the new tab logic.

## Link Candidate Check
The `ytd-playlist-video-renderer` contains `a#video-title`, which is already in `SELECTORS.LINK_CANDIDATES`.
```javascript
        LINK_CANDIDATES: [
            ...
            'a#video-title', 
            ...
        ],
```
So no change is needed for `LINK_CANDIDATES`.
