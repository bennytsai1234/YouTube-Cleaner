# Change: Hide Shorts Shelf with Native Attribute

## Why
YouTube has updated its homepage layout where Shorts shelves are explicitly marked with an `is-shorts` attribute on the `ytd-rich-shelf-renderer` element. While we have existing text-based filters, using native attributes with CSS `:has()` is more performant, reliable, and prevents visual flickering before JavaScript execution.

## What Changes
- Add a specific CSS rule in `StyleManager` to target `ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])`.
- Ensure this rule is tied to the `shorts_block` configuration setting.

## Impact
- Affected specs: `ui-cleaning`
- Affected code: `youtube-homepage-cleaner.user.js` (StyleManager module)
