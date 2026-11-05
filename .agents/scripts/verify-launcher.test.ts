import { afterEach, beforeEach, expect, it } from 'vitest'
import { createTempRepo, type TempRepo } from './lib/test-repo.ts'

// verify.mjs in a throwaway repo, with a stand-in verify.ts that only says it was loaded.
let repo: TempRepo

beforeEach(() => {
    repo = createTempRepo()
    repo.copyFromCheckout('.agents/scripts/verify.mjs')
    repo.write('.agents/scripts/verify.ts', "console.log('verify.ts loaded')\n")
})

afterEach(() => repo.cleanup())

const launch = (engines: string) => {
    repo.write('package.json', JSON.stringify({ engines: { node: engines } }))
    return repo.run(process.execPath, ['.agents/scripts/verify.mjs'])
}

it('stops on a Node older than package.json engines, before loading any TypeScript', () => {
    const result = launch('>=999')
    expect(result.status).toBe(1)
    expect(result.stdout).toBe(
        `✗ Node ${process.versions.node} is older than the >=999 this repository needs. ` +
            'Switch versions (see .nvmrc) and run again.\n',
    )
})

it('runs verify.ts on a Node the engines allow', () => {
    const result = launch(`>=${process.versions.node.split('.')[0]}`)
    expect(result.status).toBe(0)
    expect(result.stdout).toBe('verify.ts loaded\n')
})
