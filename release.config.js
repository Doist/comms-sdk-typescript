// The former stable-only changelog/git prepare hooks are completed by record-release.mjs
// AFTER exact-artifact dual publication. Build analysis must never commit these files.
export const stableSourceRecordAssets = ['CHANGELOG.md', 'package.json', 'package-lock.json']

/** @type {import('semantic-release').GlobalConfig} */
export default {
    branches: ['main', { name: 'next', prerelease: true }],
    // Scope-independent history: v4.0.1, the last @doist/comms-sdk release, is the baseline for the
    // first @todoist/comms-sdk release, 5.0.0.
    tagFormat: 'v${version}',
    // Analysis only. The separate publisher records tags/releases after BOTH registries match.
    dryRun: true,
    plugins: ['./scripts/release-analysis.mjs'],
}
