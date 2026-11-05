import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { writeJson } from './state.ts'
import { BLIND_SPOTS, CI_EQUIVALENTS, preflight, UNRUN_WORKFLOWS, VERIFY_STEPS } from './steps.ts'
import { REPO_ROOT } from './test-repo.ts'

const WORKFLOWS_DIR = join(REPO_ROOT, '.github/workflows')
const readWorkflow = (name: string) => readFileSync(join(WORKFLOWS_DIR, name), 'utf8')

// Commands in ci.yml, which has one job. Single-line `run:` entries only.
function ciTestJobCommands(): string[] {
    return [...readWorkflow('ci.yml').matchAll(/^\s+(?:- )?run: (.+)$/gm)].map(
        (match) => match[1]?.trim() ?? '',
    )
}

/** The `on:` trigger, inline (`on: [push, pull_request]`) or as an indented block. */
function triggers(text: string): string {
    const match = text.match(/^["']?on["']?:(.*)\n((?:(?:[ \t].*)?\n)*)/m)
    return match ? `${match[1]}\n${match[2]}` : ''
}

const runsOnPullRequests = (text: string) => /\bpull_request(_target)?\b/.test(triggers(text))
const runsACommand = (text: string) => /^\s+(?:- )?run: /m.test(text)

const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>
}
/** The package.json script a verify step runs, if it runs one. */
const stepScript = (name: string) => {
    const step = VERIFY_STEPS.find((candidate) => candidate.name === name)
    const [run, silent, script] = step?.args ?? []
    return step?.command === 'npm' && run === 'run' && silent === '--silent' ? script : undefined
}

/** A script, or the scripts it runs through npm-run-all, in order. */
function leafScripts(name: string): string[] {
    const runs = pkg.scripts[name]?.match(/^npm-run-all (?:--parallel |-p )?([\w: -]+)$/)?.[1]
    return runs ? runs.trim().split(/\s+/).flatMap(leafScripts) : [name]
}

describe('reading workflows', () => {
    it.each([
        ['on:\n    pull_request:\n', true],
        ['on:\n    pull_request:\n        paths:\n            - src/**\n', true],
        ['on: [push, pull_request]\n', true],
        ['on:\n    issues:\n        types: [opened]\n', false],
        ["on:\n    push:\njobs:\n    a:\n        if: github.event_name == 'pull_request'\n", false],
    ])('%j runs on pull requests: %s', (text, expected) => {
        expect(runsOnPullRequests(text)).toBe(expected)
    })
})

describe('verify covers CI', () => {
    it('has an equivalent for every command in the CI test job', () => {
        const commands = ciTestJobCommands()
        expect(commands.length).toBeGreaterThan(3)
        expect(commands.toSorted()).toEqual(CI_EQUIVALENTS.map((entry) => entry.run).toSorted())
    })

    it('runs every step as a package.json script', () => {
        for (const step of VERIFY_STEPS) {
            expect(pkg.scripts, step.name).toHaveProperty([
                stepScript(step.name) ?? `(${step.name})`,
            ])
        }
    })

    it('runs the same scripts as the package.json scripts CI calls', () => {
        for (const entry of CI_EQUIVALENTS) {
            const script = entry.run.match(/^npm run (\S+)$/)?.[1]
            if (!script) continue
            expect({ script, runs: leafScripts(script) }).toEqual({
                script,
                runs: entry.steps.map(stepScript),
            })
        }
    })

    it('builds, as npm ci does through the prepare script', () => {
        expect(pkg.scripts.prepare).toMatch(/&& npm run build$/)
        expect(CI_EQUIVALENTS.find((entry) => entry.run === 'npm ci')?.steps).toEqual(['build'])
        expect(stepScript('build')).toBe('build')
    })

    it('starts the tests once the build has passed, as CI does after npm ci', () => {
        expect(VERIFY_STEPS.find((step) => step.name === 'tests')?.after).toBe('build')
    })

    it('accounts for every workflow that runs a command on pull requests', () => {
        const running = readdirSync(WORKFLOWS_DIR)
            .filter((name) => /\.ya?ml$/.test(name))
            .filter((name) => {
                const text = readWorkflow(name)
                return runsOnPullRequests(text) && runsACommand(text)
            })
            .map((name) => `.github/workflows/${name}`)
        expect(running.toSorted()).toEqual(
            ['.github/workflows/ci.yml', ...Object.keys(UNRUN_WORKFLOWS)].toSorted(),
        )
    })

    it('names the Node versions CI tests on among what it cannot see', () => {
        const matrix = readWorkflow('ci.yml').match(/node-version: \[([^\]]+)\]/)?.[1] ?? ''
        const versions = matrix.split(',').map((version) => version.trim())
        expect(versions.length).toBeGreaterThan(1)
        expect(BLIND_SPOTS).toContain(
            `Node versions other than yours: CI tests on ${versions.join(' and ')}`,
        )
    })

    it('names only steps that exist', () => {
        const names = VERIFY_STEPS.map((step) => step.name)
        for (const entry of CI_EQUIVALENTS) {
            for (const step of entry.steps) expect(names).toContain(step)
        }
        for (const step of VERIFY_STEPS) {
            if (step.after) expect(names).toContain(step.after)
        }
    })
})

