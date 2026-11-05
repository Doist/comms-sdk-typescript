// `npm run verify`: every check CI runs on a pull request, in about fifteen seconds.
// Records a fingerprint of the tree only when everything passed.
// It sets process.exitCode rather than calling process.exit(): stdout to a pipe can be
// asynchronous, and exiting early could cut off the last lines, which say what failed.

import { CHECKOUT_ROOT, branchBase, defaultBranchRef } from './lib/git.ts'
import { clearVerified } from './lib/state.ts'
import { BLIND_SPOTS, preflight, VERIFY_STEPS } from './lib/steps.ts'
import { runVerify } from './lib/verify.ts'

const root = CHECKOUT_ROOT

const problems = preflight(root)
if (problems.length > 0) {
    clearVerified(root)
    for (const problem of problems) console.log(`✗ ${problem}`)
    process.exitCode = 1
} else {
    const ref = defaultBranchRef(root)
    const result = await runVerify({
        root,
        steps: VERIFY_STEPS,
        base: ref ? branchBase(root, ref) : undefined,
        baseName: ref?.replace(/^refs\/(remotes|heads)\//, '') ?? 'main',
        blindSpots: BLIND_SPOTS,
    })
    process.exitCode = result.ok ? 0 : 1
}
