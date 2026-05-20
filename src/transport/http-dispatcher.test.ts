import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { gzipSync } from 'node:zlib'
import {
    getDefaultDispatcher,
    resetDefaultDispatcherForTests,
    suppressExperimentalWarningsSync,
} from './http-dispatcher'

const proxyEnvironmentKeys = [
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'NO_PROXY',
    'http_proxy',
    'https_proxy',
    'no_proxy',
] as const

type ProxyEnvironmentKey = (typeof proxyEnvironmentKeys)[number]

const originalProxyEnvironment = Object.fromEntries(
    proxyEnvironmentKeys.map((key) => [key, process.env[key]]),
) as Record<ProxyEnvironmentKey, string | undefined>

function clearProxyEnvironment(): void {
    proxyEnvironmentKeys.forEach((key) => {
        delete process.env[key]
    })
}

function restoreProxyEnvironment(): void {
    proxyEnvironmentKeys.forEach((key) => {
        const value = originalProxyEnvironment[key]
        if (value === undefined) {
            delete process.env[key]
            return
        }

        process.env[key] = value
    })
}

describe('httpDispatcher', () => {
    beforeEach(() => {
        clearProxyEnvironment()
        resetDefaultDispatcherForTests()
    })

    afterEach(() => {
        vi.doUnmock('undici')
        restoreProxyEnvironment()
        resetDefaultDispatcherForTests()
    })

    it('returns a dispatcher in Node', async () => {
        const dispatcher = await getDefaultDispatcher()

        expect(dispatcher).toBeDefined()
        expect(typeof dispatcher?.dispatch).toBe('function')
    })

    it('reuses the same dispatcher instance across calls', async () => {
        const firstDispatcher = await getDefaultDispatcher()
        const secondDispatcher = await getDefaultDispatcher()

        expect(secondDispatcher).toBe(firstDispatcher)
    })

    it('creates a new dispatcher after reset', async () => {
        const firstDispatcher = await getDefaultDispatcher()

        resetDefaultDispatcherForTests()

        const secondDispatcher = await getDefaultDispatcher()

        expect(secondDispatcher).not.toBe(firstDispatcher)
    })

    it('retries dispatcher initialization after a failure', async () => {
        const MockEnvHttpProxyAgent = class {}
        let shouldReject = true

        vi.doMock('undici', () => ({
            EnvHttpProxyAgent: class extends MockEnvHttpProxyAgent {
                compose() {
                    return this
                }
                constructor() {
                    super()

                    if (shouldReject) {
                        shouldReject = false
                        throw new Error('init failed')
                    }
                }
            },
            interceptors: {
                decompress: () => (dispatch: unknown) => dispatch,
            },
        }))

        await expect(getDefaultDispatcher()).rejects.toThrow('init failed')

        const dispatcher = await getDefaultDispatcher()

        expect(dispatcher).toBeInstanceOf(MockEnvHttpProxyAgent)
    })

    it('decompresses gzip-encoded response bodies', async () => {
        const payload = { hello: 'world', nested: { value: 42 } }
        const compressed = gzipSync(Buffer.from(JSON.stringify(payload)))

        const httpServer: Server = await new Promise((resolve) => {
            const s = createServer((_req, res) => {
                res.writeHead(200, {
                    'content-type': 'application/json',
                    'content-encoding': 'gzip',
                    'content-length': String(compressed.length),
                })
                res.end(compressed)
            })
            s.listen(0, '127.0.0.1', () => resolve(s))
        })

        try {
            const { port } = httpServer.address() as AddressInfo
            const dispatcher = await getDefaultDispatcher()
            const response = await fetch(`http://127.0.0.1:${port}/`, {
                // @ts-expect-error - dispatcher is a valid Node fetch option not in TS lib types
                dispatcher,
            })
            const body = await response.text()

            expect(response.status).toBe(200)
            expect(body).toBe(JSON.stringify(payload))
            expect(JSON.parse(body)).toEqual(payload)
        } finally {
            await new Promise<void>((resolve) => httpServer.close(() => resolve()))
        }
    })
})

describe('suppressExperimentalWarningsSync', () => {
    it('swallows ExperimentalWarning emissions during the synchronous call', () => {
        const calls: unknown[][] = []
        const originalEmit = process.emitWarning
        process.emitWarning = ((...args: unknown[]) => {
            calls.push(args)
        }) as typeof process.emitWarning

        try {
            suppressExperimentalWarningsSync(() => {
                process.emitWarning('experimental-string-form', 'ExperimentalWarning')
                process.emitWarning('experimental-options-form', {
                    type: 'ExperimentalWarning',
                })
                process.emitWarning('deprecation', 'DeprecationWarning')
            })
        } finally {
            process.emitWarning = originalEmit
        }

        expect(calls).toHaveLength(1)
        expect(calls[0]?.[0]).toBe('deprecation')
    })

    it('restores the original emitWarning even if the callback throws', () => {
        const originalEmit = process.emitWarning
        const placeholder = (() => {}) as typeof process.emitWarning
        process.emitWarning = placeholder

        try {
            expect(() =>
                suppressExperimentalWarningsSync(() => {
                    throw new Error('boom')
                }),
            ).toThrow('boom')
            expect(process.emitWarning).toBe(placeholder)
        } finally {
            process.emitWarning = originalEmit
        }
    })

    it('returns the callback result', () => {
        const result = suppressExperimentalWarningsSync(() => 42)
        expect(result).toBe(42)
    })
})
