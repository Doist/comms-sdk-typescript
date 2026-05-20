import { CommsRequestError } from '../types/errors'
import type { CustomFetch, CustomFetchResponse, HttpResponse } from '../types/http'
import { camelCaseKeys } from '../utils/case-conversion'
import { transformTimestamps } from '../utils/timestamp-conversion'
import { getDefaultDispatcher } from './http-dispatcher'

export async function fetchWithRetry<T>(
    url: string,
    options: RequestInit & { timeout?: number },
    maxRetries: number = 3,
    customFetch?: CustomFetch,
): Promise<HttpResponse<T>> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
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

    throw new CommsRequestError(lastError?.message ?? 'Request failed')
}

async function fetchWithDefaultTransport(
    url: string,
    options: RequestInit & { timeout?: number },
    signal?: AbortSignal,
): Promise<CustomFetchResponse> {
    const dispatcher = await getDefaultDispatcher()
    const response = dispatcher
        ? await fetch(url, {
              ...options,
              signal,
              // @ts-expect-error - dispatcher is valid for Node.js fetch but not in TS types
              dispatcher,
          })
        : await fetch(url, {
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
