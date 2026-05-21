import type { z } from 'zod'
import { ENDPOINT_USERS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import { type User, UserSchema } from '../types/entities'
import type { UpdateUserArgs } from '../types/requests'
import { BaseClient } from './base-client'

type EmailExistsResponse = { exists: boolean; verified: boolean }

type MfaChallengeResponse = { mfaToken: string }

type LoginWithGoogleArgs = {
    idToken: string
    nonce: string
    timezone?: string
    lang?: string
    mfaToken?: string
}

type RegisterArgs = {
    name: string
    email: string
    password: string
    lang?: string
    acceptTerms?: boolean
}

type LoginArgs = {
    email: string
    password: string
    setSessionCookie?: boolean
}

type MfaChallengeArgs = {
    challengeId: string
    factor: string
    methodType: string
}

/**
 * Client for the `/api/v1/users/` endpoints. Authentication flows through
 * Todoist-ID; `register` / `login` / `loginWithGoogle` / `loginWithToken` /
 * `loginWithTodoist` are the available entry points.
 */
export class UsersClient extends BaseClient {
    /**
     * Registers a new user via the Todoist-ID bridge.
     *
     * @param args - Registration arguments.
     * @param args.name - The new user's full name.
     * @param args.email - The new user's email.
     * @param args.password - The new user's password.
     * @param args.lang - Optional preferred language.
     * @param args.acceptTerms - Optional flag confirming the user accepts the terms of service.
     * @returns The newly registered user object.
     */
    register(args: RegisterArgs): Promise<User> {
        return this.post(`${ENDPOINT_USERS}/register`, args, UserSchema, { authed: false })
    }

    /**
     * Logs in an existing user.
     *
     * @param args - Login credentials.
     * @param args.email - The user's email.
     * @param args.password - The user's password.
     * @param args.setSessionCookie - Optional flag to set a session cookie (default: true).
     * @returns The authenticated user object.
     *
     * @example
     * ```typescript
     * const user = await api.users.login({
     *   email: 'user@example.com',
     *   password: 'secret',
     * })
     * ```
     */
    login(args: LoginArgs): Promise<User> {
        return this.post(`${ENDPOINT_USERS}/login`, args, UserSchema, { authed: false })
    }

    /**
     * Logs in using a valid token (sent via Authorization header). The SDK
     * client is already configured with the token, so no args are needed.
     *
     * @returns The authenticated user object.
     */
    loginWithToken(): Promise<User> {
        return this.post(`${ENDPOINT_USERS}/login_with_token`, undefined, UserSchema)
    }

    /**
     * Exchanges the browser's Todoist web-session cookie for a Comms session.
     * Only useful when running in a browser context on the shared Todoist
     * registrable domain — the cookie is sent automatically by the browser.
     *
     * @returns The authenticated user object.
     */
    loginWithTodoist(): Promise<User> {
        return this.post(`${ENDPOINT_USERS}/login_with_todoist`, {}, UserSchema, { authed: false })
    }

    /**
     * Logs in (and auto-signs-up) via a Google ID token.
     *
     * @param args - Google login arguments.
     * @param args.idToken - The Google ID token.
     * @param args.nonce - The nonce that was sent to Google.
     * @param args.timezone - Optional user timezone.
     * @param args.lang - Optional preferred language.
     * @param args.mfaToken - Optional MFA token from a prior `mfaChallenge` response.
     * @returns The authenticated user object.
     */
    loginWithGoogle(args: LoginWithGoogleArgs): Promise<User> {
        return this.post(`${ENDPOINT_USERS}/login_with_google`, args, UserSchema, { authed: false })
    }

    /**
     * Completes an MFA challenge issued by `loginWithGoogle` (returns an MFA
     * token to pass back to `loginWithGoogle.mfaToken`).
     *
     * @param args - MFA challenge arguments.
     * @param args.challengeId - The challenge ID from the prior login attempt.
     * @param args.factor - The MFA factor identifier.
     * @param args.methodType - The MFA method type.
     * @returns The MFA token to forward to `loginWithGoogle`.
     */
    mfaChallenge(args: MfaChallengeArgs): Promise<MfaChallengeResponse> {
        return request<MfaChallengeResponse>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_USERS}/mfa/challenge`,
            apiToken: undefined,
            payload: args,
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    /** Logs out the current user and clears the session cookie. */
    logout(): Promise<void> {
        return request({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_USERS}/logout`,
            apiToken: this.apiToken,
            payload: undefined,
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Gets the user associated with the current access token.
     *
     * @returns The authenticated user's information.
     *
     * @example
     * ```typescript
     * const user = await api.users.getSessionUser()
     * console.log(user.fullName, user.email)
     * ```
     */
    getSessionUser(): Promise<User> {
        return this.get(`${ENDPOINT_USERS}/get_session_user`, undefined, UserSchema)
    }

    /**
     * Fetches a single user. Defaults to the session user when no `id` is
     * passed. Cross-workspace lookups require that the caller and the target
     * share a workspace.
     *
     * @param args - Optional lookup arguments.
     * @param args.id - The user ID. Defaults to the session user.
     * @param args.workspaceId - Optional workspace ID for cross-workspace lookups.
     * @param args.asList - Optional flag controlling list-style response.
     * @returns The user object.
     */
    getUser(args?: { id?: number; workspaceId?: number; asList?: boolean }): Promise<User> {
        return this.get(`${ENDPOINT_USERS}/getone`, args ?? {}, UserSchema)
    }

    /**
     * Looks up a user by their email address.
     *
     * @param email - The email to look up.
     * @returns The user object.
     */
    getUserByEmail(email: string): Promise<User> {
        return this.get(`${ENDPOINT_USERS}/get_by_email`, { email }, UserSchema)
    }

    /**
     * Updates the logged-in user's profile. Most fields are proxied to
     * Todoist (full name, password, language, timezone, etc.).
     *
     * @param args - The user properties to update.
     * @returns The updated user object.
     *
     * @example
     * ```typescript
     * const user = await api.users.update({
     *   name: 'John Doe',
     *   timezone: 'America/New_York',
     * })
     * ```
     */
    update(args: UpdateUserArgs): Promise<User> {
        return this.post(`${ENDPOINT_USERS}/update`, args, UserSchema)
    }

    /**
     * Updates the user's password.
     *
     * @param args - Password update arguments.
     * @param args.newPassword - The new password.
     * @param args.currentPassword - The user's existing password. Optional — sent for
     *   re-authentication when the account has a password set.
     * @returns The updated user object.
     */
    updatePassword(args: { newPassword: string; currentPassword?: string }): Promise<User> {
        return this.post(`${ENDPOINT_USERS}/update_password`, args, UserSchema)
    }

    /**
     * Removes the user's avatar.
     *
     * @returns The updated user object.
     */
    removeAvatar(): Promise<User> {
        return this.post(`${ENDPOINT_USERS}/remove_avatar`, undefined, UserSchema)
    }

    /**
     * Invalidates the current API token and returns the user with a fresh
     * token.
     *
     * @returns The user object with the new token.
     *
     * @example
     * ```typescript
     * const user = await api.users.invalidateToken()
     * console.log('New token:', user.token)
     * ```
     */
    invalidateToken(): Promise<User> {
        return this.post(`${ENDPOINT_USERS}/invalidate_token`, undefined, UserSchema)
    }

    /**
     * Validates that an arbitrary token is still active. Note this is sent
     * as a GET — the token is read from the query string, not the
     * Authorization header.
     *
     * @param token - The token to validate.
     */
    validateToken(token: string): Promise<void> {
        return request({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_USERS}/validate_token`,
            apiToken: undefined,
            payload: { token },
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Marks the user as active on a workspace (presence beacon).
     *
     * @param args - Heartbeat arguments.
     * @param args.workspaceId - The workspace ID.
     * @param args.platform - The platform identifier (e.g., 'mobile', 'desktop', 'api').
     *
     * @example
     * ```typescript
     * await api.users.heartbeat({ workspaceId: 123, platform: 'api' })
     * ```
     */
    heartbeat(args: { workspaceId: number; platform: string }): Promise<void> {
        return request({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_USERS}/heartbeat`,
            apiToken: this.apiToken,
            payload: args,
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Resets the user's presence for a workspace (marks the user as inactive).
     *
     * @param workspaceId - The workspace ID.
     */
    resetPresence(workspaceId: number): Promise<void> {
        return request({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_USERS}/reset_presence`,
            apiToken: this.apiToken,
            payload: { workspaceId },
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Checks whether an email address is registered (and verified).
     *
     * @param email - The email to check.
     * @returns Object indicating whether the email exists and is verified.
     */
    checkEmail(email: string): Promise<EmailExistsResponse> {
        return request<EmailExistsResponse>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_USERS}/check_email`,
            apiToken: undefined,
            payload: { email },
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    /**
     * Returns the current per-channel mail unsubscribe settings for the
     * caller's primary email.
     *
     * @returns Object mapping email-type keys to their opt-out flag.
     */
    getUnsubscribeSettings(): Promise<Record<string, boolean>> {
        return request<Record<string, boolean>>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_USERS}/get_unsubscribe_settings`,
            apiToken: this.apiToken,
            payload: undefined,
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    /**
     * Toggles per-email-type opt-out settings.
     *
     * @param settings - Object mapping email-type keys to their opt-out flag.
     * @returns Status object with `"ok"` status.
     */
    updateUnsubscribeSettings(settings: Record<string, boolean>): Promise<{ status: string }> {
        return request<{ status: string }>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_USERS}/update_unsubscribe_settings`,
            apiToken: this.apiToken,
            payload: settings,
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    private get<T>(
        url: string,
        params: Record<string, unknown> | undefined,
        schema: z.ZodType<T>,
    ): Promise<T> {
        return request<T>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }

    private post<T>(
        url: string,
        params: Record<string, unknown> | undefined,
        schema: z.ZodType<T>,
        options: { authed?: boolean } = {},
    ): Promise<T> {
        const authed = options.authed ?? true
        return request<T>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: authed ? this.apiToken : undefined,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }
}
