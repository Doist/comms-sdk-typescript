import { http, HttpResponse } from 'msw'
import { vi } from 'vitest'
import { CommsApi } from './comms-api'
import { apiUrl } from './testUtils/msw-handlers'
import { server } from './testUtils/msw-setup'
import { mockUser, TEST_API_TOKEN } from './testUtils/test-defaults'
import type { CustomFetchResponse } from './types/http'

describe('CommsApi', () => {
    it('initializes every client instance', () => {
        const api = new CommsApi(TEST_API_TOKEN)

        expect(api.users).toBeDefined()
        expect(api.workspaces).toBeDefined()
        expect(api.workspaceUsers).toBeDefined()
        expect(api.channels).toBeDefined()
        expect(api.threads).toBeDefined()
        expect(api.groups).toBeDefined()
        expect(api.conversations).toBeDefined()
        expect(api.comments).toBeDefined()
        expect(api.conversationMessages).toBeDefined()
        expect(api.inbox).toBeDefined()
        expect(api.reactions).toBeDefined()
        expect(api.search).toBeDefined()
        expect(api.attachments).toBeDefined()
    })

    it('accepts a custom base URL', () => {
        const api = new CommsApi(TEST_API_TOKEN, { baseUrl: 'https://custom.api.com' })
        expect(api.users).toBeDefined()
    })

    it('sends configured headers on client requests', async () => {
        let platformHeader: string | null = null
        server.use(
            http.get(apiUrl('api/v1/users/get_session_user'), ({ request }) => {
                platformHeader = request.headers.get('Doist-Platform')
                return HttpResponse.json(mockUser)
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN, { headers: { 'Doist-Platform': 'cli' } })
        await api.users.getSessionUser()

        expect(platformHeader).toBe('cli')
    })

    it('calls a headers function on every request', async () => {
        const requestIds: (string | null)[] = []
        server.use(
            http.get(apiUrl('api/v1/users/get_session_user'), ({ request }) => {
                requestIds.push(request.headers.get('Request-Id'))
                return HttpResponse.json(mockUser)
            }),
        )
        let count = 0
        const api = new CommsApi(TEST_API_TOKEN, {
            headers: () => ({ 'Request-Id': String(++count) }),
        })

        await api.users.getSessionUser()
        await api.users.getSessionUser()

        expect(requestIds).toEqual(['1', '2'])
    })

    it('reuses the result of a headers function when a request is retried', async () => {
        const customFetch = vi
            .fn()
            .mockRejectedValueOnce(new TypeError('fetch failed'))
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: {},
                text: () => Promise.resolve(JSON.stringify(mockUser)),
                json: () => Promise.resolve(mockUser),
            } satisfies CustomFetchResponse)
        let count = 0
        const headers = vi.fn(() => ({ 'Request-Id': String(++count) }))
        const api = new CommsApi(TEST_API_TOKEN, { headers, customFetch })

        await api.users.getSessionUser()

        expect(headers).toHaveBeenCalledTimes(1)
        expect(customFetch).toHaveBeenCalledTimes(2)
        for (const [, options] of customFetch.mock.calls) {
            expect(options.headers['Request-Id']).toBe('1')
        }
    })
})
