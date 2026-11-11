import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'
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
import { type SearchResult, SearchResultSchema, type SearchResultType } from '../types/entities'

// Pins the search result contract: `id` is the prefixed result key
// (`thread_<threadId>` / `conversation_<conversationId>`), and the matched-object
// pointers (`commentId`, `messageId`) survive schema parsing.

const SEARCH_RESULT_BASE = {
    id: 'result-id',
    snippet: 'a match',
    snippetCreatorId: 1,
    snippetLastUpdated: new Date(0),
}

describe('SearchResultSchema', () => {
    it('requires the owning id for each result type', () => {
        expect(() => SearchResultSchema.parse({ ...SEARCH_RESULT_BASE, type: 'thread' })).toThrow()
        expect(() =>
            SearchResultSchema.parse({ ...SEARCH_RESULT_BASE, type: 'conversation' }),
        ).toThrow()
    })

    it('accepts nullable matched ids and strips unknown fields', () => {
        expect(
            SearchResultSchema.parse({
                ...SEARCH_RESULT_BASE,
                type: 'thread',
                threadId: TEST_THREAD_ID,
                commentId: null,
                futureField: 'ignored',
            }),
        ).toEqual({
            ...SEARCH_RESULT_BASE,
            type: 'thread',
            threadId: TEST_THREAD_ID,
            commentId: null,
        })

        expect(
            SearchResultSchema.parse({
                ...SEARCH_RESULT_BASE,
                type: 'conversation',
                conversationId: TEST_CONVERSATION_ID,
                messageId: null,
            }),
        ).toEqual({
            ...SEARCH_RESULT_BASE,
            type: 'conversation',
            conversationId: TEST_CONVERSATION_ID,
            messageId: null,
        })
    })

    it('rejects unknown result types', () => {
        expect(() =>
            SearchResultSchema.parse({
                ...SEARCH_RESULT_BASE,
                type: 'message',
                messageId: TEST_MESSAGE_ID,
            }),
        ).toThrow()
    })

    it('narrows ids by result type', () => {
        expectTypeOf<SearchResult['type']>().toEqualTypeOf<SearchResultType>()

        const assertNarrowing = (result: SearchResult) => {
            if (result.type === 'thread') {
                expectTypeOf(result.threadId).toEqualTypeOf<string>()
                expectTypeOf(result.commentId).toEqualTypeOf<string | null | undefined>()
                // @ts-expect-error Conversation ids are not exposed on thread results.
                void result.conversationId
            } else {
                expectTypeOf(result.conversationId).toEqualTypeOf<string>()
                expectTypeOf(result.messageId).toEqualTypeOf<string | null | undefined>()
                // @ts-expect-error Thread ids are not exposed on conversation results.
                void result.threadId
            }
        }

        assertNarrowing(
            SearchResultSchema.parse({
                ...SEARCH_RESULT_BASE,
                type: 'thread',
                threadId: TEST_THREAD_ID,
            }),
        )
        assertNarrowing(
            SearchResultSchema.parse({
                ...SEARCH_RESULT_BASE,
                type: 'conversation',
                conversationId: TEST_CONVERSATION_ID,
            }),
        )
    })
})

describe('SearchClient — request parameters', () => {
    function captureSearchParams(): { params: URLSearchParams } {
        const captured = { params: new URLSearchParams() }
        server.use(
            http.get(`${BASE}/search`, ({ request }) => {
                captured.params = new URL(request.url).searchParams
                return HttpResponse.json({
                    items: [],
                    has_more: false,
                    is_plan_restricted: false,
                })
            }),
        )
        return captured
    }

    it('sends the cursor as cursor_mark', async () => {
        const captured = captureSearchParams()

        const api = new CommsApi(TEST_API_TOKEN)
        await api.search.search({ query: 'match', workspaceId: 1, cursor: 'next-page' })

        expect(captured.params.get('cursor_mark')).toBe('next-page')
        expect(captured.params.has('cursor')).toBe(false)
    })

    it('sends the search type', async () => {
        const captured = captureSearchParams()

        const api = new CommsApi(TEST_API_TOKEN)
        await api.search.search({ query: 'match', workspaceId: 1, type: 'conversations' })

        expect(captured.params.get('type')).toBe('conversations')
    })

    it('leaves out the search type by default', async () => {
        const captured = captureSearchParams()

        const api = new CommsApi(TEST_API_TOKEN)
        await api.search.search({ query: 'match', workspaceId: 1 })

        expect(captured.params.has('type')).toBe(false)
    })
})

