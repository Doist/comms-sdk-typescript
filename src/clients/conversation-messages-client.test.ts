import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { CommsApi } from '../comms-api'
import { server } from '../testUtils/msw-setup'
import {
    TEST_API_BASE_URL as BASE,
    TEST_API_TOKEN,
    TEST_CONVERSATION_ID,
} from '../testUtils/test-defaults'
import { generateId } from '../utils/uuidv7'

// The transport layer parses JSON, camelCases keys, and turns `*_ts`
// epoch seconds into Date fields. Wire fixtures here use the raw
// snake_case + `_ts` shape so the response goes through that pipeline
// like a real API response would.
const MESSAGE_RESPONSE = {
    id: 1,
    content: 'hi',
    creator: 1,
    conversation_id: TEST_CONVERSATION_ID,
    posted_ts: Math.floor(Date.now() / 1000),
    workspace_id: 1,
    obj_index: 0,
}

// Pins wire shape for conversation-messages: camelCase args → snake_case
// payload (via transport's `snakeCaseKeys`). The simplify pass removed
// hand-rolled snake-casing in this client; without these tests, a casing
// regression only surfaces against the real API.

describe('ConversationMessagesClient — wire serialization', () => {
    it('getMessages sends conversation_id / newer_than_ts / older_than_ts', async () => {
        const capturedUrls: URL[] = []
        server.use(
            http.get(`${BASE}/conversation_messages/get`, ({ request }) => {
                capturedUrls.push(new URL(request.url))
                return HttpResponse.json([])
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.conversationMessages.getMessages({
            conversationId: TEST_CONVERSATION_ID,
            newerThan: new Date('2026-01-01T00:00:00Z'),
            olderThan: new Date('2026-02-01T00:00:00Z'),
            limit: 50,
            cursor: 'abc',
        })

        expect(capturedUrls).toHaveLength(1)
        const params = (capturedUrls[0] as URL).searchParams
        expect(params.get('conversation_id')).toBe(TEST_CONVERSATION_ID)
        expect(params.get('newer_than_ts')).toBe(
            String(Math.floor(new Date('2026-01-01T00:00:00Z').getTime() / 1000)),
        )
        expect(params.get('older_than_ts')).toBe(
            String(Math.floor(new Date('2026-02-01T00:00:00Z').getTime() / 1000)),
        )
        expect(params.get('limit')).toBe('50')
        expect(params.get('cursor')).toBe('abc')
    })

    it('createMessage POSTs snake_case keys on the wire', async () => {
        const capturedBodies: Record<string, unknown>[] = []
        server.use(
            http.post(`${BASE}/conversation_messages/add`, async ({ request }) => {
                capturedBodies.push((await request.json()) as Record<string, unknown>)
                return HttpResponse.json(MESSAGE_RESPONSE)
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.conversationMessages.createMessage({
            conversationId: TEST_CONVERSATION_ID,
            content: 'hi',
            id: generateId(),
            directMentions: [42],
            directGroupMentions: ['EVERYONE'],
            notify: false,
        })

        expect(capturedBodies).toHaveLength(1)
        const body = capturedBodies[0] as Record<string, unknown>
        expect(body).toMatchObject({
            conversation_id: TEST_CONVERSATION_ID,
            content: 'hi',
            direct_mentions: [42],
            direct_group_mentions: ['EVERYONE'],
            notify: false,
        })
        expect(body.id).toBeTypeOf('string')
    })
})
