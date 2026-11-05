import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { writeJson } from './state.ts'
import { CI_EQUIVALENTS, preflight, UNRUN_WORKFLOWS, VERIFY_STEPS } from './steps.ts'
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
// `npx tsc` and node_modules/.bin/tsc are the same command; `--silent` changes output only.
const normalize = (command: string) => command.trim().replace(/^npx /, '').replace(' --silent', '')
const stepCommand = (name: string) => {
    const step = VERIFY_STEPS.find((candidate) => candidate.name === name)
    return normalize([basename(step?.command ?? ''), ...(step?.args ?? [])].join(' '))
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

    it('runs the same commands as the package.json scripts CI calls', () => {
        for (const entry of CI_EQUIVALENTS) {
            const script = entry.run.match(/^npm run (\S+)$/)?.[1]
            if (!script) continue
            const commands = (pkg.scripts[script] ?? '').split('&&').map(normalize)
            expect({ script, commands }).toEqual({ script, commands: entry.steps.map(stepCommand) })
        }
    })

    it('builds, as npm ci does through the prepare script', () => {
        expect(pkg.scripts.prepare).toMatch(/&& npm run build$/)
        expect(CI_EQUIVALENTS.find((entry) => entry.run === 'npm ci')?.steps).toEqual(['build'])
        expect(stepCommand('build')).toBe('npm run build')
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
        writeJson(join(root, 'node_modules/zod/package.json'), { version: '1.0.0' })
        writeJson(join(root, 'node_modules/vitest/package.json'), { version: '2.0.0' })
    })

    afterEach(() => rmSync(root, { recursive: true, force: true }))

    it('passes a current install on a supported Node', () => {
        expect(preflight(root, '24.0.0')).toEqual([])
    })

    it('rejects a Node older than package.json engines', () => {
        const [problem] = preflight(root, '22.22.2')
        expect(problem).toContain('Node 22.22.2 is older than the >=24')
    })

    it('names a dependency whose installed version differs from the lockfile', () => {
        writeJson(join(root, 'node_modules/zod/package.json'), { version: '0.9.0' })
        expect(preflight(root, '24.0.0')).toEqual([
            'node_modules does not match package-lock.json: zod 0.9.0 (lockfile: 1.0.0). Run `npm ci`.',
        ])
    })

    it('names a dependency that is not installed', () => {
        rmSync(join(root, 'node_modules/vitest'), { recursive: true })
        expect(preflight(root, '24.0.0')[0]).toContain('vitest missing (lockfile: 2.0.0)')
    })

    it('names a dependency package.json and the lockfile disagree on', () => {
        writeJson(join(root, 'package.json'), {
            engines: { node: '>=24' },
            dependencies: { zod: '1.1.0', added: '1.0.0' },
            devDependencies: { vitest: '2.0.0' },
        })
        expect(preflight(root, '24.0.0')).toEqual([
            'package.json and package-lock.json disagree: zod (package.json: 1.1.0, lockfile: 1.0.0), added (package.json: 1.0.0, lockfile: none). Run `npm install`.',
        ])
    })

    it('says when the lockfile is missing', () => {
        rmSync(join(root, 'package-lock.json'))
        expect(preflight(root, '24.0.0')).toEqual([
            'package-lock.json is missing or unreadable. Run `npm install`.',
        ])
    })

    it('says when node_modules is missing', () => {
        rmSync(join(root, 'node_modules'), { recursive: true })
        expect(preflight(root, '24.0.0')).toEqual(['node_modules is missing. Run `npm ci`.'])
    })
})
