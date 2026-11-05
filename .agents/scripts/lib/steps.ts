import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJson } from './state.ts'
import type { Step } from './verify.ts'

const bin = (tool: string) => `node_modules/.bin/${tool}`

// The same environment CI's test job sets. CI=true makes vitest fail on `.only`, so checks run
// with it to match CI.
const CI_ENV = { NODE_ENV: 'test', CI: 'true' }

/** Every check `.github/workflows/ci.yml` runs on a pull request. */
export const VERIFY_STEPS: Step[] = [
    { name: 'lint', command: bin('oxlint'), args: ['src', '.agents/scripts'] },
    { name: 'format', command: bin('oxfmt'), args: ['--check'] },
    { name: 'types', command: bin('tsc'), args: ['--noEmit'] },
    { name: 'types:tools', command: bin('tsc'), args: ['--noEmit', '-p', '.agents/scripts'] },
    { name: 'tests', command: bin('vitest'), args: ['run'], env: CI_ENV },
    { name: 'build', command: 'npm', args: ['run', '--silent', 'build'], env: CI_ENV },
]

/**
 * How each `run:` in CI's test job maps to verify steps. For `npm run <script>`, the steps must
 * run the script's commands, in order; steps.test.ts compares them with package.json and ci.yml,
 * so CI and verify cannot drift apart silently.
 */
export const CI_EQUIVALENTS: { run: string; steps: string[] }[] = [
    // `npm ci` runs `prepare`, which builds. The preflight checks node_modules matches the lockfile.
    { run: 'npm ci', steps: ['build'] },
    { run: 'npm run test', steps: ['tests'] },
    { run: 'npm run type-check', steps: ['types', 'types:tools'] },
    { run: 'npm run check', steps: ['lint', 'format'] },
]

/**
 * Pull-request workflows besides ci.yml that verify does not run, and why. steps.test.ts checks
 * that every workflow running a command on pull requests is ci.yml or listed here.
 */
export const UNRUN_WORKFLOWS: Record<string, string> = {
    '.github/workflows/validate-docs.yml':
        'the docs site build (validate-docs.yml): it needs its own install and takes a minute or more; run `npm ci && npm run build` in website/',
}

type PackageJson = {
    engines?: { node?: string }
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
}
type Lockfile = {
    packages?: Record<
        string,
        {
            version?: string
            dependencies?: Record<string, string>
            devDependencies?: Record<string, string>
        }
    >
}

/** Problems that would make the checks fail for reasons unrelated to the change. */
export function preflight(root: string, nodeVersion = process.versions.node): string[] {
    const problems: string[] = []
    const pkg = readJson<PackageJson>(join(root, 'package.json'))
    const minimum = pkg?.engines?.node?.match(/^>=\s*(\d+)/)?.[1]
    const major = Number(nodeVersion.split('.')[0])
    if (minimum && major < Number(minimum)) {
        problems.push(
            `Node ${nodeVersion} is older than the ${pkg?.engines?.node} this repository needs. ` +
                'Switch versions (see .nvmrc) and run again.',
        )
    }

    if (!existsSync(join(root, 'node_modules'))) {
        problems.push('node_modules is missing. Run `npm ci`.')
        return problems
    }
    const lock = readJson<Lockfile>(join(root, 'package-lock.json'))
    if (!lock?.packages) {
        problems.push('package-lock.json is missing or unreadable. Run `npm install`.')
        return problems
    }
    // npm ci refuses to install when package.json and the lockfile disagree, so CI would fail
    // before any check runs.
    const manifest = lock.packages[''] ?? {}
    const disagree: string[] = []
    for (const field of ['dependencies', 'devDependencies'] as const) {
        const wanted = pkg?.[field] ?? {}
        const locked = manifest[field] ?? {}
        for (const name of new Set([...Object.keys(wanted), ...Object.keys(locked)])) {
            if (wanted[name] !== locked[name]) {
                disagree.push(
                    `${name} (package.json: ${wanted[name] ?? 'none'}, lockfile: ${locked[name] ?? 'none'})`,
                )
            }
        }
    }
    if (disagree.length > 0) {
        problems.push(
            `package.json and package-lock.json disagree: ${disagree.join(', ')}. Run \`npm install\`.`,
        )
        return problems
    }

    const stale: string[] = []
    for (const name of Object.keys({ ...pkg?.dependencies, ...pkg?.devDependencies })) {
        const locked = lock.packages[`node_modules/${name}`]?.version
        if (!locked) {
            stale.push(`${name} is not in the lockfile`)
            continue
        }
        const installed = readJson<{ version?: string }>(
            join(root, 'node_modules', name, 'package.json'),
        )?.version
        if (installed !== locked) {
            stale.push(`${name} ${installed ?? 'missing'} (lockfile: ${locked})`)
        }
    }
    if (stale.length > 0) {
        problems.push(
            `node_modules does not match package-lock.json: ${stale.join(', ')}. Run \`npm ci\`.`,
        )
    }
    return problems
}

/** What verification cannot see, printed after every pass. */
export const BLIND_SPOTS = [
    'calls to the real Comms API: the tests answer every request with MSW handlers',
    'Node versions other than yours: CI tests on 24 and 26',
    'the packed package as consumers resolve it (`npm run attw`, which only the release runs)',
    ...Object.values(UNRUN_WORKFLOWS),
]
