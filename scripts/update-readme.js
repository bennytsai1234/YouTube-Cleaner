import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Read package.json to get the new version
const pkgPath = join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

// Read README.md
const readmePath = join(process.cwd(), 'README.md');
let readme = readFileSync(readmePath, 'utf8');

// Update Version Badge
// Pattern: [![Version](https://img.shields.io/badge/version-v1.9.3-orange...
// We use a regex to replace the version part
const badgeRegex = /(https:\/\/img\.shields\.io\/badge\/version-v)[\d\.]+(-orange)/;

if (badgeRegex.test(readme)) {
    readme = readme.replace(badgeRegex, `$1${version}$2`);
    console.log(`✅ Updated README badge to v${version}`);
} else {
    console.warn('⚠️ Could not find version badge in README.md');
}

// Update Installation Link (in case it hardcoded version, though it usually points to main)
// Current link: https://raw.githubusercontent.com/.../youtube-homepage-cleaner.user.js
// It seems fine as it points to main branch.

writeFileSync(readmePath, readme);
