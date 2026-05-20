import { CommsApi } from './comms-api'
import { TEST_API_TOKEN } from './testUtils/test-defaults'

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
    })

    it('accepts a custom base URL', () => {
        const api = new CommsApi(TEST_API_TOKEN, { baseUrl: 'https://custom.api.com' })
        expect(api.users).toBeDefined()
    })
})
