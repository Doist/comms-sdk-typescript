import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJson } from './state.ts'
import { listSome } from './text.ts'
import type { Step } from './verify.ts'

// Each step runs a package.json script, so verify and CI share one set of commands.
const script = (name: string) => ({ command: 'npm', args: ['run', '--silent', name] })

// The same environment CI's test job sets. CI=true makes vitest fail on `.only`, so checks run
// with it to match CI.
const CI_ENV = { NODE_ENV: 'test', CI: 'true' }

/** Every check `.github/workflows/ci.yml` runs on a pull request. */
export const VERIFY_STEPS: Step[] = [
    { name: 'lint', ...script('lint'), env: CI_ENV },
    { name: 'format', ...script('format:check'), env: CI_ENV },
    { name: 'types', ...script('type-check:src'), env: CI_ENV },
    { name: 'types:tools', ...script('type-check:tools'), env: CI_ENV },
    { name: 'build', ...script('build'), env: CI_ENV },
    // In CI, `npm ci` builds before the tests run, and package-contents.test.ts packs dist/, which
    // the build empties and rewrites, so the tests wait for it here too.
    { name: 'tests', ...script('test'), after: 'build', env: CI_ENV },
]

/**
 * How each `run:` in CI's test job maps to verify steps. For `npm run <script>`, the steps must
 * run the scripts it runs, in order; steps.test.ts compares them with package.json and ci.yml,
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
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    optionalDependencies?: Record<string, string>
}
type Lockfile = {
    packages?: Record<
        string,
        {
            version?: string
            optional?: boolean
            devOptional?: boolean
            dependencies?: Record<string, string>
            devDependencies?: Record<string, string>
            optionalDependencies?: Record<string, string>
        }
    >
}

const MAX_LISTED = 10

/** Problems that would make the checks fail for reasons unrelated to the change. */
// The Node version is checked before this, by verify.mjs, since too old a Node can't load it.
export function preflight(root: string): string[] {
    const problems: string[] = []
    const pkg = readJson<PackageJson>(join(root, 'package.json'))

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
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies'] as const) {
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

    // npm records the tree it installed in node_modules/.package-lock.json. Comparing every
    // package with the lockfile catches a transitive dependency that changed while every direct one
    // kept its version. Optional packages for other platforms are never installed.
    const installed = readJson<Lockfile>(join(root, 'node_modules/.package-lock.json'))?.packages
    if (!installed) {
        problems.push('node_modules has no record of what npm installed. Run `npm ci`.')
        return problems
    }
    const stale: string[] = []
    for (const [path, entry] of Object.entries(lock.packages)) {
        if (!path.startsWith('node_modules/')) continue
        const name = path.slice('node_modules/'.length)
        const version = installed[path]?.version
        if (version === undefined) {
            if (!entry.optional && !entry.devOptional) {
                stale.push(`${name} missing (lockfile: ${entry.version})`)
            }
        } else if (version !== entry.version) {
            stale.push(`${name} ${version} (lockfile: ${entry.version})`)
        }
    }
    if (stale.length > 0) {
        problems.push(
            `node_modules does not match package-lock.json: ${listSome(stale, MAX_LISTED)}. Run \`npm ci\`.`,
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
