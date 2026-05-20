import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { CommsApi } from '../comms-api'
import { server } from '../testUtils/msw-setup'
import { TEST_API_TOKEN, TEST_COMMENT_ID, TEST_THREAD_ID } from '../testUtils/test-defaults'

const BASE = 'https://comms.todoist.com/api/v3'

// These tests pin the wire shape of `comments-client` — every camelCase
// field on the args side ends up snake_case on the wire (via
// `snakeCaseKeys` in the transport layer). The simplify pass dropped
// hand-rolled snake-casing inside the client, so this is the only thing
// that catches a casing regression locally.

describe('CommentsClient — wire serialization', () => {
    it('getComments sends thread_id / newer_than_ts / older_than_ts on the URL', async () => {
        let capturedUrl: URL | null = null
        server.use(
            http.get(`${BASE}/comments/get`, ({ request }) => {
                capturedUrl = new URL(request.url)
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

        if (capturedUrl === null) throw new Error('expected a captured URL')
        const params = capturedUrl.searchParams
        expect(params.get('thread_id')).toBe(TEST_THREAD_ID)
        expect(params.get('newer_than_ts')).toBe(
            String(Math.floor(new Date('2026-01-01T00:00:00Z').getTime() / 1000)),
        )
        expect(params.get('older_than_ts')).toBe(
            String(Math.floor(new Date('2026-02-01T00:00:00Z').getTime() / 1000)),
        )
        expect(params.get('limit')).toBe('50')
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

    it('batch descriptors carry camelCase params (transport snake-cases on send)', () => {
        const api = new CommsApi(TEST_API_TOKEN)
        const descriptor = api.comments.getComments(
            {
                threadId: TEST_THREAD_ID,
                newerThan: new Date('2026-01-01T00:00:00Z'),
                limit: 10,
            },
            { batch: true },
        )
        if (!('params' in descriptor) || !descriptor.params) {
            throw new Error('expected batch descriptor with params')
        }
        expect(descriptor.params).toMatchObject({
            threadId: TEST_THREAD_ID,
            limit: 10,
        })
        expect(descriptor.params.newerThanTs).toBeTypeOf('number')
    })
})
