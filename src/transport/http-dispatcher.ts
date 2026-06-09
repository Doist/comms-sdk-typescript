import type { Dispatcher } from 'undici'

let defaultDispatcher: Dispatcher | undefined
let defaultDispatcherPromise: Promise<Dispatcher | undefined> | undefined

export async function getDefaultDispatcher(): Promise<Dispatcher | undefined> {
    if (defaultDispatcher) {
        return defaultDispatcher
    }

    if (!defaultDispatcherPromise) {
        defaultDispatcherPromise = createDefaultDispatcher()
            .then((dispatcher) => {
                defaultDispatcher = dispatcher
                return dispatcher
            })
            .catch((error) => {
                defaultDispatcher = undefined
                defaultDispatcherPromise = undefined
                throw error
            })
    }

    return defaultDispatcherPromise
}

/**
 * Drains the default dispatcher's connection pool. CLIs and scripts should
 * `await` this before exit so Node's event loop empties immediately instead
 * of waiting ~4s on keep-alive. No-op in the browser branch.
 */
export async function closeDefaultDispatcher(): Promise<void> {
    // Clear the singleton *before* awaiting init, so any concurrent
    // `getDefaultDispatcher()` after this point creates a fresh dispatcher
    // instead of receiving a reference to the one we're about to close.
    const initPromise = defaultDispatcherPromise
    defaultDispatcher = undefined
    defaultDispatcherPromise = undefined

    if (!initPromise) return

    try {
        const dispatcher = await initPromise
        if (dispatcher) {
            await dispatcher.close()
        }
    } catch {
        // init failed; nothing to close
    }
}

export function resetDefaultDispatcherForTests(): void {
    defaultDispatcher = undefined
    defaultDispatcherPromise = undefined
}

function isNodeEnvironment(): boolean {
    return typeof process !== 'undefined' && typeof process.versions?.node === 'string'
}

async function createDefaultDispatcher(): Promise<Dispatcher | undefined> {
    if (!isNodeEnvironment()) {
        return undefined
    }

    // Dynamic import so non-Node consumers (browser, edge runtimes) don't pull
    // undici into their bundle. `isNodeEnvironment()` above already gated this
    // branch, so undici is safe to load when we get here.
    const { EnvHttpProxyAgent, interceptors } = await import('undici')

    // `allowH2: true` opts into HTTP/2 via ALPN; undici falls back to h1.1
    // when the server doesn't negotiate h2. Without this flag undici
    // defaults to h1.1 even when the server supports h2.
    const agent = new EnvHttpProxyAgent({ allowH2: true })

    // Some runtimes report `process.versions.node` (so `isNodeEnvironment()`
    // passes) but ship only a partial undici: `interceptors.decompress` is
    // absent and dispatchers have no `.compose`. Bun is the common case. There
    // the proxy agent alone is enough — Bun's `fetch` decompresses
    // gzip/deflate/br/zstd natively — so skip the interceptor instead of
    // crashing on the missing API.
    if (typeof interceptors.decompress !== 'function') {
        return agent
    }

    // `interceptors.decompress()` decodes gzip/deflate/br/zstd bodies. On
    // Node 24+, attaching any custom dispatcher to global `fetch` strips
    // `content-encoding` without actually decompressing the body.
    // See https://github.com/Doist/todoist-cli/issues/318.
    //
    // Emits ExperimentalWarning on first use; suppressed during init.
    return suppressExperimentalWarningsSync(() => {
        const decompress = interceptors.decompress()
        return agent.compose(decompress)
    })
}

// `suppressExperimentalWarningsSync` is exported for direct unit testing —
// the integration path through `getDefaultDispatcher()` can't reliably
// exercise it because both the dispatcher singleton and undici's internal
// `warningEmitted` flag are once-per-process.
//
// `fn` must be synchronous so the override covers a single critical section
// (microseconds) — no unrelated `ExperimentalWarning` from elsewhere can
// interleave and be lost. We suppress every `ExperimentalWarning` rather than
// pattern-matching the message text: the message wording is an undici
// implementation detail (not a stable API), and the suppression window is
// narrow enough that a coarse type filter is safe.
export function suppressExperimentalWarningsSync<T>(fn: () => T): T {
    const originalEmit = process.emitWarning
    process.emitWarning = ((
        warning: string | Error,
        typeOrOptions?: string | { type?: string },
        ...rest: unknown[]
    ): void => {
        const type =
            typeof typeOrOptions === 'string'
                ? typeOrOptions
                : typeof typeOrOptions === 'object' && typeOrOptions !== null
                  ? typeOrOptions.type
                  : undefined
        if (type === 'ExperimentalWarning') return
        ;(originalEmit as (...args: unknown[]) => void).call(
            process,
            warning,
            typeOrOptions,
            ...rest,
        )
    }) as typeof process.emitWarning
    try {
        return fn()
    } finally {
        process.emitWarning = originalEmit
    }
}
