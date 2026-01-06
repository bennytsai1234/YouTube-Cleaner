# Proposal: Fix Title Selection for Rich Grid Layouts

## Why
The user reported that keyword filtering failed for a specific video layout (`ytd-rich-item-renderer` containing `yt-lockup-view-model`). The provided HTML snippet shows that the title is contained within an `h3` element's `title` attribute or its inner `span`, which the current selector strategy might be missing or misinterpreting.

## What Changes
- **Selectors**: Update `src/data/selectors.js` to include specific selectors for `yt-lockup-metadata-view-model__heading-reset`.
- **Logic**: Update `LazyVideoData` in `src/features/video-filter.js` to prioritize reading the `title` attribute of the heading element if available, as it provides the full, un-truncated text.

## Impact
- **Accuracy**: Ensures videos in the new grid layout are correctly filtered.
