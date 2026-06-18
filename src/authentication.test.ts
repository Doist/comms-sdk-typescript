import { HttpResponse, http } from 'msw'
import {
    getAuthorizationUrl,
    getAuthStateParameter,
    getAuthToken,
    refreshAuthToken,
    registerClient,
    revokeAuthToken,
    CommsScope,
} from './authentication'
import { server } from './testUtils/msw-setup'
import { CommsRequestError } from './types/errors'

describe('authentication', () => {
    describe('getAuthStateParameter', () => {
        it('should generate a UUID v4 state parameter', () => {
            const state = getAuthStateParameter()

            expect(typeof state).toBe('string')
            expect(state).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
            )
        })

        it('should generate different states on multiple calls', () => {
            const state1 = getAuthStateParameter()
            const state2 = getAuthStateParameter()

            expect(state1).not.toBe(state2)
        })
    })

    describe('getAuthorizationUrl', () => {
        it('should generate correct authorization URL', () => {
            const clientId = 'test-client-id'
            const scopes: CommsScope[] = ['user:read', 'channels:write']
            const state = 'test-state'

            const url = getAuthorizationUrl(clientId, scopes, state)

            expect(url).toBe(
                'https://comms.todoist.com/oauth/authorize?client_id=test-client-id&response_type=code&scope=user%3Aread+channels%3Awrite&state=test-state',
            )
        })

        it('should include redirect URI if provided', () => {
            const clientId = 'test-client-id'
            const scopes: CommsScope[] = ['user:read']
            const state = 'test-state'
            const redirectUri = 'https://myapp.com/callback'

            const url = getAuthorizationUrl(clientId, scopes, state, redirectUri)

            expect(url).toContain('redirect_uri=https%3A%2F%2Fmyapp.com%2Fcallback')
        })

        it('should use custom base URL if provided', () => {
            const clientId = 'test-client-id'
            const scopes: CommsScope[] = ['user:read']
            const state = 'test-state'
            const baseUrl = 'https://custom.comms.todoist.com'

            const url = getAuthorizationUrl(clientId, scopes, state, undefined, baseUrl)

            expect(url).toContain('https://custom.comms.todoist.com/oauth/authorize')
        })

        it('should throw error if no scopes provided', () => {
            expect(() => {
                getAuthorizationUrl('client-id', [], 'state')
            }).toThrow('At least one scope value is required.')
        })
    })

    describe('getAuthToken', () => {
        it('should exchange auth code for access token', async () => {
            const mockResponse = {
                access_token: 'access-token-123',
                token_type: 'Bearer',
                refresh_token: 'refresh-token-456',
                expires_in: 3600,
            }

            server.use(
                http.post('https://comms.todoist.com/oauth/token', async ({ request }) => {
                    const body = await request.json()
                    expect(body).toEqual({
                        client_id: 'client-id',
                        client_secret: 'client-secret',
                        code: 'auth-code',
                        grant_type: 'authorization_code',
                    })
                    return HttpResponse.json(mockResponse)
                }),
            )

            const args = {
                clientId: 'client-id',
                clientSecret: 'client-secret',
                code: 'auth-code',
            }

            const result = await getAuthToken(args)
            expect(result.accessToken).toBe('access-token-123')
            expect(result.tokenType).toBe('Bearer')
            expect(result.refreshToken).toBe('refresh-token-456')
            expect(result.expiresIn).toBe(3600)
        })

        it('should include redirect URI in token request if provided', async () => {
            const mockResponse = {
                access_token: 'access-token-123',
                token_type: 'Bearer',
                refresh_token: 'refresh-token-456',
                expires_in: 3600,
            }

            server.use(
                http.post('https://comms.todoist.com/oauth/token', async ({ request }) => {
                    const body = await request.json()
                    expect(body).toEqual({
                        client_id: 'client-id',
                        client_secret: 'client-secret',
                        code: 'auth-code',
                        grant_type: 'authorization_code',
                        redirect_uri: 'https://myapp.com/callback',
                    })
                    return HttpResponse.json(mockResponse)
                }),
            )

            const args = {
                clientId: 'client-id',
                clientSecret: 'client-secret',
                code: 'auth-code',
                redirectUri: 'https://myapp.com/callback',
            }

            await getAuthToken(args)
        })
    })

    describe('refreshAuthToken', () => {
        it('should exchange refresh token for a new access token', async () => {
            const mockResponse = {
                access_token: 'new-access-token-123',
                token_type: 'Bearer',
                refresh_token: 'new-refresh-token-456',
                expires_in: 3600,
            }

            server.use(
                http.post('https://comms.todoist.com/oauth/token', async ({ request }) => {
                    const body = await request.json()
                    expect(body).toEqual({
                        client_id: 'client-id',
                        client_secret: 'client-secret',
                        refresh_token: 'refresh-token-456',
                        grant_type: 'refresh_token',
                    })
                    return HttpResponse.json(mockResponse)
                }),
            )

            const result = await refreshAuthToken({
                clientId: 'client-id',
                clientSecret: 'client-secret',
                refreshToken: 'refresh-token-456',
            })

            expect(result.accessToken).toBe('new-access-token-123')
            expect(result.tokenType).toBe('Bearer')
            expect(result.refreshToken).toBe('new-refresh-token-456')
            expect(result.expiresIn).toBe(3600)
        })

        it('should use custom base URL if provided', async () => {
            server.use(
                http.post('https://staging.comms.todoist.com/oauth/token', () => {
                    return HttpResponse.json({
                        access_token: 'new-access-token-123',
                        token_type: 'Bearer',
                    })
                }),
            )

            const result = await refreshAuthToken(
                {
                    clientId: 'client-id',
                    clientSecret: 'client-secret',
                    refreshToken: 'refresh-token-456',
                },
                { baseUrl: 'https://staging.comms.todoist.com' },
            )

            expect(result.accessToken).toBe('new-access-token-123')
        })

        it('should throw error on non-2xx response', async () => {
            server.use(
                http.post('https://comms.todoist.com/oauth/token', () => {
                    return HttpResponse.json({ error: 'invalid_grant' }, { status: 400 })
                }),
            )

            await expect(
                refreshAuthToken({
                    clientId: 'client-id',
                    clientSecret: 'client-secret',
                    refreshToken: 'expired-refresh-token',
                }),
            ).rejects.toThrow(CommsRequestError)
        })

        it('should throw if response has no access token', async () => {
            server.use(
                http.post('https://comms.todoist.com/oauth/token', () => {
                    return HttpResponse.json({ token_type: 'Bearer' })
                }),
            )

            await expect(
                refreshAuthToken({
                    clientId: 'client-id',
                    clientSecret: 'client-secret',
                    refreshToken: 'refresh-token-456',
                }),
            ).rejects.toThrow('Authentication token refresh failed.')
        })
    })

    describe('registerClient', () => {
        const defaultRegistrationRequest = {
            redirectUris: ['https://example.com/callback'],
            clientName: 'Test App',
            scope: ['user:read', 'channels:read'] as const,
        }

        const successfulRegistrationResponse = {
            client_id: 'twd_abc123',
            client_secret: 'secret123',
            client_name: 'Test App',
            redirect_uris: ['https://example.com/callback'],
            scope: 'user:read channels:read',
            grant_types: ['authorization_code'],
            response_types: ['code'],
            token_endpoint_auth_method: 'client_secret_post',
            client_id_issued_at: 1704067200,
            client_secret_expires_at: 0,
        }

        it('should return registered client details', async () => {
            server.use(
                http.post('https://comms.todoist.com/oauth/register', () => {
                    return HttpResponse.json(successfulRegistrationResponse)
                }),
            )

            const result = await registerClient(defaultRegistrationRequest)

            expect(result).toEqual({
                clientId: 'twd_abc123',
                clientSecret: 'secret123',
                clientName: 'Test App',
                redirectUris: ['https://example.com/callback'],
                scope: ['user:read', 'channels:read'],
                grantTypes: ['authorization_code'],
                responseTypes: ['code'],
                tokenEndpointAuthMethod: 'client_secret_post',
                clientIdIssuedAt: new Date(1704067200 * 1000),
                clientSecretExpiresAt: null,
            })
        })

        it('should throw error on non-2xx response', async () => {
            server.use(
                http.post('https://comms.todoist.com/oauth/register', () => {
                    return HttpResponse.json({ error: 'invalid_client_metadata' }, { status: 400 })
                }),
            )

            await expect(registerClient(defaultRegistrationRequest)).rejects.toThrow(
                CommsRequestError,
            )
        })

        it('should throw error if clientId not present in response', async () => {
            server.use(
                http.post('https://comms.todoist.com/oauth/register', () => {
                    return HttpResponse.json(
                        { ...successfulRegistrationResponse, client_id: undefined },
                        { status: 200 },
                    )
                }),
            )

            await expect(registerClient(defaultRegistrationRequest)).rejects.toThrow(
                'Dynamic client registration failed.',
            )
        })

        it('should use custom base URL if provided', async () => {
            server.use(
                http.post('https://staging.comms.todoist.com/oauth/register', () => {
                    return HttpResponse.json(successfulRegistrationResponse)
                }),
            )

            const result = await registerClient(defaultRegistrationRequest, {
                baseUrl: 'https://staging.comms.todoist.com',
            })

            expect(result.clientId).toBe('twd_abc123')
        })
    })

    describe('revokeAuthToken', () => {
        it('should revoke access token', async () => {
            server.use(
                http.post('https://comms.todoist.com/oauth/revoke', async ({ request }) => {
                    const body = await request.json()
                    expect(body).toEqual({
                        client_id: 'client-id',
                        client_secret: 'client-secret',
                        token: 'access-token',
                    })
                    return HttpResponse.json({})
                }),
            )

            const args = {
                clientId: 'client-id',
                clientSecret: 'client-secret',
                accessToken: 'access-token',
            }

            const result = await revokeAuthToken(args)
            expect(result).toBe(true)
        })
    })
})
