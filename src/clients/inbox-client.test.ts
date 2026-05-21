import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { CommsApi } from '../comms-api'
import { server } from '../testUtils/msw-setup'
import { TEST_API_BASE_URL as BASE, TEST_API_TOKEN } from '../testUtils/test-defaults'

// Pins the wire shape of `inbox-client` after the deprecated `since` /
// `until` aliases were dropped — both serialization paths (URL params
// for `getInbox`, body for `archiveAll`) need explicit coverage.

describe('InboxClient — wire serialization', () => {
    it('getInbox sends workspace_id / newer_than_ts / older_than_ts on the URL', async () => {
        const capturedUrls: URL[] = []
        server.use(
            http.get(`${BASE}/inbox/get`, ({ request }) => {
                capturedUrls.push(new URL(request.url))
                return HttpResponse.json([])
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.inbox.getInbox({
            workspaceId: 1,
            newerThan: new Date('2026-01-01T00:00:00Z'),
            olderThan: new Date('2026-02-01T00:00:00Z'),
            limit: 25,
            archiveFilter: 'all',
        })

        expect(capturedUrls).toHaveLength(1)
        const params = (capturedUrls[0] as URL).searchParams
        expect(params.get('workspace_id')).toBe('1')
        expect(params.get('newer_than_ts')).toBe(
            String(Math.floor(new Date('2026-01-01T00:00:00Z').getTime() / 1000)),
        )
        expect(params.get('older_than_ts')).toBe(
            String(Math.floor(new Date('2026-02-01T00:00:00Z').getTime() / 1000)),
        )
        expect(params.get('limit')).toBe('25')
        expect(params.get('archive_filter')).toBe('all')
    })

    it('archiveAll POSTs workspace_id and older_than_ts as snake_case', async () => {
        let capturedBody: Record<string, unknown> | null = null
        server.use(
            http.post(`${BASE}/inbox/archive_all`, async ({ request }) => {
                capturedBody = (await request.json()) as Record<string, unknown>
                return HttpResponse.json({ status: 'ok' })
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.inbox.archiveAll({
            workspaceId: 1,
            olderThan: new Date('2026-02-01T00:00:00Z'),
        })

        expect(capturedBody).toEqual({
            workspace_id: 1,
            older_than_ts: Math.floor(new Date('2026-02-01T00:00:00Z').getTime() / 1000),
        })
    })
})
