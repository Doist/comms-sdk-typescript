import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { getCommsBaseUri } from '../consts/endpoints'
import { server } from '../testUtils/msw-setup'
import { TEST_API_BASE_URL, TEST_API_TOKEN, TEST_THREAD_ID } from '../testUtils/test-defaults'
import { CommentSchema, createCommentSchema } from '../types/entities'
import { EVERYONE, EVERYONE_IN_THREAD } from '../types/enums'
import { UuidV7Error } from '../utils/uuidv7'
import { addCommentRequest } from './add-comment-helper'

const ctx = { baseUri: getCommsBaseUri(), apiToken: TEST_API_TOKEN, schema: CommentSchema }
const COMMENT_ADD = `${TEST_API_BASE_URL}/comments/add`

const COMMENT_RESPONSE = {
    id: 'AAAAAAAAAAAAAAAAAAAAAA',
    thread_id: TEST_THREAD_ID,
    channel_id: 'BBBBBBBBBBBBBBBBBBBBBB',
    creator: 1,
    content: 'hello',
    posted_ts: Math.floor(Date.now() / 1000),
    workspace_id: 1,
    system_message: null,
}

describe('addCommentRequest — base-bound schema', () => {
    it('roots the returned comment url at the schema base (close/reopen path)', async () => {
        const customBase = 'https://comms.example.com'
        server.use(http.post(COMMENT_ADD, () => HttpResponse.json(COMMENT_RESPONSE)))

        const comment = await addCommentRequest(
            { ...ctx, schema: createCommentSchema(customBase) },
            { threadId: TEST_THREAD_ID, content: 'hello' },
        )

        expect(comment.url).toBe(
            `${customBase}/1/ch/BBBBBBBBBBBBBBBBBBBBBB/t/${TEST_THREAD_ID}/c/AAAAAAAAAAAAAAAAAAAAAA`,
        )
    })
})

describe('addCommentRequest — thread id validation', () => {
    it('throws before posting when threadId is not base58 UUIDv7', () => {
        let requestWasSent = false
        server.use(
            http.post(COMMENT_ADD, () => {
                requestWasSent = true
                return HttpResponse.json(COMMENT_RESPONSE)
            }),
        )

        expect(() =>
            addCommentRequest(ctx, {
                threadId: '019f47ab-523b-7370-b509-fec2446dc999',
                content: 'hello',
            }),
        ).toThrow(UuidV7Error)
        expect(requestWasSent).toBe(false)
    })
})

describe('addCommentRequest — reserved broadcast marker validation', () => {
    it('throws when a marker is passed in `groups`', () => {
        expect(() =>
            addCommentRequest(ctx, {
                threadId: TEST_THREAD_ID,
                content: 'hello',
                groups: [EVERYONE],
            }),
        ).toThrow(/`groups` contains EVERYONE/)
    })

    it('throws when a marker is passed in `directGroupMentions`', () => {
        expect(() =>
            addCommentRequest(ctx, {
                threadId: TEST_THREAD_ID,
                content: 'hello',
                directGroupMentions: [EVERYONE_IN_THREAD],
            }),
        ).toThrow(/`directGroupMentions` contains EVERYONE_IN_THREAD/)
    })

    it('reports both fields in one error when markers appear in both', () => {
        let caught: Error | null = null
        try {
            addCommentRequest(ctx, {
                threadId: TEST_THREAD_ID,
                content: 'hello',
                groups: [EVERYONE],
                directGroupMentions: [EVERYONE_IN_THREAD],
            })
        } catch (e) {
            caught = e as Error
        }
        expect(caught).not.toBeNull()
        expect(caught?.message).toMatch(/`groups` contains EVERYONE/)
        expect(caught?.message).toMatch(/`directGroupMentions` contains EVERYONE_IN_THREAD/)
        expect(caught?.message).toMatch(/notifyAudience/)
    })

    it('translates notifyAudience: channel into the EVERYONE marker', async () => {
        let capturedBody: Record<string, unknown> | null = null
        server.use(
            http.post(COMMENT_ADD, async ({ request }) => {
                capturedBody = (await request.json()) as Record<string, unknown>
                return HttpResponse.json(COMMENT_RESPONSE)
            }),
        )

        await addCommentRequest(ctx, {
            threadId: TEST_THREAD_ID,
            content: 'hello',
            notifyAudience: 'channel',
        })

        const body = capturedBody as Record<string, unknown> | null
        expect(body?.groups).toEqual([EVERYONE])
        expect(body).not.toHaveProperty('notify_audience')
        expect(body).not.toHaveProperty('notifyAudience')
    })

    it('translates notifyAudience: thread into the EVERYONE_IN_THREAD marker', async () => {
        let capturedBody: Record<string, unknown> | null = null
        server.use(
            http.post(COMMENT_ADD, async ({ request }) => {
                capturedBody = (await request.json()) as Record<string, unknown>
                return HttpResponse.json(COMMENT_RESPONSE)
            }),
        )

        await addCommentRequest(ctx, {
            threadId: TEST_THREAD_ID,
            content: 'hello',
            notifyAudience: 'thread',
        })

        const body = capturedBody as Record<string, unknown> | null
        expect(body?.groups).toEqual([EVERYONE_IN_THREAD])
        expect(body).not.toHaveProperty('notify_audience')
        expect(body).not.toHaveProperty('notifyAudience')
    })
})
