import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

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
