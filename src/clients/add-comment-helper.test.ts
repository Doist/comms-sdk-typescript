import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../testUtils/msw-setup'
import { TEST_API_TOKEN, TEST_THREAD_ID } from '../testUtils/test-defaults'
import { EVERYONE, EVERYONE_IN_THREAD } from '../types/enums'
import { addCommentRequest } from './add-comment-helper'

const ctx = { baseUri: 'https://comms.todoist.com/api/v1/', apiToken: TEST_API_TOKEN }
const COMMENT_ADD = 'https://comms.todoist.com/api/v1/comments/add'

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

        expect((capturedBody as Record<string, unknown> | null)?.groups).toEqual([EVERYONE])
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

        expect((capturedBody as Record<string, unknown> | null)?.groups).toEqual([
            EVERYONE_IN_THREAD,
        ])
    })
})
