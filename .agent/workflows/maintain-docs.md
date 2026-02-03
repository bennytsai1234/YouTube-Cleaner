---
description: Maintenance routine for project documentation
---

This workflow guarantees that documentation artifacts (README, CONTRIBUTING, CHANGELOG) remain synchronized with the codebase.

# Workflow Steps

1. **Sync README with Metadata**
   - Read `youtube-homepage-cleaner.user.js` metadata block (headers).
   - Ensure `README.md` and `README-greasyfork.md` reflect the current:
     - Version
     - Description
     - Supported browsers/managers (Tampermonkey, Violetmonkey, etc.)

2. **Feature Documentation Check**
   - Scan `src/` for exported features or config options.
   - Verify that all user-facing features (found in `config` or UI menus) are mentioned in `README.md`.
   - If new features are missing, draft a description update.

3. **Changelog Sanitation**
   - Read `CHANGELOG.md`.
   - Ensure the format adheres to `Keep a Changelog` standards.
   - Check for any "Unreleased" section and ensure strictly technical commit messages are humanized.

4. **Contributing Guide Review**
   - Ensure `CONTRIBUTING.md` reflects current workflows (e.g., mentioning `.agent/workflows`).
   - If the project structure has changed (e.g., new `src` folders), update the "Project Structure" section.

5. **Commit Documentation Updates**
   - // turbo
   - Run `git add docs/ README.md README-greasyfork.md CHANGELOG.md CONTRIBUTING.md`.
   - // turbo
   - Run `git commit -m "docs: update project documentation"` (only if changes exist).
