import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { CommsApi } from '../comms-api'
import { server } from '../testUtils/msw-setup'
import {
    TEST_API_BASE_URL as BASE,
    TEST_API_TOKEN,
    TEST_COMMENT_ID,
    TEST_THREAD_ID,
} from '../testUtils/test-defaults'

// These tests pin the wire shape of `comments-client` — every camelCase
// field on the args side ends up snake_case on the wire (via
// `snakeCaseKeys` in the transport layer). The simplify pass dropped
// hand-rolled snake-casing inside the client, so this is the only thing
// that catches a casing regression locally.

describe('CommentsClient — wire serialization', () => {
    it('getComments sends thread_id / newer_than_ts / older_than_ts on the URL', async () => {
        const capturedUrls: URL[] = []
        server.use(
            http.get(`${BASE}/comments/get`, ({ request }) => {
                capturedUrls.push(new URL(request.url))
                return HttpResponse.json([])
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.comments.getComments({
            threadId: TEST_THREAD_ID,
            newerThan: new Date('2026-01-01T00:00:00Z'),
            olderThan: new Date('2026-02-01T00:00:00Z'),
            limit: 50,
        })

        expect(capturedUrls).toHaveLength(1)
        const params = (capturedUrls[0] as URL).searchParams
        expect(params.get('thread_id')).toBe(TEST_THREAD_ID)
        expect(params.get('newer_than_ts')).toBe(
            String(Math.floor(new Date('2026-01-01T00:00:00Z').getTime() / 1000)),
        )
        expect(params.get('older_than_ts')).toBe(
            String(Math.floor(new Date('2026-02-01T00:00:00Z').getTime() / 1000)),
        )
        expect(params.get('limit')).toBe('50')
    })

    it('getComment parses the bare comment object returned by getone', async () => {
        const responseChannelId = '7YpL3oZ4kZ9vP7Q1tR2sX3y'
        server.use(
            http.get(`${BASE}/comments/getone`, ({ request }) => {
                expect(new URL(request.url).searchParams.get('id')).toBe(TEST_COMMENT_ID)
                // `getone` returns the comment at the top level, not wrapped in `{ comment }`.
                return HttpResponse.json({
                    id: TEST_COMMENT_ID,
                    thread_id: TEST_THREAD_ID,
                    channel_id: responseChannelId,
                    creator: 1,
                    content: 'hello',
                    posted_ts: Math.floor(Date.now() / 1000),
                    workspace_id: 1,
                    system_message: null,
                })
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        const comment = await api.comments.getComment(TEST_COMMENT_ID)

        expect(comment.id).toBe(TEST_COMMENT_ID)
        expect(comment.content).toBe('hello')
        expect(comment.threadId).toBe(TEST_THREAD_ID)
    })

    it('markPosition POSTs thread_id and comment_id as snake_case', async () => {
        let capturedBody: Record<string, unknown> | null = null
        server.use(
            http.post(`${BASE}/comments/mark_position`, async ({ request }) => {
                capturedBody = (await request.json()) as Record<string, unknown>
                return HttpResponse.json({ status: 'ok' })
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.comments.markPosition({
            threadId: TEST_THREAD_ID,
            commentId: TEST_COMMENT_ID,
        })

        expect(capturedBody).toEqual({
            thread_id: TEST_THREAD_ID,
            comment_id: TEST_COMMENT_ID,
        })
    })
})

describe('CommentsClient — baseUrl in entity links', () => {
    it('roots the returned comment url at the configured baseUrl', async () => {
        const customBase = 'https://comms.example.com'
        const responseChannelId = '7YpL3oZ4kZ9vP7Q1tR2sX3y'
        const responseCommentId = '7YpL3oZ4kZ9vP7Q1tR2sX41'
        server.use(
            http.post(`${customBase}/api/v1/comments/add`, () =>
                HttpResponse.json({
                    id: responseCommentId,
                    thread_id: TEST_THREAD_ID,
                    channel_id: responseChannelId,
                    creator: 1,
                    content: 'hello',
                    posted_ts: Math.floor(Date.now() / 1000),
                    workspace_id: 1,
                    system_message: null,
                }),
            ),
        )

        const api = new CommsApi(TEST_API_TOKEN, { baseUrl: customBase })
        const comment = await api.comments.createComment({
            threadId: TEST_THREAD_ID,
            content: 'hello',
        })

        expect(comment.url).toBe(
            `${customBase}/1/ch/${responseChannelId}/t/${TEST_THREAD_ID}/c/${responseCommentId}`,
        )
    })

    it('strips a trailing slash on baseUrl so links do not double up', async () => {
        const responseChannelId = '7YpL3oZ4kZ9vP7Q1tR2sX3y'
        const responseCommentId = '7YpL3oZ4kZ9vP7Q1tR2sX41'
        server.use(
            http.post('https://comms.example.com/api/v1/comments/add', () =>
                HttpResponse.json({
                    id: responseCommentId,
                    thread_id: TEST_THREAD_ID,
                    channel_id: responseChannelId,
                    creator: 1,
                    content: 'hello',
                    posted_ts: Math.floor(Date.now() / 1000),
                    workspace_id: 1,
                    system_message: null,
                }),
            ),
        )

        const api = new CommsApi(TEST_API_TOKEN, { baseUrl: 'https://comms.example.com/' })
        const comment = await api.comments.createComment({
            threadId: TEST_THREAD_ID,
            content: 'hello',
        })

        expect(comment.url).toBe(
            `https://comms.example.com/1/ch/${responseChannelId}/t/${TEST_THREAD_ID}/c/${responseCommentId}`,
        )
    })
})
