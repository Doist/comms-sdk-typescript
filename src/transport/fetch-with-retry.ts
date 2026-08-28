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
    const seen = new Set<unknown>()
    let current: unknown = error?.cause

    while (
        current instanceof Error &&
        !seen.has(current) &&
        descriptions.length < CAUSE_CHAIN_LIMIT
    ) {
        seen.add(current)
        const description = describeCause(current)
        if (description) {
            descriptions.push(description)
        }
        // A failed connect can carry one error per address it tried; the first
        // one is representative and the rest are the same failure repeated.
        const aggregated = current instanceof AggregateError ? current.errors[0] : undefined
        current = aggregated ?? current.cause
    }

    return descriptions.length > 0 ? descriptions.join(' <- ') : undefined
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

function isNetworkError(error: Error): boolean {
    return (
        error.name === 'TypeError' ||
        error.name === timeoutErrorName ||
        error.message.toLowerCase().includes('network')
    )
}

function getRetryDelay(retryCount: number): number {
    return retryCount === 1 ? 0 : 500
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
