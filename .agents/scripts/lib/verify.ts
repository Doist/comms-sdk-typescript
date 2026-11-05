import { spawn } from 'node:child_process'
import { closeSync, createWriteStream, fstatSync, mkdirSync, openSync, readSync } from 'node:fs'
import { join, relative } from 'node:path'
import { cleanGitEnv } from './git.ts'
import { clearVerified, readVerified, stateDir, writeVerified } from './state.ts'
import {
    changedSince,
    classify,
    codeFingerprint,
    fingerprintChanges,
    needsChecks,
    snapshot,
} from './tree.ts'

export type Step = {
    name: string
    command: string
    args: string[]
    /** Runs only after this step has passed. Steps without one start together. */
    after?: string
    env?: Record<string, string>
}

export type VerifyOptions = {
    root: string
    steps: Step[]
    /** Where the branch left the default branch; undefined when there is no default branch. */
    base: string | undefined
    baseName?: string
    /** What the checks cannot see, listed after every run that passed. */
    blindSpots?: string[]
    out?: (line: string) => void
}

export type VerifyResult = { ok: boolean; recorded: boolean }

const LOG_TAIL_LINES = 30
// Enough for the tail of any log; a failing step's log can run to megabytes.
const LOG_TAIL_BYTES = 64 * 1024

export async function runVerify(options: VerifyOptions): Promise<VerifyResult> {
    const { blindSpots = [], out = console.log } = options
    const result = await check(options)
    // A docs-only pass skips most checks, so it needs this list as much as a full one does.
    if (result.ok && blindSpots.length > 0) {
        out('Not covered by these checks:')
        for (const spot of blindSpots) out(`- ${spot}`)
    }
    return result
}

async function check(options: VerifyOptions): Promise<VerifyResult> {
    const { root, steps, base, baseName = 'main', out = console.log } = options

    if (base === undefined) {
        out(`No ${baseName} branch found, so checking the whole tree.`)
    } else {
        const changes = changedSince(root, base)
        const kinds = new Set(
            changes.map((path) => (needsChecks(root, path) ? 'code' : classify(path))),
        )
        if (changes.length > 0 && !kinds.has('code')) {
            // Docs and CI config are still formatted, and CI checks that, so the format step runs.
            const format = steps.find((step) => step.name === 'format')
            if (format && !(await runStep(root, format, logDirFor(root), out))) {
                return { ok: false, recorded: false }
            }
            // Docs count by name in the fingerprint, so an added or removed doc makes an earlier
            // pass describe a different tree.
            const earlier = readVerified(root)
            if (earlier && earlier.fingerprint !== codeFingerprint(snapshot(root)))
                clearVerified(root)
            const checked = format ? 'only their formatting was checked' : 'nothing to check'
            if (kinds.has('unchecked')) {
                const unchecked = changes.filter((path) => classify(path) === 'unchecked')
                out(`No local check reads what changed since ${baseName}: ${unchecked.join(', ')}.`)
                out(`CI is the only check for these; ${checked}. Nothing recorded.`)
            } else {
                out(`Only docs changed since ${baseName}: ${checked}. Nothing recorded.`)
            }
            return { ok: true, recorded: false }
        }
        if (changes.length === 0) out(`No changes since ${baseName}; checking the tree anyway.`)
    }

    // From here the checks run, so a run that does not end in a pass must not leave an earlier
    // pass behind. (A docs-only run returns above: edited docs leave the fingerprint as it was,
    // so an earlier pass for the same tree is still valid.)
    clearVerified(root)
    const before = snapshot(root)

    const passed = await runSteps(root, steps, logDirFor(root), out)
    if (!passed) return { ok: false, recorded: false }

    const after = snapshot(root)
    const fingerprint = codeFingerprint(after)
    if (fingerprint !== codeFingerprint(before)) {
        const changed = fingerprintChanges(before, after)
        out(`Files changed during the run: ${changed.join(', ')}. Nothing recorded; run it again.`)
        return { ok: false, recorded: false }
    }

    writeVerified(root, { fingerprint })
    out(`Verified. Recorded fingerprint ${fingerprint.slice(0, 12)}.`)
    return { ok: true, recorded: true }
}

function logDirFor(root: string): string {
    const dir = join(stateDir(root), 'logs')
    mkdirSync(dir, { recursive: true })
    return dir
}

async function runSteps(
    root: string,
    steps: Step[],
    logDir: string,
    out: (line: string) => void,
): Promise<boolean> {
    const results = new Map<string, Promise<boolean>>()
    const start = (step: Step): Promise<boolean> => {
        const existing = results.get(step.name)
        if (existing) return existing
        const dependency = step.after ? steps.find((s) => s.name === step.after) : undefined
        if (step.after && !dependency)
            throw new Error(`step ${step.name} runs after unknown ${step.after}`)
        const result = (dependency ? start(dependency) : Promise.resolve(true)).then((ready) => {
            if (ready) return runStep(root, step, logDir, out)
            out(`- ${step.name} skipped: ${step.after} failed`)
            return false
        })
        results.set(step.name, result)
        return result
    }
    const outcomes = await Promise.all(steps.map(start))
    return outcomes.every(Boolean)
}

function runStep(
    root: string,
    step: Step,
    logDir: string,
    out: (line: string) => void,
): Promise<boolean> {
    const logPath = join(logDir, `${step.name.replace(/[^\w.-]/g, '_')}.log`)
    const log = createWriteStream(logPath)
    const startedAt = Date.now()
    return new Promise((resolve) => {
        const child = spawn(step.command, step.args, {
            cwd: root,
            env: { ...cleanGitEnv(), ...step.env },
            stdio: ['ignore', 'pipe', 'pipe'],
        })
        child.stdout.pipe(log, { end: false })
        child.stderr.pipe(log, { end: false })
        let finished = false
        const finish = (code: number | null, error?: Error) => {
            if (finished) return
            finished = true
            if (error) log.write(`\n${error.message}\n`)
            log.end(() => {
                const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
                if (code === 0) {
                    out(`✓ ${step.name} (${seconds}s)`)
                    resolve(true)
                    return
                }
                const lines = tailLines(logPath, LOG_TAIL_LINES)
                out(`✗ ${step.name} (${error ? error.message : `exit ${code}`}, ${seconds}s)`)
                for (const line of lines) out(`    ${line}`)
                out(`    full log: ${relative(process.cwd(), logPath) || logPath}`)
                resolve(false)
            })
        }
        child.on('error', (error) => finish(null, error))
        child.on('close', (code) => finish(code))
    })
}

/** The last `count` lines of a file, read from its end so a long log isn't loaded whole. */
function tailLines(path: string, count: number): string[] {
    const fd = openSync(path, 'r')
    try {
        const size = fstatSync(fd).size
        const length = Math.min(size, LOG_TAIL_BYTES)
        const buffer = Buffer.alloc(length)
        readSync(fd, buffer, 0, length, size - length)
        const lines = buffer.toString('utf8').trimEnd().split('\n')
        // Unless the whole file fitted, the first line read may start part-way through.
        return (length < size ? lines.slice(1) : lines).slice(-count)
    } finally {
        closeSync(fd)
    }
}
