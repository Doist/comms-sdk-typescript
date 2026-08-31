import { CommsRequestError } from '../types/errors'
import type { CustomFetch, CustomFetchResponse, HttpResponse } from '../types/http'
import { camelCaseKeys } from '../utils/case-conversion'
import { transformTimestamps } from '../utils/timestamp-conversion'
import { getDefaultTransport } from './http-dispatcher'

export async function fetchWithRetry<T>(
    url: string,
    options: RequestInit & { timeout?: number },
    maxRetries: number = 3,
    customFetch?: CustomFetch,
): Promise<HttpResponse<T>> {
    let lastError: Error | undefined
    let attempt = 0

    for (; attempt <= maxRetries; attempt++) {
        let clearTimeoutFn: (() => void) | undefined

        try {
            let requestSignal = options.signal || undefined
            if (options.timeout && options.timeout > 0) {
                const timeoutResult = createTimeoutSignal(options.timeout, requestSignal)
                requestSignal = timeoutResult.signal
                clearTimeoutFn = timeoutResult.clear
            }

            const response: CustomFetchResponse = customFetch
                ? await customFetch(url, options)
                : await fetchWithDefaultTransport(url, options, requestSignal)

            const responseText = await response.text()
            let responseData: T

            try {
                responseData = responseText ? (JSON.parse(responseText) as T) : (undefined as T)
            } catch {
                responseData = responseText as T
            }

            if (!response.ok) {
                throw new CommsRequestError(
                    `Request failed with status ${response.status}`,
                    response.status,
                    responseData,
                )
            }

            const camelCased = camelCaseKeys(responseData)
            const transformed = transformTimestamps(camelCased)

            if (clearTimeoutFn) {
                clearTimeoutFn()
            }

            return {
                data: transformed as T,
                status: response.status,
                headers: response.headers,
            }
        } catch (error) {
            if (clearTimeoutFn) {
                clearTimeoutFn()
            }

            lastError = error instanceof Error ? error : new Error('Unknown error')

            if (attempt < maxRetries && isNetworkError(lastError)) {
                const delay = getRetryDelay(attempt + 1)
                if (delay > 0) {
                    await sleep(delay)
                }

                continue
            }

            break
        }
    }

    if (lastError instanceof CommsRequestError) {
        throw lastError
    }

    throw new CommsRequestError(
        describeTransportFailure(lastError, attempt + 1),
        undefined,
        undefined,
        {
            cause: lastError,
        },
    )
}

/** Causes reported before the rest of the chain is dropped. */
const CAUSE_CHAIN_LIMIT = 3

/**
 * Builds the message for a request that never produced a response.
 *
 * `fetch` reports every transport problem as the same `fetch failed`, and puts
 * the reason a caller actually needs — `ENOTFOUND`, `ECONNRESET`, a TLS failure
 * — in `cause`. Dropping that leaves an unattributable error in the logs, so
 * unwrap the chain into the message and keep the original as `cause`.
 */
function describeTransportFailure(error: Error | undefined, attempts: number): string {
    const base = error?.message ?? 'Request failed'
    const cause = describeCauseChain(error)
    const tries = attempts > 1 ? ` after ${attempts} attempts` : ''

    return cause ? `${base} (${cause})${tries}` : `${base}${tries}`
}

function describeCauseChain(error: Error | undefined): string | undefined {
    const descriptions: string[] = []

    for (const cause of causeChain(error)) {
        const description = describeCause(cause)
        if (description) {
            descriptions.push(description)
        }
    }

    return descriptions.length > 0 ? descriptions.join(' <- ') : undefined
}

/**
 * Walks an error's `cause` chain, stopping at {@link CAUSE_CHAIN_LIMIT} and on
 * a cycle. A failed connect can carry one error per address it tried; the first
 * is representative and the rest repeat the same failure.
 */
function* causeChain(error: Error | undefined): Generator<Error> {
    const seen = new Set<unknown>()
    let current: unknown = error?.cause
    let depth = 0

    while (current instanceof Error && !seen.has(current) && depth < CAUSE_CHAIN_LIMIT) {
        seen.add(current)
        depth++
        yield current

        const aggregated = current instanceof AggregateError ? current.errors[0] : undefined
        current = aggregated ?? current.cause
    }
}

function describeCause(error: Error): string {
    const code = (error as { code?: unknown }).code

    return typeof code === 'string' && code.length > 0 ? `${code}: ${error.message}` : error.message
}

