import { v4 as uuid } from 'uuid'
import { isSuccess, request } from './transport/http-client'
import { CommsRequestError } from './types/errors'
import type { CustomFetch } from './types/http'

export type AuthOptions = {
    /** Optional custom base URL for OAuth endpoints */
    baseUrl?: string
    /** Optional custom fetch implementation for cross-platform compatibility */
    customFetch?: CustomFetch
}

/**
 * OAuth scopes for the Comms API.
 *
 * @remarks
 * Request only the scopes your application needs:
 *
 * **User Scopes:**
 * - `user:read` - Access user's personal settings
 * - `user:write` - Access and update user's personal settings
 *
 * **Workspace Scopes:**
 * - `workspaces:read` - Access teams the user is part of
 * - `workspaces:write` - Access and update teams the user is part of
 *
 * **Channel Scopes:**
 * - `channels:read` - Access channels
 * - `channels:write` - Access and update channels
 * - `channels:remove` - Access, update, and delete channels
 *
 * **Thread Scopes:**
 * - `threads:read` - Access threads
 * - `threads:write` - Access and update threads
 * - `threads:remove` - Access, update, and delete threads
 *
 * **Comment Scopes:**
 * - `comments:read` - Access comments
 * - `comments:write` - Access and update comments
 * - `comments:remove` - Access, update, and delete comments
 *
 * **Group Scopes:**
 * - `groups:read` - Access groups
 * - `groups:write` - Access and update groups
 * - `groups:remove` - Access, update, and delete groups
 *
 * **Message Scopes:**
 * - `messages:read` - Access messages
 * - `messages:write` - Access and update messages
 * - `messages:remove` - Access, update, and delete messages
 *
 * **Reaction Scopes:**
 * - `reactions:read` - Access reactions
 * - `reactions:write` - Access and update reactions
 * - `reactions:remove` - Access, update, and delete reactions
 *
 * **Search Scopes:**
 * - `search:read` - Search
 *
 * **Attachment Scopes:**
 * - `attachments:read` - Access attachments
 * - `attachments:write` - Access and update attachments
 *
 * **Notification Scopes:**
 * - `notifications:read` - Read user's notifications settings
 * - `notifications:write` - Read and update user's notifications settings
 */
export const COMMS_SCOPES = [
    'user:read',
    'user:write',
    'workspaces:read',
    'workspaces:write',
    'channels:read',
    'channels:write',
    'channels:remove',
    'threads:read',
    'threads:write',
    'threads:remove',
    'comments:read',
    'comments:write',
    'comments:remove',
    'groups:read',
    'groups:write',
    'groups:remove',
    'messages:read',
    'messages:write',
    'messages:remove',
    'reactions:read',
    'reactions:write',
    'reactions:remove',
    'search:read',
    'attachments:read',
    'attachments:write',
    'notifications:read',
    'notifications:write',
] as const
/**
 * Scopes determine what access a token has to the Comms API.
 */
export type CommsScope = (typeof COMMS_SCOPES)[number]

export type AuthTokenRequestArgs = {
    clientId: string
    clientSecret: string
    code: string
    redirectUri?: string
}

export type AuthTokenResponse = {
    accessToken: string
    tokenType: string
    refreshToken?: string
    expiresIn?: number
    scope?: string
}

export type RevokeAuthTokenRequestArgs = {
    clientId: string
    clientSecret: string
    accessToken: string
}

/** Supported token endpoint authentication methods for dynamic client registration. */
export const TOKEN_ENDPOINT_AUTH_METHODS = [
    'client_secret_post',
    'client_secret_basic',
    'none',
] as const
/**
 * Authentication method used at the token endpoint.
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7591#section-2 RFC 7591 Section 2}
 */
export type TokenEndpointAuthMethod = (typeof TOKEN_ENDPOINT_AUTH_METHODS)[number]

/**
 * Parameters for registering a new OAuth client via Dynamic Client Registration.
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7591 RFC 7591}
 */
export type ClientRegistrationRequest = {
    redirectUris: string[]
    clientName?: string
    clientUri?: string
    logoUri?: string
    scope?: readonly CommsScope[]
    grantTypes?: string[]
    responseTypes?: string[]
    tokenEndpointAuthMethod?: TokenEndpointAuthMethod
}

type RawClientRegistrationResponse = {
    clientId: string
    clientSecret?: string
    clientName: string
    redirectUris: string[]
    scope?: string
    grantTypes: string[]
    responseTypes: string[]
    tokenEndpointAuthMethod: string
    clientIdIssuedAt?: number
    clientSecretExpiresAt?: number
    clientUri?: string
    logoUri?: string
}

/**
 * Response from a successful dynamic client registration.
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7591#section-3.2.1 RFC 7591 Section 3.2.1}
 */
