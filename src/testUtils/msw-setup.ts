import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

// In production the transport uses undici's own `fetch` (paired with the
// dispatcher) so the request client and dispatcher stay on one undici version.
// MSW intercepts the *global* `fetch`, not that separate undici instance, so
// force the transport onto the global `fetch` for every test in the suite;
// MSW then intercepts requests as usual. The real undici transport is covered
// directly by `http-dispatcher.test.ts` and `fetch-with-retry.test.ts`, which
// opt out of this seam.
vi.mock('../transport/http-dispatcher', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../transport/http-dispatcher')>()
    return {
        ...actual,
        getDefaultTransport: vi.fn(async () => undefined),
    }
})

// Create MSW server instance
export const server = setupServer()

// Start server before all tests
beforeAll(() => {
    // Only warn on unhandled requests instead of error, since transport/http-client.test.ts
    // uses direct fetch mocking which bypasses MSW
    server.listen({ onUnhandledRequest: 'warn' })
})

// Reset handlers after each test
afterEach(() => {
    server.resetHandlers()
})

// Clean up after all tests
afterAll(() => {
    server.close()
})
