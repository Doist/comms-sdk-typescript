import { http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommsApi } from './comms-api'
import { createSuccessResponse } from './testUtils/msw-handlers'
import { server } from './testUtils/msw-setup'
import { mockUser, TEST_API_BASE_URL, TEST_API_TOKEN } from './testUtils/test-defaults'
import type { CustomFetch, CustomFetchResponse } from './types/http'

describe('Custom Fetch Core Functionality', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Constructor Options', () => {
        it('should accept customFetch in options', () => {
            const mockCustomFetch: CustomFetch = vi.fn()
            const api = new CommsApi(TEST_API_TOKEN, {
                customFetch: mockCustomFetch,
            })
            expect(api).toBeInstanceOf(CommsApi)
        })

        it('should accept baseUrl in options', () => {
            const api = new CommsApi(TEST_API_TOKEN, {
                baseUrl: 'https://custom.api.com',
            })
            expect(api).toBeInstanceOf(CommsApi)
        })

        it('should accept both baseUrl and customFetch in options', () => {
            const mockCustomFetch: CustomFetch = vi.fn()
            const api = new CommsApi(TEST_API_TOKEN, {
                baseUrl: 'https://custom.api.com',
                customFetch: mockCustomFetch,
            })
            expect(api).toBeInstanceOf(CommsApi)
        })
    })

    describe('Custom Fetch Usage', () => {
        it('should call custom fetch when provided', async () => {
            const mockCustomFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/json' },
                text: () => Promise.resolve(JSON.stringify(mockUser)),
                json: () => Promise.resolve(mockUser),
            } as CustomFetchResponse)

            const api = new CommsApi(TEST_API_TOKEN, {
                customFetch: mockCustomFetch,
            })

            await api.users.getSessionUser()

            expect(mockCustomFetch).toHaveBeenCalledWith(
                `${TEST_API_BASE_URL}/users/get_session_user`,
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        Authorization: `Bearer ${TEST_API_TOKEN}`,
                    }),
                }),
            )
        })

        it('should use native fetch when no custom fetch provided', async () => {
            server.use(
                http.get(`${TEST_API_BASE_URL}/users/get_session_user`, () => {
                    return createSuccessResponse(mockUser)
                }),
            )

            const api = new CommsApi(TEST_API_TOKEN)
            const user = await api.users.getSessionUser()

            expect(user).toEqual(mockUser)
        })

        it('should pass customFetch to all client methods', async () => {
            const mockCustomFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/json' },
                text: () => Promise.resolve(JSON.stringify([])),
                json: () => Promise.resolve([]),
            } as CustomFetchResponse)

            const api = new CommsApi(TEST_API_TOKEN, {
                customFetch: mockCustomFetch,
            })

            await api.channels.getChannels({ workspaceId: 1 })

            expect(mockCustomFetch).toHaveBeenCalledWith(
                expect.stringContaining('channels/get'),
                expect.objectContaining({
                    method: 'GET',
                }),
            )
        })

        it('routes requests through a custom baseUrl with the configured version', async () => {
            const mockCustomFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/json' },
                text: () => Promise.resolve(JSON.stringify(mockUser)),
                json: () => Promise.resolve(mockUser),
            } as CustomFetchResponse)

            const api = new CommsApi(TEST_API_TOKEN, {
                baseUrl: 'https://proxy.example.com/comms',
                customFetch: mockCustomFetch,
            })

            await api.users.getSessionUser()

            const calledUrl = mockCustomFetch.mock.calls[0]?.[0]
            expect(calledUrl).toBe('https://proxy.example.com/comms/api/v1/users/get_session_user')
        })
    })

    describe('Authentication with Custom Fetch', () => {
        it('should use customFetch in authentication functions', async () => {
            const { getAuthToken } = await import('./authentication')

            const mockTokenResponse = {
                accessToken: 'test-access-token',
                tokenType: 'Bearer',
            }

            const mockCustomFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/json' },
                text: () => Promise.resolve(JSON.stringify(mockTokenResponse)),
                json: () => Promise.resolve(mockTokenResponse),
            } as CustomFetchResponse)

            const result = await getAuthToken(
                {
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret',
                    code: 'test-code',
                },
                {
                    customFetch: mockCustomFetch,
                },
            )

            expect(mockCustomFetch).toHaveBeenCalledWith(
                expect.stringContaining('/oauth/token'),
                expect.objectContaining({
                    method: 'POST',
                }),
            )

            expect(result).toEqual(mockTokenResponse)
        })
    })
})
