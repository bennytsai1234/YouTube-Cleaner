import { readFileSync } from 'fs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const readText = (path) => readFileSync(path, 'utf8');

const failures = [];
const checks = [];

const record = (ok, message) => {
    checks.push({ ok, message });
    if (!ok) failures.push(message);
};

const expectEqual = (label, actual, expected) => {
    record(actual === expected, `${label}: expected "${expected}", got "${actual}"`);
};

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const meta = readJson('src/meta.json');
const readme = readText('README.md');
const userscript = readText('youtube-homepage-cleaner.user.js');

const version = pkg.version;
const repoUrl = pkg.repository?.url || '';
const repoMatch = repoUrl.match(/github\.com\/([^/]+\/[^/.]+)(?:\.git)?$/i);
const repoSlug = repoMatch?.[1] || 'bennytsai1234/YouTube-Cleaner';
const rawScriptUrl = `https://raw.githubusercontent.com/${repoSlug}/main/youtube-homepage-cleaner.user.js`;

record(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version), `package.json version is semver-like: ${version}`);
expectEqual('package-lock.json top-level version', lock.version, version);
expectEqual('package-lock.json root package version', lock.packages?.['']?.version, version);
expectEqual('src/meta.json version', meta.version, version);
expectEqual('src/meta.json downloadURL', meta.downloadURL, rawScriptUrl);
expectEqual('src/meta.json updateURL', meta.updateURL, rawScriptUrl);

record(
    readme.includes(`https://img.shields.io/badge/version-v${version}-orange`),
    `README version badge should point to v${version}`
);
record(
    readme.includes(`https://github.com/${repoSlug}/releases`),
    `README release link should use ${repoSlug}`
);
record(
    readme.includes(rawScriptUrl),
    'README install link should match src/meta.json downloadURL'
);

const userscriptVersion = userscript.match(/^\s*\/\/\s*@version\s+(.+)$/m)?.[1]?.trim();
const userscriptDownload = userscript.match(/^\s*\/\/\s*@downloadURL\s+(.+)$/m)?.[1]?.trim();
const userscriptUpdate = userscript.match(/^\s*\/\/\s*@updateURL\s+(.+)$/m)?.[1]?.trim();

expectEqual('userscript @version', userscriptVersion, version);
expectEqual('userscript @downloadURL', userscriptDownload, meta.downloadURL);
expectEqual('userscript @updateURL', userscriptUpdate, meta.updateURL);

for (const check of checks) {
    const prefix = check.ok ? 'PASS' : 'FAIL';
    console.log(`${prefix} ${check.message}`);
}

if (failures.length > 0) {
    console.error(`\nRelease consistency check failed with ${failures.length} issue(s).`);
    process.exit(1);
}

console.log('\nRelease consistency check passed.');
