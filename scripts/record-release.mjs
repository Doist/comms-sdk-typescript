import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { githubReleaseApi, completeReleaseRecord, releaseFiles } from './github-release-record.mjs'
import { REPOSITORY, VERSION, SHA } from './release-policy.mjs'

const directory = resolve(process.argv[2])
const metadata = JSON.parse(readFileSync(resolve(directory, 'release.json'), 'utf8'))
const run = (bin, args, options = {}) =>
    execFileSync(bin, args, { encoding: 'utf8', ...options }).trim()
assert.equal(process.env.GITHUB_REPOSITORY?.toLowerCase(), REPOSITORY)
assert.match(metadata.version, VERSION)
assert.match(metadata.sourceSha, SHA)
assert.ok(metadata.notes.startsWith('[Posted by Jarvis]\n\n'))
assert.notEqual(
    process.env.RELEASE_TAG,
    'migration-recovery',
    'Recovery does not promote or create a release record',
)
// Verification is independent of release.json assertions and repeats the GitHub source-run checks.
const readEnv = { ...process.env, GH_TOKEN: process.env.SOURCE_GH_TOKEN || process.env.GH_TOKEN }
run('node', ['scripts/release.mjs', 'verify', directory], { env: readEnv })
for (const destination of ['npmjs', 'github']) {
    const state = JSON.parse(
        run('node', ['scripts/release.mjs', 'check-registry', directory, destination], {
            env: readEnv,
        }),
    )
    const channel = metadata.branch === 'next' ? 'next' : 'latest'
    assert.equal(
        state.tags[channel],
        metadata.version,
        'Record only after both normal channels match; recovery stays separate',
    )
}
const tag = `v${metadata.version}`
const created = completeReleaseRecord(
    githubReleaseApi(),
    metadata,
    releaseFiles(directory, metadata),
)

// semantic-release needs the channel note to continue next.N as well as the v<version> tag.
// Push only notes; never commit or push a source branch and never rewrite a release tag.
const remote = `https://github.com/${REPOSITORY}.git`
const gitAuth = [
    '-c',
    'http.https://github.com/.extraheader=',
    '-c',
    'credential.helper=',
    '-c',
    'credential.helper=!gh auth git-credential',
]
const notesRef = 'refs/notes/semantic-release'
if (run('git', [...gitAuth, 'ls-remote', remote, notesRef])) {
    run('git', [...gitAuth, 'fetch', remote, `${notesRef}:${notesRef}`])
}
run('git', [...gitAuth, 'fetch', remote, `refs/tags/${tag}:refs/tags/${tag}`])
const note = spawnSync('git', ['notes', '--ref', notesRef, 'show', tag], { encoding: 'utf8' })
const channels = note.status === 0 ? JSON.parse(note.stdout).channels : []
assert.ok(Array.isArray(channels))
const channel = metadata.branch === 'next' ? 'next' : null
if (!channels.includes(channel)) {
    channels.push(channel)
    run('git', [
        '-c',
        'user.name=github-actions[bot]',
        '-c',
        'user.email=41898282+github-actions[bot]@users.noreply.github.com',
        'notes',
        '--ref',
        notesRef,
        'add',
        '-f',
        '-m',
        JSON.stringify({ channels }),
        tag,
    ])
    run('git', [...gitAuth, 'push', remote, notesRef])
}
appendFileSync(process.env.GITHUB_OUTPUT, `created=${created}\n`)
