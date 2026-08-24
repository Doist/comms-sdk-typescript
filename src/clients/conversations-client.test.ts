import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { CommsApi } from '../comms-api'
import { server } from '../testUtils/msw-setup'
import {
    TEST_API_BASE_URL as BASE,
    TEST_API_TOKEN,
    TEST_CONVERSATION_ID,
} from '../testUtils/test-defaults'

const CONVERSATION_RESPONSE = {
    id: TEST_CONVERSATION_ID,
    workspace_id: 1,
    user_ids: [1, 2],
    message_count: 1,
    last_obj_index: 0,
    snippet: 'Hello there',
    snippet_creators: [1],
    last_active_ts: 1_609_459_200,
    archived: false,
    created_ts: 1_609_459_200,
    creator: 1,
}

// Pins the wire shape of the `conversations/get` pagination args. `olderThan`
// is a `Date` that the client must convert itself — the transport's generic
// snake-casing would turn a `Date` into an empty object.

describe('ConversationsClient — wire serialization', () => {
    async function captureGetParams(
        args: Parameters<CommsApi['conversations']['getConversations']>[0],
    ) {
        const capturedUrls: URL[] = []
        server.use(
            http.get(`${BASE}/conversations/get`, ({ request }) => {
                capturedUrls.push(new URL(request.url))
                return HttpResponse.json([])
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.conversations.getConversations(args)

        expect(capturedUrls).toHaveLength(1)
        return (capturedUrls[0] as URL).searchParams
    }

    it('getConversations sends the compound cursor as older_than_ts / before_id', async () => {
        const olderThan = new Date('2026-06-25T15:53:53Z')
        const params = await captureGetParams({
            workspaceId: 123,
            archived: false,
            olderThan,
            beforeId: TEST_CONVERSATION_ID,
            limit: 500,
        })

        expect(params.get('workspace_id')).toBe('123')
        expect(params.get('archived')).toBe('false')
        expect(params.get('older_than_ts')).toBe(String(Math.floor(olderThan.getTime() / 1000)))
        // The Date arg must not leak through the generic snake-casing.
        expect(params.has('older_than')).toBe(false)
        expect(params.get('before_id')).toBe(TEST_CONVERSATION_ID)
        expect(params.get('limit')).toBe('500')
    })

    it('getConversations keeps the minimal call shape unchanged', async () => {
        const params = await captureGetParams({ workspaceId: 123 })

        expect(params.get('workspace_id')).toBe('123')
        expect(params.has('archived')).toBe(false)
        expect(params.has('older_than_ts')).toBe(false)
        expect(params.has('before_id')).toBe(false)
        expect(params.has('limit')).toBe(false)
    })

    it('archiveConversation posts the conversation id', async () => {
        let body: Record<string, unknown> | undefined
        server.use(
            http.post(`${BASE}/conversations/archive`, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>
                return HttpResponse.json({ ...CONVERSATION_RESPONSE, archived: true })
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        const conversation = await api.conversations.archiveConversation(TEST_CONVERSATION_ID)

        expect(body).toEqual({ id: TEST_CONVERSATION_ID })
        expect(conversation.archived).toBe(true)
    })

    it('unarchiveConversation posts the conversation id', async () => {
        let body: Record<string, unknown> | undefined
        server.use(
            http.post(`${BASE}/conversations/unarchive`, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>
                return HttpResponse.json(CONVERSATION_RESPONSE)
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        const conversation = await api.conversations.unarchiveConversation(TEST_CONVERSATION_ID)

        expect(body).toEqual({ id: TEST_CONVERSATION_ID })
        expect(conversation.archived).toBe(false)
    })
})
