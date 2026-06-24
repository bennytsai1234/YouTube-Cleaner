# Fix Secondary New Tab

## Task Type

Bug

## Confirmed Before

Playback-page recommendations in the right-side column are handed back to YouTube before the open-in-new-tab handling runs. Clicking a lockup card text area can therefore navigate in the current page even when the new-tab preference is enabled.

## Confirmed After

Right-side recommendation video cards will use the same new-tab handling as other video cards, while non-video controls remain excluded. A regression test will cover clicking a lockup text container without a direct anchor target.

## Expected File Scope

- `src/features/interaction.ts`
- `test/interaction-test.ts`
- generated userscript bundle after build

## Verification

- Run the targeted interaction test.
- Run the project verification command.

## Rollback

Revert the code, test, generated bundle, and this plan/completed change note.
