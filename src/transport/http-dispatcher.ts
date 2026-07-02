import type { Dispatcher } from 'undici'

// undici's own `fetch`, typed from the same package the dispatcher comes from.
type UndiciFetch = typeof import('undici').fetch

let defaultDispatcher: Dispatcher | undefined
let defaultDispatcherPromise: Promise<Dispatcher | undefined> | undefined

// undici's own `fetch`, paired with the composed dispatcher above. Set only on
// the full-undici Node path; left undefined elsewhere so callers fall back to
// the global `fetch`. See `getDefaultFetch` for why this pairing matters.
let defaultFetch: UndiciFetch | undefined

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
    defaultFetch = undefined

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
    defaultFetch = undefined
}

/**
 * The `fetch` implementation that must be used with {@link getDefaultDispatcher}'s
 * dispatcher. Returns undici's own `fetch` on the full-undici Node path, or
 * `undefined` (meaning: use the global `fetch`) in the browser/edge/Bun paths.
 *
 * Node's global `fetch` is backed by whatever undici version ships inside that
 * Node release (6.x on Node 22 … 8.x on Node 26). Our dispatcher — and its
 * `decompress` interceptor — comes from the npm `undici` package, which is a
 * different version. Handing an npm-undici dispatcher to a mismatched built-in
 * client makes gzip responses fail mid-stream with `terminated`. Sourcing
 * `fetch` from the same npm `undici` keeps the whole request path on one
 * version and removes the split.
 *
 * Only meaningful after {@link getDefaultDispatcher} has resolved, which is the
 * one place that populates it.
 */
export function getDefaultFetch(): UndiciFetch | undefined {
    return defaultFetch
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
    const { EnvHttpProxyAgent, interceptors, fetch: undiciFetch } = await import('undici')

    // `EnvHttpProxyAgent` (with `allowH2`) and `interceptors.decompress()` both
    // emit an ExperimentalWarning on first use, so build the whole dispatcher
    // inside the suppression block.
    return suppressExperimentalWarningsSync(() => {
        // `allowH2: true` opts into HTTP/2 via ALPN; undici falls back to h1.1
        // when the server doesn't negotiate h2. Without this flag undici
        // defaults to h1.1 even when the server supports h2.
        const agent = new EnvHttpProxyAgent({ allowH2: true })

        // Some runtimes report `process.versions.node` (so `isNodeEnvironment()`
        // passes) but ship only a partial undici: `interceptors.decompress` is
        // absent and dispatchers have no `.compose`. Bun is the common case.
        // There the proxy agent alone is enough — Bun's `fetch` decompresses
        // gzip/deflate/br/zstd natively — so skip the interceptor instead of
        // crashing on the missing API. Optional chaining also guards a runtime
        // that omits the `interceptors` export entirely.
        if (typeof interceptors?.decompress !== 'function') {
            return agent
        }

        // `interceptors.decompress()` decodes gzip/deflate/br/zstd bodies. On
        // Node 24+, attaching any custom dispatcher to global `fetch` strips
        // `content-encoding` without actually decompressing the body.
        // See https://github.com/Doist/todoist-cli/issues/318.
        const decompress = interceptors.decompress()

        // Pair undici's own `fetch` with this dispatcher so the request client
        // and the dispatcher stay on one undici version (see `getDefaultFetch`).
        // The global `fetch` is backed by a different, Node-bundled undici;
        // mixing the two makes the decompress interceptor terminate gzip
        // responses on some Node versions.
        defaultFetch = undiciFetch

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
