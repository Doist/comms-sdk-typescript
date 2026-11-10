import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compareRetainedArtifact } from './artifact-source.mjs'

describe('authenticated retained artifact binding', () => {
    it.each(['matching', 'replaced tarball', 'replaced metadata'])(
        'checks %s against the actual selected run artifact',
        (scenario) => {
            const directory = mkdtempSync(join(tmpdir(), 'artifact-fixture-'))
            const filename = 'todoist-comms-sdk-4.0.1.tgz'
            const metadata = JSON.stringify({ filename, version: '4.0.1', integrity: 'original' })
            try {
                writeFileSync(
                    join(directory, 'release.json'),
                    scenario === 'replaced metadata'
                        ? metadata.replace('original', 'forged')
                        : metadata,
                )
                writeFileSync(
                    join(directory, filename),
                    scenario === 'replaced tarball' ? 'forged' : 'original',
                )
                const download = (runId: number, artifact: string, target: string) => {
                    expect(runId).toBe(42)
                    expect(artifact).toBe('release-42-2')
                    writeFileSync(join(target, 'release.json'), metadata)
                    writeFileSync(join(target, filename), 'original')
                }
                const verify = () =>
                    compareRetainedArtifact(directory, { id: 42, run_attempt: 2 }, download)
                if (scenario === 'matching') expect(verify).not.toThrow()
                else expect(verify).toThrow(/differs from the authenticated build artifact/)
            } finally {
                rmSync(directory, { recursive: true, force: true })
            }
        },
    )
})