async function fetchWithDefaultTransport(
    url: string,
    options: RequestInit & { timeout?: number },
    signal?: AbortSignal,
): Promise<CustomFetchResponse> {
    // Read the dispatcher and its paired `fetch` as one value so they can never
    // be mismatched. On Node, `fetch` is undici's own — paired with the
    // dispatcher — so the request client and dispatcher stay on one undici
    // version; otherwise the `decompress` interceptor terminates gzip responses
    // when the global `fetch`'s bundled undici differs. Browser/edge (and Bun)
    // have no paired `fetch` and fall back to the global one.
    const transport = await getDefaultTransport()
    // undici's `fetch` and the global `fetch` are the same function at runtime
    // but carry different (undici vs DOM) `RequestInit`/`Response` types. Call
    // through the global signature, which matches the global-typed `options`.
    const fetchImpl = (transport?.fetch ?? fetch) as typeof fetch
    const response = transport?.dispatcher
        ? await fetchImpl(url, {
              ...options,
              signal,
              // @ts-expect-error - dispatcher is valid for Node.js fetch but not in TS types
              dispatcher: transport.dispatcher,
          })
        : await fetchImpl(url, {
              ...options,
              signal,
          })

    return convertResponseToCustomFetch(response)
}

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

const timeoutErrorName = 'TimeoutError'

function createTimeoutError(timeoutMs: number): Error {
    const error = new Error(`Request timeout after ${timeoutMs}ms`)
    error.name = timeoutErrorName
    return error
}

/**
 * Transport-level failure codes worth another attempt: the request never got an
 * answer, so nothing about the response argues against retrying. `UND_ERR_SOCKET`
 * covers the HTTP/2 `GOAWAY` an edge proxy sends when it retires a pooled
 * connection, which is otherwise indistinguishable from any other `fetch failed`.
 */
const NETWORK_ERROR_CODES = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'EAI_AGAIN',
    'ENOTFOUND',
    'EPIPE',
    'ETIMEDOUT',
    'UND_ERR_SOCKET',
])

function isNetworkError(error: Error): boolean {
    return (
        error.name === 'TypeError' ||
        error.name === timeoutErrorName ||
        error.message.toLowerCase().includes('network') ||
        hasNetworkErrorCode(error)
    )
}

function hasNetworkErrorCode(error: Error): boolean {
    // The code can be on the error itself — a `customFetch` is free to reject
    // with one directly — or on anything `fetch` wrapped to produce it.
    if (hasRetryableCode(error)) {
        return true
    }

    for (const cause of causeChain(error)) {
        if (hasRetryableCode(cause)) {
            return true
        }
    }

    return false
}

function hasRetryableCode(error: Error): boolean {
    const code = (error as { code?: unknown }).code

    return typeof code === 'string' && NETWORK_ERROR_CODES.has(code)
}

/** First retry delay, doubling by {@link RETRY_DELAY_FACTOR} per attempt. */
const RETRY_BASE_DELAY_MS = 100
const RETRY_DELAY_FACTOR = 4
const RETRY_MAX_DELAY_MS = 2000

/**
 * How long to wait before retry `retryCount` (1-based).
 *
 * A retired connection takes a moment to be torn down and replaced, so retrying
 * immediately just re-dispatches onto the socket that is going away and burns
 * the whole retry budget inside a second. The delay grows so the later attempts
 * land on a fresh connection, and carries jitter because one retirement hits
 * every pooled connection at once: without it, every caller reconnects in step.
 */
function getRetryDelay(retryCount: number): number {
    const delay = Math.min(
        RETRY_BASE_DELAY_MS * RETRY_DELAY_FACTOR ** (retryCount - 1),
        RETRY_MAX_DELAY_MS,
    )

    return delay / 2 + Math.random() * (delay / 2)
}

function createTimeoutSignal(
    timeoutMs: number,
    existingSignal?: AbortSignal,
): {
    signal: AbortSignal
    clear: () => void
} {
    const controller = new AbortController()

    const timeoutId = setTimeout(() => {
        controller.abort(createTimeoutError(timeoutMs))
    }, timeoutMs)
    let abortHandler: (() => void) | undefined

    function clear() {
        clearTimeout(timeoutId)
        if (existingSignal && abortHandler) {
            existingSignal.removeEventListener('abort', abortHandler)
        }
    }

    if (existingSignal) {
        if (existingSignal.aborted) {
            clearTimeout(timeoutId)
            controller.abort(existingSignal.reason)
        } else {
            abortHandler = () => {
                clearTimeout(timeoutId)
                controller.abort(existingSignal.reason)
            }
            existingSignal.addEventListener('abort', abortHandler, { once: true })
        }
    }

    return { signal: controller.signal, clear }
}

function convertResponseToCustomFetch(response: Response): CustomFetchResponse {
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
        headers[key] = value
    })

    return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers,
        text: () => response.clone().text(),
        json: () => response.json(),
    }
}
