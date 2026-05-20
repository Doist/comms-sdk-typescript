import type { Dispatcher } from 'undici'
import type { CustomFetchResponse } from '../types/http'

let mockFetch: ReturnType<typeof vi.fn>

function createJsonResponse(body: unknown, status: number = 200): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    })
}

function createCustomFetchResponse(body: unknown, status: number = 200): CustomFetchResponse {
    return {
        ok: status >= 200 && status < 300,
        status,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
        json: () => Promise.resolve(body),
    }
}

async function importFetchWithRetryWithMockedDispatcher(dispatcher?: Dispatcher) {
    const getDefaultDispatcher = vi.fn(async () => dispatcher)

    vi.doMock('./http-dispatcher', () => ({
        getDefaultDispatcher,
        resetDefaultDispatcherForTests: vi.fn(),
    }))

    const fetchWithRetryModule = await import('./fetch-with-retry')

    return {
        ...fetchWithRetryModule,
        getDefaultDispatcher,
    }
}

describe('fetchWithRetry transport selection', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.restoreAllMocks()
        vi.useRealTimers()

        mockFetch = vi.fn()
        global.fetch = mockFetch as unknown as typeof fetch
    })

    afterEach(() => {
        vi.unmock('./http-dispatcher')
        vi.resetModules()
        vi.useRealTimers()
    })

    it('passes the default env-aware dispatcher to built-in fetch', async () => {
        const dispatcher = { id: 'default-dispatcher' } as unknown as Dispatcher
        const { fetchWithRetry, getDefaultDispatcher } =
            await importFetchWithRetryWithMockedDispatcher(dispatcher)

        mockFetch.mockResolvedValueOnce(createJsonResponse({ id: 1 }))

        await fetchWithRetry('https://api.test.com/users', { method: 'GET' })

        expect(getDefaultDispatcher).toHaveBeenCalledTimes(1)
        expect(mockFetch).toHaveBeenCalledWith(
            'https://api.test.com/users',
            expect.objectContaining({
                dispatcher,
            }),
        )
    })

    it('does not consult the default dispatcher when customFetch is provided', async () => {
        const dispatcher = { id: 'default-dispatcher' } as unknown as Dispatcher
        const { fetchWithRetry, getDefaultDispatcher } =
            await importFetchWithRetryWithMockedDispatcher(dispatcher)

        const customFetch = vi.fn().mockResolvedValue(createCustomFetchResponse({ id: 1 }))

        await fetchWithRetry(
            'https://api.test.com/users',
            { method: 'GET', timeout: 1000 },
            3,
            customFetch,
        )

        expect(getDefaultDispatcher).not.toHaveBeenCalled()
        expect(mockFetch).not.toHaveBeenCalled()
        expect(customFetch).toHaveBeenCalledWith(
            'https://api.test.com/users',
            expect.objectContaining({
                method: 'GET',
                timeout: 1000,
            }),
        )
        expect(customFetch.mock.calls[0][1]).not.toHaveProperty('dispatcher')
    })

    it('retries timeout failures consistently', async () => {
        vi.useFakeTimers()

        const dispatcher = { id: 'default-dispatcher' } as unknown as Dispatcher
        const { fetchWithRetry } = await importFetchWithRetryWithMockedDispatcher(dispatcher)

        mockFetch
            .mockImplementationOnce(
                (_url, options) =>
                    new Promise((_resolve, reject) => {
                        const signal = options?.signal as AbortSignal | undefined
                        signal?.addEventListener(
                            'abort',
                            () => {
                                reject(signal.reason)
                            },
                            { once: true },
                        )
                    }),
            )
            .mockResolvedValueOnce(createJsonResponse({ id: 1 }))

        const requestPromise = fetchWithRetry(
            'https://api.test.com/users',
            { method: 'GET', timeout: 20 },
            1,
        )

        await vi.advanceTimersByTimeAsync(20)

        const response = await requestPromise

        expect(mockFetch).toHaveBeenCalledTimes(2)
        expect(response.status).toBe(200)
    })

    it('keeps timeout handling working on the built-in fetch path', async () => {
        vi.useFakeTimers()

        const dispatcher = { id: 'default-dispatcher' } as unknown as Dispatcher
        const { fetchWithRetry, getDefaultDispatcher } =
            await importFetchWithRetryWithMockedDispatcher(dispatcher)

        mockFetch.mockImplementationOnce(
            (_url, options) =>
                new Promise((_resolve, reject) => {
                    const signal = options?.signal as AbortSignal | undefined
                    signal?.addEventListener(
                        'abort',
                        () => {
                            reject(signal.reason)
                        },
                        { once: true },
                    )
                }),
        )

        const requestPromise = fetchWithRetry(
            'https://api.test.com/users',
            { method: 'GET', timeout: 10 },
            0,
        )
        const requestExpectation = expect(requestPromise).rejects.toThrow(
            'Request timeout after 10ms',
        )

        await vi.advanceTimersByTimeAsync(10)

        await requestExpectation
        expect(getDefaultDispatcher).toHaveBeenCalledTimes(1)
        expect(mockFetch).toHaveBeenCalledWith(
            'https://api.test.com/users',
            expect.objectContaining({
                dispatcher,
                signal: expect.any(AbortSignal),
            }),
        )
    })
})
