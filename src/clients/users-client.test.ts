import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { apiUrl } from '../testUtils/msw-handlers'
import { server } from '../testUtils/msw-setup'
import { mockUser, TEST_API_TOKEN } from '../testUtils/test-defaults'
import { UsersClient } from './users-client'

describe('UsersClient status', () => {
    let client: UsersClient

    beforeEach(() => {
        client = new UsersClient({ apiToken: TEST_API_TOKEN })
    })

    describe('setStatus', () => {
        it('posts the status with snake_case keys and returns the user with the status', async () => {
            let body: unknown
            server.use(
                http.post(apiUrl('api/v1/users/set_status'), async ({ request }) => {
                    body = await request.json()
                    return HttpResponse.json({
                        ...mockUser,
                        status: {
                            message: 'Deep work',
                            emoji: '🎯',
                            active_until: '2999-09-08T15:00:00Z',
                            effects: { pause_notifications: { scope: { mode: 'all' } } },
                        },
                    })
                }),
            )

            const user = await client.setStatus({
                message: 'Deep work',
                emoji: '🎯',
                activeUntil: '2999-09-08T15:00:00Z',
                effects: { pauseNotifications: { scope: { mode: 'all' } } },
            })

            expect(body).toEqual({
                message: 'Deep work',
                emoji: '🎯',
                active_until: '2999-09-08T15:00:00Z',
                effects: { pause_notifications: { scope: { mode: 'all' } } },
            })
            expect(user.status).toEqual({
                message: 'Deep work',
                emoji: '🎯',
                activeUntil: '2999-09-08T15:00:00Z',
                effects: { pauseNotifications: { scope: { mode: 'all' } } },
            })
        })

        it('sends a Date expiry as an ISO 8601 string', async () => {
            let body: Record<string, unknown> | undefined
            server.use(
                http.post(apiUrl('api/v1/users/set_status'), async ({ request }) => {
                    body = (await request.json()) as Record<string, unknown>
                    return HttpResponse.json(mockUser)
                }),
            )

            await client.setStatus({
                message: 'Back soon',
                activeUntil: new Date('2999-01-02T03:04:05.000Z'),
            })

            expect(body).toEqual({
                message: 'Back soon',
                active_until: '2999-01-02T03:04:05.000Z',
            })
        })

        it('sends only the message when nothing else is given', async () => {
            let body: unknown
            server.use(
                http.post(apiUrl('api/v1/users/set_status'), async ({ request }) => {
                    body = await request.json()
                    return HttpResponse.json(mockUser)
                }),
            )

            await client.setStatus({ message: 'Away' })

            expect(body).toEqual({ message: 'Away' })
        })
    })

    describe('clearStatus', () => {
        it('posts to clear_status and returns the user without a status', async () => {
            server.use(
                http.post(apiUrl('api/v1/users/clear_status'), () =>
                    HttpResponse.json({ ...mockUser, status: null }),
                ),
            )

            const user = await client.clearStatus()

            expect(user.status).toBeNull()
        })
    })

    describe('reading a status', () => {
        it('exposes the status on getSessionUser, with an absent emoji and effects', async () => {
            server.use(
                http.get(apiUrl('api/v1/users/get_session_user'), () =>
                    HttpResponse.json({
                        ...mockUser,
                        status: { message: 'Away', emoji: null },
                    }),
                ),
            )

            const user = await client.getSessionUser()

            expect(user.status).toEqual({ message: 'Away', emoji: null })
        })
    })
})