export type ClientRegistrationResponse = Omit<
    RawClientRegistrationResponse,
    'clientIdIssuedAt' | 'clientSecretExpiresAt' | 'scope'
> & {
    scope?: CommsScope[]
    clientIdIssuedAt?: Date
    /** `null` indicates the client secret never expires. Absent when no secret is issued. */
    clientSecretExpiresAt?: Date | null
}

export function getAuthStateParameter(): string {
    return uuid()
}

/**
 * Generates the authorization URL for the OAuth2 flow.
 *
 * The `clientId` can be either a traditional client ID string (e.g. from
 * {@link registerClient}) or an HTTPS URL pointing to a client metadata document,
 * as defined in {@link https://drafts.ietf.org/doc/draft-ietf-oauth-client-id-metadata-document/ RFC draft-ietf-oauth-client-id-metadata-document}.
 */
export function getAuthorizationUrl(
    clientId: string,
    scopes: CommsScope[],
    state: string,
    redirectUri?: string,
    baseUrl?: string,
): string {
    if (!scopes?.length) {
        throw new Error('At least one scope value is required.')
    }

    const authBaseUrl = baseUrl ? `${baseUrl}/oauth` : 'https://comms.todoist.com/oauth'
    const scope = scopes.join(' ')
    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        scope,
        state,
    })

    if (redirectUri) {
        params.append('redirect_uri', redirectUri)
    }

    return `${authBaseUrl}/authorize?${params.toString()}`
}

export async function getAuthToken(
    args: AuthTokenRequestArgs,
    options?: AuthOptions,
): Promise<AuthTokenResponse> {
    const tokenUrl = options?.baseUrl
        ? `${options.baseUrl}/oauth/token`
        : 'https://comms.todoist.com/oauth/token'

    const payload = {
        clientId: args.clientId,
        clientSecret: args.clientSecret,
        code: args.code,
        grantType: 'authorization_code',
        ...(args.redirectUri && { redirectUri: args.redirectUri }),
    }

    const response = await request<AuthTokenResponse>({
        httpMethod: 'POST',
        baseUri: tokenUrl,
        relativePath: '',
        payload,
        customFetch: options?.customFetch,
    })

    if (!isSuccess(response) || !response.data?.accessToken) {
        throw new CommsRequestError(
            'Authentication token exchange failed.',
            response.status,
            response.data,
        )
    }

    return response.data
}

export async function revokeAuthToken(
    args: RevokeAuthTokenRequestArgs,
    options?: AuthOptions,
): Promise<boolean> {
    const revokeUrl = options?.baseUrl
        ? `${options.baseUrl}/oauth/revoke`
        : 'https://comms.todoist.com/oauth/revoke'

    const response = await request({
        httpMethod: 'POST',
        baseUri: revokeUrl,
        relativePath: '',
        payload: {
            clientId: args.clientId,
            clientSecret: args.clientSecret,
            token: args.accessToken,
        },
        customFetch: options?.customFetch,
    })

    return isSuccess(response)
}

/**
 * Registers a new OAuth client via Dynamic Client Registration (RFC 7591).
 *
 * @example
 * ```typescript
 * const client = await registerClient({
 *   redirectUris: ['https://example.com/callback'],
 *   clientName: 'My App',
 *   scope: ['user:read', 'channels:read'],
 * })
 * // Use client.clientId and client.clientSecret for OAuth flows
 * ```
 *
 * @returns The registered client details
 * @throws {@link CommsRequestError} If the registration fails
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7591 RFC 7591}
 */
export async function registerClient(
    args: ClientRegistrationRequest,
    options?: AuthOptions,
): Promise<ClientRegistrationResponse> {
    const registerUrl = options?.baseUrl
        ? `${options.baseUrl}/oauth/register`
        : 'https://comms.todoist.com/oauth/register'

    const response = await request<RawClientRegistrationResponse>({
        httpMethod: 'POST',
        baseUri: registerUrl,
        relativePath: '',
        payload: { ...args, scope: args.scope?.join(' ') },
        customFetch: options?.customFetch,
    })

    if (!isSuccess(response) || !response.data?.clientId) {
        throw new CommsRequestError(
            'Dynamic client registration failed.',
            response.status,
            response.data,
        )
    }

    const { clientIdIssuedAt, clientSecretExpiresAt, scope, ...rest } = response.data
    return {
        ...rest,
        scope: scope ? (scope.split(' ') as CommsScope[]) : undefined,
        clientIdIssuedAt:
            clientIdIssuedAt !== undefined ? new Date(clientIdIssuedAt * 1000) : undefined,
        clientSecretExpiresAt:
            clientSecretExpiresAt === undefined
                ? undefined
                : clientSecretExpiresAt === 0
                  ? null
                  : new Date(clientSecretExpiresAt * 1000),
    }
}
