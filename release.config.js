/** @type {import('semantic-release').GlobalConfig} */
export default {
    branches: ['main', { name: 'next', prerelease: true }],
    // Scope-independent history: v4.0.0 remains the baseline for the first new-scope 4.0.1.
    tagFormat: 'v${version}',
    // Analysis only. The separate publisher records tags/releases after BOTH registries match.
    dryRun: true,
    plugins: ['./scripts/release-analysis.mjs'],
}
