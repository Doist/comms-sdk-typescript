import { http, HttpResponse } from 'msw'
import { CommsApi } from './comms-api'
import { apiUrl } from './testUtils/msw-handlers'
import { server } from './testUtils/msw-setup'
import { mockUser, TEST_API_TOKEN } from './testUtils/test-defaults'

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
})
