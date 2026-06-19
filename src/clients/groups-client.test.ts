import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { CommsApi } from '../comms-api'
import { server } from '../testUtils/msw-setup'
import { TEST_API_BASE_URL as BASE, TEST_API_TOKEN } from '../testUtils/test-defaults'

// The backend only exposes the plural `add_users` / `remove_users` endpoints
// (routed via Todoist); there is no singular `add_user` / `remove_user`. The
// single-user convenience methods must therefore hit the plural endpoint with a
// one-element `user_ids` list, or they 404.

describe('GroupsClient — single-user methods reroute to plural endpoints', () => {
    it('addUser posts to groups/add_users with a one-element user_ids list', async () => {
        let path: string | undefined
        let body: Record<string, unknown> | undefined
        server.use(
            http.post(`${BASE}/groups/add_users`, async ({ request }) => {
                path = new URL(request.url).pathname
                body = (await request.json()) as Record<string, unknown>
                return HttpResponse.json({ status: 'ok' })
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.groups.addUser({ id: '7YpL3oZ4kZ9vP7Q1tR2sX45', workspaceId: 123, userId: 101 })

        expect(path).toMatch(/\/groups\/add_users$/)
        expect(body?.id).toBe('7YpL3oZ4kZ9vP7Q1tR2sX45')
        expect(body?.workspace_id).toBe(123)
        expect(body?.user_ids).toEqual([101])
        expect(body).not.toHaveProperty('user_id')
    })

    it('removeUser posts to groups/remove_users with a one-element user_ids list', async () => {
        let path: string | undefined
        let body: Record<string, unknown> | undefined
        server.use(
            http.post(`${BASE}/groups/remove_users`, async ({ request }) => {
                path = new URL(request.url).pathname
                body = (await request.json()) as Record<string, unknown>
                return HttpResponse.json({ status: 'ok' })
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        await api.groups.removeUser({
            id: '7YpL3oZ4kZ9vP7Q1tR2sX45',
            workspaceId: 123,
            userId: 101,
        })

        expect(path).toMatch(/\/groups\/remove_users$/)
        expect(body?.id).toBe('7YpL3oZ4kZ9vP7Q1tR2sX45')
        expect(body?.workspace_id).toBe(123)
        expect(body?.user_ids).toEqual([101])
        expect(body).not.toHaveProperty('user_id')
    })
})