describe('preflight', () => {
    let root: string

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), 'agent-preflight-'))
        writeJson(join(root, 'package.json'), {
            engines: { node: '>=24' },
            dependencies: { zod: '1.0.0' },
            devDependencies: { vitest: '2.0.0' },
        })
        writeJson(join(root, 'package-lock.json'), {
            packages: {
                '': { dependencies: { zod: '1.0.0' }, devDependencies: { vitest: '2.0.0' } },
                'node_modules/zod': { version: '1.0.0' },
                'node_modules/vitest': { version: '2.0.0' },
            },
        })
        writeInstalled({
            'node_modules/zod': { version: '1.0.0' },
            'node_modules/vitest': { version: '2.0.0' },
        })
    })

    // What npm records about the tree it installed.
    const writeInstalled = (packages: Record<string, { version: string }>) =>
        writeJson(join(root, 'node_modules/.package-lock.json'), { packages })

    afterEach(() => rmSync(root, { recursive: true, force: true }))

    it('passes a current install', () => {
        expect(preflight(root)).toEqual([])
    })

    it('names a dependency whose installed version differs from the lockfile', () => {
        writeInstalled({
            'node_modules/zod': { version: '0.9.0' },
            'node_modules/vitest': { version: '2.0.0' },
        })
        expect(preflight(root)).toEqual([
            'node_modules does not match package-lock.json: zod 0.9.0 (lockfile: 1.0.0). Run `npm ci`.',
        ])
    })

    it('names a dependency that is not installed', () => {
        writeInstalled({ 'node_modules/zod': { version: '1.0.0' } })
        expect(preflight(root)[0]).toContain('vitest missing (lockfile: 2.0.0)')
    })

    it('names a transitive dependency that changed while every direct one kept its version', () => {
        const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8')) as {
            packages: Record<string, unknown>
        }
        lock.packages['node_modules/undici'] = { version: '7.1.0' }
        writeJson(join(root, 'package-lock.json'), lock)
        writeInstalled({
            'node_modules/zod': { version: '1.0.0' },
            'node_modules/vitest': { version: '2.0.0' },
            'node_modules/undici': { version: '7.0.0' },
        })
        expect(preflight(root)).toEqual([
            'node_modules does not match package-lock.json: undici 7.0.0 (lockfile: 7.1.0). Run `npm ci`.',
        ])
    })

    it('accepts optional packages for other platforms that were never installed', () => {
        const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8')) as {
            packages: Record<string, unknown>
        }
        lock.packages['node_modules/@oxlint/darwin-arm64'] = { version: '1.0.0', optional: true }
        lock.packages['node_modules/@oxfmt/win32-x64'] = { version: '1.0.0', devOptional: true }
        writeJson(join(root, 'package-lock.json'), lock)
        expect(preflight(root)).toEqual([])
    })

    it('says when node_modules has no record of what npm installed', () => {
        rmSync(join(root, 'node_modules/.package-lock.json'))
        expect(preflight(root)).toEqual([
            'node_modules has no record of what npm installed. Run `npm ci`.',
        ])
    })

    it('names a dependency package.json and the lockfile disagree on', () => {
        writeJson(join(root, 'package.json'), {
            engines: { node: '>=24' },
            dependencies: { zod: '1.1.0', added: '1.0.0' },
            devDependencies: { vitest: '2.0.0' },
        })
        expect(preflight(root)).toEqual([
            'package.json and package-lock.json disagree: zod (package.json: 1.1.0, lockfile: 1.0.0), added (package.json: 1.0.0, lockfile: none). Run `npm install`.',
        ])
    })

    it('names an optional dependency package.json and the lockfile disagree on', () => {
        writeJson(join(root, 'package.json'), {
            engines: { node: '>=24' },
            dependencies: { zod: '1.0.0' },
            devDependencies: { vitest: '2.0.0' },
            optionalDependencies: { keyring: '2.0.0' },
        })
        expect(preflight(root)).toEqual([
            'package.json and package-lock.json disagree: keyring (package.json: 2.0.0, lockfile: none). Run `npm install`.',
        ])
    })

    it('says when the lockfile is missing', () => {
        rmSync(join(root, 'package-lock.json'))
        expect(preflight(root)).toEqual([
            'package-lock.json is missing or unreadable. Run `npm install`.',
        ])
    })

    it('says when node_modules is missing', () => {
        rmSync(join(root, 'node_modules'), { recursive: true })
        expect(preflight(root)).toEqual(['node_modules is missing. Run `npm ci`.'])
    })
})
