import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { CommsApi } from '../comms-api'
import { server } from '../testUtils/msw-setup'
import {
    TEST_API_BASE_URL as BASE,
    TEST_API_TOKEN,
    TEST_CHANNEL_ID,
} from '../testUtils/test-defaults'
import { EVERYONE, EVERYONE_IN_THREAD } from '../types/enums'
import { UuidV7Error } from '../utils/uuidv7'

const THREAD_RESPONSE = {
    id: '7YpL3oZ4kZ9vP7Q1tR2sX3z',
    title: 'Release notes',
    content: 'See attached',
    creator: 1,
    channel_id: TEST_CHANNEL_ID,
    workspace_id: 1,
    comment_count: 0,
    last_updated_ts: 1609459200,
    pinned: false,
    posted_ts: 1609459200,
    snippet: 'See attached',
    snippet_creator: 1,
    is_archived: false,
}

// Pins the wire shape of `threads-client`. The PR that dropped the
// `newer_than_ts` / `older_than_ts` aliases also tightened how `params`
// is built — this test catches both a casing regression and any
// accidental forwarding of unknown keys.

describe('ThreadsClient — wire serialization', () => {
    it('getThreads sends workspace_id / channel_id / newer_than_ts / older_than_ts on the URL', async () => {
        const capturedUrls: URL[] = []
        server.use(
            http.get(`${BASE}/threads/get`, ({ request }) => {
                capturedUrls.push(new URL(request.url))
                return HttpResponse.json([])
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.threads.getThreads({
            workspaceId: 1,
            channelId: TEST_CHANNEL_ID,
            archived: false,
            newerThan: new Date('2026-01-01T00:00:00Z'),
            olderThan: new Date('2026-02-01T00:00:00Z'),
            limit: 50,
        })

        expect(capturedUrls).toHaveLength(1)
        const params = (capturedUrls[0] as URL).searchParams
        expect(params.get('workspace_id')).toBe('1')
        expect(params.get('channel_id')).toBe(TEST_CHANNEL_ID)
        expect(params.get('archived')).toBe('false')
        expect(params.get('newer_than_ts')).toBe(
            String(Math.floor(new Date('2026-01-01T00:00:00Z').getTime() / 1000)),
        )
        expect(params.get('older_than_ts')).toBe(
            String(Math.floor(new Date('2026-02-01T00:00:00Z').getTime() / 1000)),
        )
        expect(params.get('limit')).toBe('50')
    })

    it('getThreads ignores legacy snake_case keys passed at runtime', async () => {
        const capturedUrls: URL[] = []
        server.use(
            http.get(`${BASE}/threads/get`, ({ request }) => {
                capturedUrls.push(new URL(request.url))
                return HttpResponse.json([])
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.threads.getThreads({
            workspaceId: 1,
            // biome-ignore lint/suspicious/noExplicitAny: legacy-shape forced through `any`
            ...({ newer_than_ts: 999, older_than_ts: 888 } as any),
        })

        const params = (capturedUrls[0] as URL).searchParams
        expect(params.get('newer_than_ts')).toBeNull()
        expect(params.get('older_than_ts')).toBeNull()
    })

    it('createThread rejects channelId that is not base58 UUIDv7 before posting', () => {
        let handlerCalled = false
        server.use(
            http.post(`${BASE}/threads/add`, () => {
                handlerCalled = true
                return HttpResponse.json(THREAD_RESPONSE)
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        expect(() =>
            api.threads.createThread({
                channelId: '019f47ab-523b-7370-b509-fec2446dc999',
                title: 'Release notes',
                content: 'See attached',
            }),
        ).toThrow(UuidV7Error)
        expect(handlerCalled).toBe(false)
    })

    it('createThread sends attachments as a snake_cased array in the POST body', async () => {
        let body: Record<string, unknown> | undefined
        server.use(
            http.post(`${BASE}/threads/add`, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>
                return HttpResponse.json(THREAD_RESPONSE)
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.threads.createThread({
            channelId: TEST_CHANNEL_ID,
            title: 'Release notes',
            content: 'See attached',
            attachments: [
                {
                    attachmentId: 'abc123',
                    urlType: 'file',
                    fileName: 'spec.pdf',
                    fileSize: 12345,
                    underlyingType: 'application/pdf',
                    uploadState: 'uploaded',
                    url: 'https://files.comms.todoist.com/abc/spec.pdf',
                },
            ],
        })

        expect(body?.channel_id).toBe(TEST_CHANNEL_ID)
        expect(body?.content).toBe('See attached')
        expect(body?.attachments).toEqual([
            {
                attachment_id: 'abc123',
                url_type: 'file',
                file_name: 'spec.pdf',
                file_size: 12345,
                underlying_type: 'application/pdf',
                upload_state: 'uploaded',
                url: 'https://files.comms.todoist.com/abc/spec.pdf',
            },
        ])
    })

    it('createThread translates notifyAudience: channel into the EVERYONE marker', async () => {
        let body: Record<string, unknown> | undefined
        server.use(
            http.post(`${BASE}/threads/add`, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>
                return HttpResponse.json(THREAD_RESPONSE)
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.threads.createThread({
            channelId: TEST_CHANNEL_ID,
            title: 'Release notes',
            content: 'Everyone should see this',
            notifyAudience: 'channel',
        })

        expect(body?.groups).toEqual([EVERYONE])
        expect(body).not.toHaveProperty('notify_audience')
        expect(body).not.toHaveProperty('notifyAudience')
    })

    it('createThread appends the EVERYONE marker alongside existing groups', async () => {
        let body: Record<string, unknown> | undefined
        server.use(
            http.post(`${BASE}/threads/add`, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>
                return HttpResponse.json(THREAD_RESPONSE)
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.threads.createThread({
            channelId: TEST_CHANNEL_ID,
            title: 'Release notes',
            content: 'Everyone plus a group',
            groups: ['7YpL3oZ4kZ9vP7Q1tR2sX99'],
            notifyAudience: 'channel',
        })

        expect(body?.groups).toEqual(['7YpL3oZ4kZ9vP7Q1tR2sX99', EVERYONE])
    })

    it('createThread translates notifyAudience: thread into the EVERYONE_IN_THREAD marker', async () => {
        let body: Record<string, unknown> | undefined
        server.use(
            http.post(`${BASE}/threads/add`, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>
                return HttpResponse.json(THREAD_RESPONSE)
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.threads.createThread({
            channelId: TEST_CHANNEL_ID,
            title: 'Release notes',
            content: 'Interacted only',
            notifyAudience: 'thread',
        })

        expect(body?.groups).toEqual([EVERYONE_IN_THREAD])
        expect(body).not.toHaveProperty('notify_audience')
        expect(body).not.toHaveProperty('notifyAudience')
    })

    it('createThread rejects a raw broadcast marker passed in groups', () => {
        const api = new CommsApi(TEST_API_TOKEN)
        expect(() =>
            api.threads.createThread({
                channelId: TEST_CHANNEL_ID,
                title: 'Release notes',
                content: 'Bad marker',
                groups: [EVERYONE],
            }),
        ).toThrow(/`groups` contains EVERYONE/)
    })

    it('markRead sends the thread id as thread_id (not id) plus obj_index', async () => {
        let body: Record<string, unknown> | undefined
        server.use(
            http.post(`${BASE}/threads/mark_read`, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>
                return HttpResponse.json({ status: 'ok' })
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.threads.markRead({ id: '7YpL3oZ4kZ9vP7Q1tR2sX3z', objIndex: 0 })

        // The threads endpoint requires `thread_id`; sending `id` is rejected
        // with a 400 ("Argument `thread_id` is required").
        expect(body?.thread_id).toBe('7YpL3oZ4kZ9vP7Q1tR2sX3z')
        expect(body).not.toHaveProperty('id')
        expect(body?.obj_index).toBe(0)
    })

    it('markUnread sends the thread id as thread_id (not id) plus obj_index', async () => {
        let body: Record<string, unknown> | undefined
        server.use(
            http.post(`${BASE}/threads/mark_unread`, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>
                return HttpResponse.json({ status: 'ok' })
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.threads.markUnread({ id: '7YpL3oZ4kZ9vP7Q1tR2sX3z', objIndex: -1 })

        expect(body?.thread_id).toBe('7YpL3oZ4kZ9vP7Q1tR2sX3z')
        expect(body).not.toHaveProperty('id')
        expect(body?.obj_index).toBe(-1)
    })
})