describe('SearchClient — result parsing', () => {
    it('parses a chat title result, which has no message id', async () => {
        server.use(
            http.get(`${BASE}/search`, () => {
                return HttpResponse.json({
                    items: [
                        {
                            id: `conversation_${TEST_CONVERSATION_ID}`,
                            type: 'conversation',
                            title: 'Roadmap',
                            snippet: 'Roadmap',
                            snippet_creator_id: 2,
                            snippet_last_updated_ts: 1700000000,
                            conversation_id: TEST_CONVERSATION_ID,
                            user_ids: [1, 2, 3],
                            extra_matches: [],
                        },
                    ],
                    has_more: false,
                    is_plan_restricted: false,
                })
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        const response = await api.search.search({
            query: 'roadmap',
            workspaceId: 1,
            type: 'conversations',
        })

        expect(response.items).toHaveLength(1)
        expect(response.items[0]).toMatchObject({
            type: 'conversation',
            title: 'Roadmap',
            conversationId: TEST_CONVERSATION_ID,
            userIds: [1, 2, 3],
        })
        expect(response.items[0]).not.toHaveProperty('messageId')
    })

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
                        // Legacy documents can carry numeric message ids
                        {
                            id: `conversation_${TEST_CONVERSATION_ID}`,
                            type: 'conversation',
                            snippet: 'a legacy message match',
                            snippet_creator_id: 2,
                            snippet_last_updated_ts: 1700000002,
                            conversation_id: TEST_CONVERSATION_ID,
                            message_id: 123456,
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

        expect(response.items).toHaveLength(3)
        const [threadResult, conversationResult, legacyConversationResult] = response.items
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
        expect(legacyConversationResult).toMatchObject({ messageId: '123456' })
    })

    it('keeps the whole page when a result has a null snippet', async () => {
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
                        },
                        {
                            id: `thread_${TEST_THREAD_ID}`,
                            type: 'thread',
                            snippet: null,
                            snippet_creator_id: 1,
                            snippet_last_updated_ts: 1700000001,
                            thread_id: TEST_THREAD_ID,
                            comment_id: TEST_COMMENT_ID,
                        },
                        {
                            id: `conversation_${TEST_CONVERSATION_ID}`,
                            type: 'conversation',
                            snippet: null,
                            snippet_creator_id: 2,
                            snippet_last_updated_ts: 1700000002,
                            conversation_id: TEST_CONVERSATION_ID,
                            message_id: TEST_MESSAGE_ID,
                        },
                    ],
                    next_cursor_mark: 'next-page',
                    has_more: true,
                    is_plan_restricted: false,
                })
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        const response = await api.search.search({ query: 'in:threads', workspaceId: 1 })

        expect(response.items.map((result) => result.snippet)).toEqual(['a comment match', '', ''])
        expect(response.items[1]).toMatchObject({
            type: 'thread',
            threadId: TEST_THREAD_ID,
            commentId: TEST_COMMENT_ID,
        })
        expect(response.items[2]).toMatchObject({
            type: 'conversation',
            conversationId: TEST_CONVERSATION_ID,
            messageId: TEST_MESSAGE_ID,
        })
        expect(response.nextCursorMark).toBe('next-page')
        expect(response.hasMore).toBe(true)
    })
})
