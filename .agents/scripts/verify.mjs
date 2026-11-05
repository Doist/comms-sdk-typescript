// `npm run verify` starts here, in plain JavaScript. A Node too old to strip TypeScript types
// would stop at verify.ts with a file-extension or syntax error, instead of saying which Node this
// repository needs.

import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
const range = pkg.engines?.node ?? ''
const minimum = Number(range.match(/^>=\s*(\d+)/)?.[1] ?? 0)
const major = Number(process.versions.node.split('.')[0])

if (major < minimum) {
    console.log(
        `✗ Node ${process.versions.node} is older than the ${range} this repository needs. ` +
            'Switch versions (see .nvmrc) and run again.',
    )
    process.exitCode = 1
} else {
    await import('./verify.ts')
}
