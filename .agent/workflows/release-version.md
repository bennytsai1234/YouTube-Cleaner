---
description: Automate the version release process (Bump version, Update Changelog, Tagging)
---

This workflow automates the release process following the project's guidelines in `GEMINI.md`.

# Prerequesites
- Ensure you are on the development branch (e.g., `beta`) or the branch you intend to release from.
- Ensure the working directory is clean (`git status`).

# Workflow Steps

1. **Verify Codebase Integrity**
   - Run `npm run test` (if available) or `npm run lint` to ensure code quality.
   - // turbo
   - Run `git status` to confirm a clean state.

2. **Determine New Version**
   - Check the current version in `package.json`.
   - Ask the user for the new version number (e.g., `1.8.0`).

3. **Bump Version in Files**
   - **`package.json`**: Update the `version` field.
   - **`youtube-homepage-cleaner.user.js`**: Update the `// @version` header.
   - **`src/*.js`**: Check if any other files contain hardcoded version numbers.

4. **Update Changelog**
   - Read `CHANGELOG.md`.
   - Read recent git commits since the last tag using `git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:"- %s (%h)"`.
   - Append the new version section to `CHANGELOG.md` with the date.
   - Categorize changes into `Features`, `Bug Fixes`, `Maintenance`.

5. **Commit Release Changes**
   - // turbo
   - Run `git add package.json youtube-homepage-cleaner.user.js CHANGELOG.md`.
   - // turbo
   - Run `git commit -m "chore: release v<NEW_VERSION>"` (replace `<NEW_VERSION>` with the actual number).

6. **Merge to Main (if applicable)**
   - If currently on `beta` or a specific feature branch:
     - // turbo
     - Run `git checkout main`.
     - // turbo
     - Run `git pull origin main`.
     - // turbo
     - Run `git merge <PREVIOUS_BRANCH>`.

7. **Create Git Tag**
   - // turbo
   - Run `git tag v<NEW_VERSION>`.
   - Run `git tag -n` to verify.

8. **Finalize**
   - Switch back to the development branch (e.g., `git checkout beta`).
   - Remind the user to push tags: `git push origin main --tags`.
