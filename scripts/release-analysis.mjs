import assert from 'node:assert/strict'
import { analyzeCommits as analyze } from '@semantic-release/commit-analyzer'
import { generateNotes as notes } from '@semantic-release/release-notes-generator'

// The last release published as `@doist/comms-sdk`. Renaming the package is a breaking change for
// every consumer, so the first `@todoist/comms-sdk` release after it must be a major (5.0.0), and it
// must come from main before any new-scope prerelease.
const LAST_DOIST_SCOPE_RELEASE = '4.0.1'

export async function analyzeCommits(config, context) {
    const type = await analyze({ ...config, preset: 'conventionalcommits' }, context)
    // Tags remain v<version> across the rename. Never reinterpret old tags as unpublished 1.0.0.
    assert.ok(context.lastRelease.version, 'Existing v<version> release history is required')
    if (context.lastRelease.version === LAST_DOIST_SCOPE_RELEASE) {
        assert.equal(
            context.branch.name,
            'main',
            'Publish stable 5.0.0 before starting new-scope next',
        )
        assert.equal(
            type,
            'major',
            'The first @todoist/comms-sdk release must be a major: merge the scope change with a breaking-change title (feat!:)',
        )
    }
    return type
}

export async function generateNotes(config, context) {
    return notes({ ...config, preset: 'conventionalcommits' }, context)
}
