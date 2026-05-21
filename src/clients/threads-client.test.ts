import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { CommsApi } from '../comms-api'
import { server } from '../testUtils/msw-setup'
import { TEST_API_BASE_URL as BASE, TEST_API_TOKEN } from '../testUtils/test-defaults'

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
            channelId: '7YpL3oZ4kZ9vP7Q1tR2sX44',
            archived: false,
            newerThan: new Date('2026-01-01T00:00:00Z'),
            olderThan: new Date('2026-02-01T00:00:00Z'),
            limit: 50,
        })

        expect(capturedUrls).toHaveLength(1)
        const params = (capturedUrls[0] as URL).searchParams
        expect(params.get('workspace_id')).toBe('1')
        expect(params.get('channel_id')).toBe('7YpL3oZ4kZ9vP7Q1tR2sX44')
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
})
