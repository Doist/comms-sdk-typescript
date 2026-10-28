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
                http.post(apiUrl('api/v1.0/users/set_status'), async ({ request }) => {
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
                http.post(apiUrl('api/v1.0/users/set_status'), async ({ request }) => {
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

        it('sends a pause_activity effect as pause_activity', async () => {
            let body: unknown
            server.use(
                http.post(apiUrl('api/v1.0/users/set_status'), async ({ request }) => {
                    body = await request.json()
                    return HttpResponse.json(mockUser)
                }),
            )

            await client.setStatus({
                message: 'On holiday',
                effects: {
                    pauseNotifications: { scope: { mode: 'all' } },
                    pauseActivity: { scope: { mode: 'all' } },
                },
            })

            expect(body).toEqual({
                message: 'On holiday',
                effects: {
                    pause_notifications: { scope: { mode: 'all' } },
                    pause_activity: { scope: { mode: 'all' } },
                },
            })
        })

        it.each([
            {
                args: { emoji: null, activeUntil: null },
                expected: { emoji: null, active_until: null },
            },
            {
                args: { effects: { pauseNotifications: null, pauseActivity: {} } },
                expected: { effects: { pause_notifications: null, pause_activity: {} } },
            },
            {
                args: { effects: { pauseNotifications: {}, pauseActivity: null } },
                expected: { effects: { pause_notifications: {}, pause_activity: null } },
            },
            { args: { effects: null }, expected: { effects: null } },
            {
                args: { effects: { pauseNotifications: { scope: {} } } },
                expected: { effects: { pause_notifications: { scope: {} } } },
            },
        ])('preserves partial-update values on the wire: $args', async ({ args, expected }) => {
            let body: unknown
            server.use(
                http.post(apiUrl('api/v1.0/users/set_status'), async ({ request }) => {
                    body = await request.json()
                    return HttpResponse.json(mockUser)
                }),
            )

            await client.setStatus(args)

            expect(body).toEqual(expected)
        })

        it('sends only the message when nothing else is given', async () => {
            let body: unknown
            server.use(
                http.post(apiUrl('api/v1.0/users/set_status'), async ({ request }) => {
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
                http.post(apiUrl('api/v1.0/users/clear_status'), () =>
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
                http.get(apiUrl('api/v1.0/users/get_session_user'), () =>
                    HttpResponse.json({
                        ...mockUser,
                        status: { message: 'Away', emoji: null },
                    }),
                ),
            )

            const user = await client.getSessionUser()

            expect(user.status).toEqual({ message: 'Away', emoji: null })
        })

        it('parses a pause_activity effect next to pause_notifications', async () => {
            server.use(
                http.get(apiUrl('api/v1.0/users/get_session_user'), () =>
                    HttpResponse.json({
                        ...mockUser,
                        status: {
                            message: 'On holiday',
                            effects: {
                                pause_activity: { scope: { mode: 'all' } },
                                pause_notifications: {},
                            },
                        },
                    }),
                ),
            )

            const user = await client.getSessionUser()

            expect(user.status).toEqual({
                message: 'On holiday',
                effects: {
                    pauseActivity: { scope: { mode: 'all' } },
                    pauseNotifications: {},
                },
            })
        })

        describe.each([
            ['pause_notifications', 'pauseNotifications'],
            ['pause_activity', 'pauseActivity'],
        ])('the %s effect', (wireKey, key) => {
            it.each([
                ['without a scope', {}],
                ['with an empty scope', { scope: {} }],
                ['with scope.mode', { scope: { mode: 'all' } }],
            ])('parses %s', async (_name, effect) => {
                server.use(
                    http.get(apiUrl('api/v1.0/users/get_session_user'), () =>
                        HttpResponse.json({
                            ...mockUser,
                            status: { message: 'Away', effects: { [wireKey]: effect } },
                        }),
                    ),
                )

                const user = await client.getSessionUser()

                expect(user.status).toEqual({ message: 'Away', effects: { [key]: effect } })
            })
        })

        it('parses a status whose effects object is empty', async () => {
            server.use(
                http.get(apiUrl('api/v1.0/users/get_session_user'), () =>
                    HttpResponse.json({ ...mockUser, status: { message: 'Away', effects: {} } }),
                ),
            )

            const user = await client.getSessionUser()

            expect(user.status).toEqual({ message: 'Away', effects: {} })
        })
    })
})
