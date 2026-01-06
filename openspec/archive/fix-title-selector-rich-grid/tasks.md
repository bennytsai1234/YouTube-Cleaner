# Tasks: Fix Title Selector

- [x] **Update Selectors** <!-- id: 1 -->
  - Modify `src/data/selectors.js`.
  - Add `.yt-lockup-metadata-view-model__heading-reset` to `METADATA.TITLE`.
- [x] **Update Title Extraction Logic** <!-- id: 2 -->
  - Modify `src/features/video-filter.js`.
  - In `LazyVideoData.get title()`, add logic to check `element.title` property first if the element is a heading, as it contains the full text.
