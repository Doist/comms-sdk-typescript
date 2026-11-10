import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { REPOSITORY, VERSION } from './release-policy.mjs'

export function compareRetainedArtifact(
    directory,
    sourceRun,
    download = (runId, artifact, target) => {
        execFileSync(
            'gh',
            [
                'run',
                'download',
                String(runId),
                '--repo',
                REPOSITORY,
                '--name',
                artifact,
                '--dir',
                target,
            ],
            { stdio: 'pipe' },
        )
    },
) {
    const retained = mkdtempSync(resolve(tmpdir(), 'comms-sdk-retained-'))
    try {
        download(sourceRun.id, `release-${sourceRun.id}-${sourceRun.run_attempt}`, retained)
        // Authenticate the whole manifest against GitHub's actual run artifact, not its own hashes.
        const manifest = readFileSync(resolve(retained, 'release.json'))
        assert.deepEqual(
            readFileSync(resolve(directory, 'release.json')),
            manifest,
            'Local release metadata differs from the authenticated build artifact',
        )
        const metadata = JSON.parse(manifest)
        assert.match(metadata.version, VERSION)
        assert.equal(metadata.filename, `todoist-comms-sdk-${metadata.version}.tgz`)
        assert.deepEqual(
            readFileSync(resolve(directory, metadata.filename)),
            readFileSync(resolve(retained, metadata.filename)),
            'Local tarball differs from the authenticated build artifact',
        )
    } finally {
        rmSync(retained, { recursive: true, force: true })
    }
}
