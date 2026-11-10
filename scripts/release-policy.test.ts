import { describe, expect, it } from 'vitest'
import { registryJson, validatePublicationTag, validateSourceRun } from './release-policy.mjs'

const sha = 'a'.repeat(40)
const run = {
    id: 42,
    run_attempt: 1,
    repository: { full_name: 'todoist/comms-sdk-typescript' },
    head_repository: { full_name: 'todoist/comms-sdk-typescript' },
    workflow_id: 7,
    path: '.github/workflows/release.yml',
    status: 'completed',
    conclusion: 'success',
    event: 'workflow_dispatch',
    head_branch: 'main',
    head_sha: sha,
}
const compare = async () => ({ status: 'identical', merge_base_commit: { sha } })

describe('retained release source', () => {
    it('accepts a successful main build with checkout at the run SHA', async () => {
        await expect(validateSourceRun(run, 7, sha, compare)).resolves.toBeUndefined()
    })
    it('accepts a reviewed source when its release branch has advanced', async () => {
        await expect(
            validateSourceRun(run, 7, sha, async () => ({
                status: 'ahead',
                merge_base_commit: { sha },
            })),
        ).resolves.toBeUndefined()
    })
    it('rejects an ahead response with a different merge base', async () => {
        await expect(
            validateSourceRun(run, 7, sha, async () => ({
                status: 'ahead',
                merge_base_commit: { sha: 'b'.repeat(40) },
            })),
        ).rejects.toThrow()
    })
    it.each([
        { event: 'pull_request' },
        { conclusion: 'failure' },
        { head_branch: 'feature' },
        { head_sha: 'b'.repeat(40) },
        { workflow_id: 8 },
        { path: '.github/workflows/ci.yml' },
        { head_repository: { full_name: 'attacker/comms-sdk-typescript' } },
        { repository: { full_name: 'attacker/comms-sdk-typescript' } },
    ])('rejects untrusted source metadata %j', async (change) => {
        await expect(validateSourceRun({ ...run, ...change }, 7, sha, compare)).rejects.toThrow()
    })
    it('rejects a source outside reviewed release history', async () => {
        await expect(
            validateSourceRun(run, 7, sha, async () => ({
                status: 'diverged',
                merge_base_commit: { sha },
            })),
        ).rejects.toThrow()
    })
})

describe('registry recovery', () => {
    it('allows a forward latest release and refuses to downgrade it', () => {
        expect(() => validatePublicationTag('4.0.1', 'latest', { latest: '4.0.0' })).not.toThrow()
        expect(() => validatePublicationTag('4.0.1', 'latest', { latest: '4.0.2' })).toThrow()
    })
    it('keeps next separate from latest and guards its ordering', () => {
        expect(() =>
            validatePublicationTag('4.1.0-next.2', 'next', {
                next: '4.1.0-next.1',
                latest: '4.0.1',
            }),
        ).not.toThrow()
        expect(() =>
            validatePublicationTag('4.1.0-next.2', 'next', { next: '4.1.0-next.3' }),
        ).toThrow()
        expect(() => validatePublicationTag('4.1.0-next.2', 'latest', {})).toThrow()
        expect(() => validatePublicationTag('4.1.0', 'next', {})).toThrow()
    })
    it('allows explicit recovery without reusing a normal channel', () => {
        expect(() =>
            validatePublicationTag('4.0.1', 'migration-recovery', { latest: '4.2.0' }),
        ).not.toThrow()
        expect(() => validatePublicationTag('4.0.1', 'internal', {})).toThrow()
    })
    it('only treats a structured 404 as absence, never auth or service failure', () => {
        expect(registryJson({ status: 1, stdout: '{"error":{"code":"E404"}}' })).toBeUndefined()
        expect(registryJson({ status: 0, stdout: '"sha512-value"' })).toBe('sha512-value')
        expect(() => registryJson({ status: 1, stderr: '{"error":{"code":"E401"}}' })).toThrow()
        expect(() => registryJson({ status: 1, stderr: 'upstream unavailable' })).toThrow()
    })
})
