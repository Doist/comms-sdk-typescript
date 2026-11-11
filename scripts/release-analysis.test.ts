import { describe, expect, it } from 'vitest'
import { requireRecordedPlans, requireUnallocatedVersion } from './pending-release.mjs'
import { analyzeCommits } from './release-analysis.mjs'

const context = (version: string, message: string, branch = 'main') => ({
    lastRelease: { version },
    branch: { name: branch },
    commits: [{ hash: 'a'.repeat(40), message }],
    cwd: process.cwd(),
    logger: { log: () => {} },
})

describe('release lineage', () => {
    it('releases the scope change on the last @doist/comms-sdk release as a major', async () => {
        await expect(
            analyzeCommits({}, context('4.0.1', 'feat!: publish as @todoist/comms-sdk')),
        ).resolves.toBe('major')
    })
    it('continues normal conventional commit analysis after the first release', async () => {
        await expect(analyzeCommits({}, context('5.0.0', 'fix: repair pagination'))).resolves.toBe(
            'patch',
        )
        await expect(analyzeCommits({}, context('5.0.0', 'feat: add endpoint'))).resolves.toBe(
            'minor',
        )
        await expect(analyzeCommits({}, context('5.0.0', 'chore: update docs'))).resolves.toBeNull()
    })
    it('stops rather than resetting history or releasing the scope change as less than a major', async () => {
        await expect(analyzeCommits({}, context('', 'feat!: migrate scope'))).rejects.toThrow()
        await expect(analyzeCommits({}, context('4.0.1', 'fix: migrate scope'))).rejects.toThrow(
            /must be a major/,
        )
        await expect(analyzeCommits({}, context('4.0.1', 'feat: new endpoint'))).rejects.toThrow(
            /must be a major/,
        )
        await expect(analyzeCommits({}, context('4.0.1', 'chore: migrate scope'))).rejects.toThrow(
            /must be a major/,
        )
        await expect(
            analyzeCommits({}, context('4.0.1', 'feat!: migrate scope', 'next')),
        ).rejects.toThrow(/before starting new-scope next/)
    })
    it('rejects an already-tagged prerelease even when its channel note is still missing', () => {
        // Without the next channel note, semantic-release can propose this version again.
        expect(() =>
            requireUnallocatedVersion('5.1.0-next.1', (tag: string) => tag === 'v5.1.0-next.1'),
        ).toThrow(/already tagged/)
        expect(() =>
            requireUnallocatedVersion('5.1.0-next.2', (tag: string) => tag === 'v5.1.0-next.1'),
        ).not.toThrow()
    })
    it('holds later builds until a pending artifact is recorded', () => {
        const plans = [{ version: '5.0.0', runId: '42' }]
        expect(() => requireRecordedPlans(plans, () => false)).toThrow(
            /Finish that exact artifact first/,
        )
        expect(() =>
            requireRecordedPlans(
                plans,
                (plan: { version: string; runId: string }) =>
                    plan.version === '5.0.0' && plan.runId === '42',
            ),
        ).not.toThrow()
    })
})
