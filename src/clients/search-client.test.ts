import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { CommsApi } from '../comms-api'
import { server } from '../testUtils/msw-setup'
import {
    TEST_API_BASE_URL as BASE,
    TEST_API_TOKEN,
    TEST_CHANNEL_ID,
    TEST_COMMENT_ID,
    TEST_CONVERSATION_ID,
    TEST_MESSAGE_ID,
    TEST_THREAD_ID,
} from '../testUtils/test-defaults'

// Pins the search result contract: `id` is the prefixed result key
// (`thread_<threadId>` / `conversation_<conversationId>`), and the matched-object
// pointers (`commentId`, `messageId`) survive schema parsing.

describe('SearchClient — result parsing', () => {
    it('keeps typed ids on thread and conversation results', async () => {
        server.use(
            http.get(`${BASE}/search`, () => {
                return HttpResponse.json({
                    items: [
                        {
                            id: `thread_${TEST_THREAD_ID}`,
                            type: 'thread',
                            snippet: 'a comment match',
                            snippet_creator_id: 1,
                            snippet_last_updated_ts: 1700000000,
                            thread_id: TEST_THREAD_ID,
                            comment_id: TEST_COMMENT_ID,
                            channel_id: TEST_CHANNEL_ID,
                            channel_name: 'General',
                            title: 'A thread',
                            closed: false,
                        },
                        {
                            id: `conversation_${TEST_CONVERSATION_ID}`,
                            type: 'conversation',
                            snippet: 'a message match',
                            snippet_creator_id: 2,
                            snippet_last_updated_ts: 1700000001,
                            conversation_id: TEST_CONVERSATION_ID,
                            message_id: TEST_MESSAGE_ID,
                        },
                    ],
                    next_cursor_mark: null,
                    has_more: false,
                    is_plan_restricted: false,
                })
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        const response = await api.search.search({ query: 'match', workspaceId: 1 })

        expect(response.items).toHaveLength(2)
        const [threadResult, conversationResult] = response.items
        expect(threadResult).toMatchObject({
            id: `thread_${TEST_THREAD_ID}`,
            type: 'thread',
            threadId: TEST_THREAD_ID,
            commentId: TEST_COMMENT_ID,
            channelId: TEST_CHANNEL_ID,
        })
        expect(conversationResult).toMatchObject({
            id: `conversation_${TEST_CONVERSATION_ID}`,
            type: 'conversation',
            conversationId: TEST_CONVERSATION_ID,
            messageId: TEST_MESSAGE_ID,
        })
    })
})
