import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { REPOSITORY, VERSION } from './release-policy.mjs'

// Analysis and publication are separate jobs. Do not make two different tarballs for the same
// next version when another push arrives before the earlier artifact's publication is recorded.
export function requireRecordedPlans(plans, tagExists) {
    for (const plan of plans) {
        assert.match(plan.version, VERSION)
        assert.ok(
            tagExists(`v${plan.version}`),
            `Retained release ${plan.version} from run ${plan.runId} is not recorded. Finish that exact artifact first, then dispatch a new build from the current release branch.`,
        )
    }
}

export function requireUnallocatedVersion(version, tagExists) {
    assert.match(version, VERSION)
    assert.ok(
        !tagExists(`v${version}`),
        `Version ${version} is already tagged; complete its release/channel record before building again`,
    )
}

export function checkPendingReleases(baselineTag, proposedVersion) {
    const api = (path) =>
        JSON.parse(execFileSync('gh', ['api', `repos/${REPOSITORY}/${path}`], { encoding: 'utf8' }))
    requireUnallocatedVersion(
        proposedVersion,
        (tag) =>
            spawnSync('git', ['rev-parse', '--verify', `refs/tags/${tag}`], { stdio: 'ignore' })
                .status === 0,
    )
    const branch = process.env.GITHUB_REF_NAME
    assert.ok(['main', 'next'].includes(branch))
    const runs = JSON.parse(
        execFileSync(
            'gh',
            [
                'api',
                '--paginate',
                '--slurp',
                `repos/${REPOSITORY}/actions/workflows/release.yml/runs?branch=${branch}&status=success&per_page=100`,
            ],
            { encoding: 'utf8' },
        ),
    ).flatMap((page) => page.workflow_runs)
    const directory = mkdtempSync(resolve(tmpdir(), 'comms-sdk-pending-'))
    try {
        for (const run of runs) {
            // Already released history needs no artifact download and may legitimately expire.
            if (
                spawnSync('git', ['merge-base', '--is-ancestor', run.head_sha, baselineTag], {
                    stdio: 'ignore',
                }).status === 0
            )
                continue
            const name = `release-${run.id}-${run.run_attempt}`
            const artifacts = api(`actions/runs/${run.id}/artifacts?per_page=100`).artifacts.filter(
                (item) => item.name === name,
            )
            if (!artifacts.length) continue // no release was proposed by that successful run
            assert.ok(
                !artifacts[0].expired,
                `Run ${run.id} artifact expired; maintainer must reconcile its release record before another build`,
            )
            const target = resolve(directory, String(run.id))
            execFileSync(
                'gh',
                [
                    'run',
                    'download',
                    String(run.id),
                    '--repo',
                    REPOSITORY,
                    '--name',
                    name,
                    '--dir',
                    target,
                ],
                { stdio: 'pipe' },
            )
            const plan = JSON.parse(readFileSync(resolve(target, 'release.json'), 'utf8'))
            requireRecordedPlans(
                [plan],
                (tag) =>
                    spawnSync('git', ['rev-parse', '--verify', `refs/tags/${tag}`], {
                        stdio: 'ignore',
                    }).status === 0,
            )
        }
    } finally {
        rmSync(directory, { recursive: true, force: true })
    }
}
