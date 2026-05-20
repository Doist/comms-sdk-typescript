import { vi } from 'vitest'
import { server } from '../testUtils/msw-setup'
import { CommsRequestError } from '../types/errors'
import { isSuccess, paramsSerializer, request } from './http-client'

const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('httpClient', () => {
    beforeAll(() => {
        server.close()
    })

    beforeEach(() => {
        mockFetch.mockClear()
    })

    describe('paramsSerializer', () => {
        it('should serialize simple params', () => {
            const params = {
                id: 1,
                name: 'test',
                active: true,
            }

            const result = paramsSerializer(params)
            expect(result).toBe('id=1&name=test&active=true')
        })

        it('should serialize arrays as comma-separated values', () => {
            const params = {
                ids: [1, 2, 3],
                tags: ['a', 'b'],
            }

            const result = paramsSerializer(params)
            expect(result).toBe('ids=1%2C2%2C3&tags=a%2Cb')
        })

        it('should skip null and undefined values', () => {
            const params = {
                id: 1,
                name: null,
                active: undefined,
                valid: 'yes',
            }

            const result = paramsSerializer(params)
            expect(result).toBe('id=1&valid=yes')
        })
    })

    describe('request', () => {
        it('should make successful GET request', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                text: () => Promise.resolve(JSON.stringify({ id: 1, user_name: 'test' })),
                headers: new Headers({ 'content-type': 'application/json' }),
                clone: function () {
                    return this
                },
            }
            mockFetch.mockResolvedValueOnce(mockResponse as Response)

            const result = await request({
                httpMethod: 'GET',
                baseUri: 'https://api.test.com',
                relativePath: '/users',
                apiToken: 'token',
            })

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/users',
                expect.objectContaining({
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer token',
                    },
                    timeout: 30000,
                }),
            )
            expect(result.data).toEqual({ id: 1, userName: 'test' })
            expect(result.status).toBe(200)
        })

        it('should make successful POST request with payload', async () => {
            const mockResponse = {
                ok: true,
                status: 201,
                text: () => Promise.resolve(JSON.stringify({ id: 1, created_at: '2023-01-01' })),
                headers: new Headers(),
                clone: function () {
                    return this
                },
            }
            mockFetch.mockResolvedValueOnce(mockResponse as Response)

            const payload = { userName: 'test', isActive: true }
            await request({
                httpMethod: 'POST',
                baseUri: 'https://api.test.com',
                relativePath: '/users',
                apiToken: 'token',
                payload,
            })

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/users',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer token',
                    },
                    body: JSON.stringify({ user_name: 'test', is_active: true }),
                    timeout: 30000,
                }),
            )
        })

        it('should handle GET request with query parameters', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                text: () => Promise.resolve(JSON.stringify([])),
                headers: new Headers(),
                clone: function () {
                    return this
                },
            }
            mockFetch.mockResolvedValueOnce(mockResponse as Response)

            const params = { workspaceId: 1, isActive: true }
            await request({
                httpMethod: 'GET',
                baseUri: 'https://api.test.com',
                relativePath: '/users',
                apiToken: 'token',
                payload: params,
            })

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.test.com/users?workspace_id=1&is_active=true',
                expect.objectContaining({
                    method: 'GET',
                }),
            )
        })

        it('should throw CommsRequestError on HTTP error', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                text: () => Promise.resolve(JSON.stringify({ error: 'Not found' })),
                headers: new Headers(),
                clone: function () {
                    return this
                },
            }
            mockFetch.mockResolvedValueOnce(mockResponse as Response)

            await expect(
                request({
                    httpMethod: 'GET',
                    baseUri: 'https://api.test.com',
                    relativePath: '/users',
                    apiToken: 'token',
                }),
            ).rejects.toThrow(CommsRequestError)
        })

        it('should retry on network errors', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                text: () => Promise.resolve(JSON.stringify({ id: 1 })),
                headers: new Headers(),
                clone: function () {
                    return this
                },
            }
            mockFetch
                .mockRejectedValueOnce(new TypeError('Network error'))
                .mockRejectedValueOnce(new TypeError('Network error'))
                .mockResolvedValueOnce(mockResponse as Response)

            const result = await request({
                httpMethod: 'GET',
                baseUri: 'https://api.test.com',
                relativePath: '/users',
                apiToken: 'token',
            })

            expect(mockFetch).toHaveBeenCalledTimes(3)
            expect(result.status).toBe(200)
        })
    })

    describe('isSuccess', () => {
        it('should return true for 2xx status codes', () => {
            expect(isSuccess({ status: 200, data: {}, headers: {} })).toBe(true)
            expect(isSuccess({ status: 201, data: {}, headers: {} })).toBe(true)
            expect(isSuccess({ status: 299, data: {}, headers: {} })).toBe(true)
        })

        it('should return false for non-2xx status codes', () => {
            expect(isSuccess({ status: 199, data: {}, headers: {} })).toBe(false)
            expect(isSuccess({ status: 300, data: {}, headers: {} })).toBe(false)
            expect(isSuccess({ status: 404, data: {}, headers: {} })).toBe(false)
            expect(isSuccess({ status: 500, data: {}, headers: {} })).toBe(false)
        })
    })
})
