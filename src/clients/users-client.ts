import type { z } from 'zod'
import { ENDPOINT_USERS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import type { BatchRequestDescriptor } from '../types/batch'
import { type User, UserSchema } from '../types/entities'
import type { UpdateUserArgs } from '../types/requests'
import { BaseClient } from './base-client'

type ZodLikeSchema<T> = z.ZodType<T>

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
 * Client for the `/api/v3/users/` endpoints.
 *
 * As of Comms, authentication is routed through Todoist-ID. The classic
 * email-management endpoints (`add_email`, `confirm_email`, …) and the
 * Google/Apple OAuth account-linking endpoints have been removed. `register`
 * / `login` / `login_with_google` / `login_with_token` /
 * `login_with_todoist` are the only auth entry points.
 *
 * @see Comms_API_changes.md — Removed API Endpoints
 */
export class UsersClient extends BaseClient {
    /**
     * Registers a new user via the Todoist-ID bridge.
     */
    register(args: RegisterArgs, options: { batch: true }): BatchRequestDescriptor<User>
    register(args: RegisterArgs, options?: { batch?: false }): Promise<User>
    register(
        args: RegisterArgs,
        options?: { batch?: boolean },
    ): Promise<User> | BatchRequestDescriptor<User> {
        return this.unauthedPost(`${ENDPOINT_USERS}/register`, args, UserSchema, options)
    }

    /**
     * Logs in an existing user.
     */
    login(args: LoginArgs, options: { batch: true }): BatchRequestDescriptor<User>
    login(args: LoginArgs, options?: { batch?: false }): Promise<User>
    login(
        args: LoginArgs,
        options?: { batch?: boolean },
    ): Promise<User> | BatchRequestDescriptor<User> {
        return this.unauthedPost(`${ENDPOINT_USERS}/login`, args, UserSchema, options)
    }

    /**
     * Logs in using a valid token (sent via Authorization header). The SDK
     * client is already configured with the token, so no args are needed.
     */
    loginWithToken(options: { batch: true }): BatchRequestDescriptor<User>
    loginWithToken(options?: { batch?: false }): Promise<User>
    loginWithToken(options?: { batch?: boolean }): Promise<User> | BatchRequestDescriptor<User> {
        return this.authedPost(`${ENDPOINT_USERS}/login_with_token`, undefined, UserSchema, options)
    }

    /**
     * Exchanges the browser's Todoist web-session cookie for a Comms session.
     * Only useful when running in a browser context on the shared Todoist
     * registrable domain — the cookie is sent automatically by the browser.
     */
    loginWithTodoist(options: { batch: true }): BatchRequestDescriptor<User>
    loginWithTodoist(options?: { batch?: false }): Promise<User>
    loginWithTodoist(options?: { batch?: boolean }): Promise<User> | BatchRequestDescriptor<User> {
        return this.unauthedPost(`${ENDPOINT_USERS}/login_with_todoist`, {}, UserSchema, options)
    }

    /**
     * Logs in (and auto-signs-up) via a Google ID token.
     */
    loginWithGoogle(
        args: LoginWithGoogleArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<User>
    loginWithGoogle(args: LoginWithGoogleArgs, options?: { batch?: false }): Promise<User>
    loginWithGoogle(
        args: LoginWithGoogleArgs,
        options?: { batch?: boolean },
    ): Promise<User> | BatchRequestDescriptor<User> {
        return this.unauthedPost(`${ENDPOINT_USERS}/login_with_google`, args, UserSchema, options)
    }

    /**
     * Completes an MFA challenge issued by `loginWithGoogle` (returns an MFA
     * token to pass back to `loginWithGoogle.mfaToken`).
     */
    mfaChallenge(
        args: MfaChallengeArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<MfaChallengeResponse>
    mfaChallenge(args: MfaChallengeArgs, options?: { batch?: false }): Promise<MfaChallengeResponse>
    mfaChallenge(
        args: MfaChallengeArgs,
        options?: { batch?: boolean },
    ): Promise<MfaChallengeResponse> | BatchRequestDescriptor<MfaChallengeResponse> {
        const method = 'POST'
        const url = `${ENDPOINT_USERS}/mfa/challenge`
        if (options?.batch) {
            return { method, url, params: args }
        }
        return request<MfaChallengeResponse>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: undefined,
            payload: args,
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    /**
     * Logs out the current user and clears the session cookie.
     */
    logout(options: { batch: true }): BatchRequestDescriptor<void>
    logout(options?: { batch?: false }): Promise<void>
    logout(options?: { batch?: boolean }): Promise<void> | BatchRequestDescriptor<void> {
        const method = 'POST'
        const url = `${ENDPOINT_USERS}/logout`
        if (options?.batch) {
            return { method, url }
        }
        return request({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: undefined,
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Returns the user associated with the current access token.
     */
    getSessionUser(options: { batch: true }): BatchRequestDescriptor<User>
    getSessionUser(options?: { batch?: false }): Promise<User>
    getSessionUser(options?: { batch?: boolean }): Promise<User> | BatchRequestDescriptor<User> {
        return this.authedGet(`${ENDPOINT_USERS}/get_session_user`, undefined, UserSchema, options)
    }

    /**
     * Fetches a single user. Defaults to the session user when no `id` is
     * passed. Cross-workspace lookups require that the caller and the target
     * share a workspace.
     */
    getUser(
        args: { id?: number; workspaceId?: number; asList?: boolean } | undefined,
        options: { batch: true },
    ): BatchRequestDescriptor<User>
    getUser(
        args?: { id?: number; workspaceId?: number; asList?: boolean },
        options?: { batch?: false },
    ): Promise<User>
    getUser(
        args?: { id?: number; workspaceId?: number; asList?: boolean },
        options?: { batch?: boolean },
    ): Promise<User> | BatchRequestDescriptor<User> {
        return this.authedGet(`${ENDPOINT_USERS}/getone`, args ?? {}, UserSchema, options)
    }

    /**
     * Looks up a user by their email address.
     */
    getUserByEmail(email: string, options: { batch: true }): BatchRequestDescriptor<User>
    getUserByEmail(email: string, options?: { batch?: false }): Promise<User>
    getUserByEmail(
        email: string,
        options?: { batch?: boolean },
    ): Promise<User> | BatchRequestDescriptor<User> {
        return this.authedGet(`${ENDPOINT_USERS}/get_by_email`, { email }, UserSchema, options)
    }

    /**
     * Updates the logged-in user's profile. Most fields are proxied to
     * Todoist (full name, password, language, timezone, etc.).
     */
    update(args: UpdateUserArgs, options: { batch: true }): BatchRequestDescriptor<User>
    update(args: UpdateUserArgs, options?: { batch?: false }): Promise<User>
    update(
        args: UpdateUserArgs,
        options?: { batch?: boolean },
    ): Promise<User> | BatchRequestDescriptor<User> {
        return this.authedPost(`${ENDPOINT_USERS}/update`, args, UserSchema, options)
    }

    /**
     * Updates the user's password. Requires `currentPassword` (matches the
     * Todoist contract; see PR #181 in `Comms_API_changes.md`).
     */
    updatePassword(
        args: { newPassword: string; currentPassword?: string },
        options: { batch: true },
    ): BatchRequestDescriptor<User>
    updatePassword(
        args: { newPassword: string; currentPassword?: string },
        options?: { batch?: false },
    ): Promise<User>
    updatePassword(
        args: { newPassword: string; currentPassword?: string },
        options?: { batch?: boolean },
    ): Promise<User> | BatchRequestDescriptor<User> {
        return this.authedPost(`${ENDPOINT_USERS}/update_password`, args, UserSchema, options)
    }

    /**
     * Removes the user's avatar.
     */
    removeAvatar(options: { batch: true }): BatchRequestDescriptor<User>
    removeAvatar(options?: { batch?: false }): Promise<User>
    removeAvatar(options?: { batch?: boolean }): Promise<User> | BatchRequestDescriptor<User> {
        return this.authedPost(`${ENDPOINT_USERS}/remove_avatar`, undefined, UserSchema, options)
    }

    /**
     * Invalidates the current API token and returns the user with a fresh
     * token.
     */
    invalidateToken(options: { batch: true }): BatchRequestDescriptor<User>
    invalidateToken(options?: { batch?: false }): Promise<User>
    invalidateToken(options?: { batch?: boolean }): Promise<User> | BatchRequestDescriptor<User> {
        return this.authedPost(`${ENDPOINT_USERS}/invalidate_token`, undefined, UserSchema, options)
    }

    /**
     * Validates that an arbitrary token is still active. Note this is sent
     * as a GET — the token is read from the query string, not the
     * Authorization header.
     */
    validateToken(token: string, options: { batch: true }): BatchRequestDescriptor<void>
    validateToken(token: string, options?: { batch?: false }): Promise<void>
    validateToken(
        token: string,
        options?: { batch?: boolean },
    ): Promise<void> | BatchRequestDescriptor<void> {
        const method = 'GET'
        const url = `${ENDPOINT_USERS}/validate_token`
        const params = { token }
        if (options?.batch) {
            return { method, url, params }
        }
        return request({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: undefined,
            payload: params,
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Marks the user as active on a workspace (presence beacon).
     */
    heartbeat(
        args: { workspaceId: number; platform: string },
        options: { batch: true },
    ): BatchRequestDescriptor<void>
    heartbeat(
        args: { workspaceId: number; platform: string },
        options?: { batch?: false },
    ): Promise<void>
    heartbeat(
        args: { workspaceId: number; platform: string },
        options?: { batch?: boolean },
    ): Promise<void> | BatchRequestDescriptor<void> {
        const method = 'GET'
        const url = `${ENDPOINT_USERS}/heartbeat`
        if (options?.batch) {
            return { method, url, params: args }
        }
        return request({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: args,
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Resets the user's presence for a workspace.
     */
    resetPresence(workspaceId: number, options: { batch: true }): BatchRequestDescriptor<void>
    resetPresence(workspaceId: number, options?: { batch?: false }): Promise<void>
    resetPresence(
        workspaceId: number,
        options?: { batch?: boolean },
    ): Promise<void> | BatchRequestDescriptor<void> {
        const method = 'POST'
        const url = `${ENDPOINT_USERS}/reset_presence`
        const params = { workspaceId }
        if (options?.batch) {
            return { method, url, params }
        }
        return request({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Checks whether an email address is registered (and verified).
     */
    checkEmail(email: string, options: { batch: true }): BatchRequestDescriptor<EmailExistsResponse>
    checkEmail(email: string, options?: { batch?: false }): Promise<EmailExistsResponse>
    checkEmail(
        email: string,
        options?: { batch?: boolean },
    ): Promise<EmailExistsResponse> | BatchRequestDescriptor<EmailExistsResponse> {
        const method = 'POST'
        const url = `${ENDPOINT_USERS}/check_email`
        const params = { email }
        if (options?.batch) {
            return { method, url, params }
        }
        return request<EmailExistsResponse>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: undefined,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    /**
     * Returns the current per-channel mail unsubscribe settings for the
     * caller's primary email.
     */
    getUnsubscribeSettings(options: {
        batch: true
    }): BatchRequestDescriptor<Record<string, boolean>>
    getUnsubscribeSettings(options?: { batch?: false }): Promise<Record<string, boolean>>
    getUnsubscribeSettings(options?: {
        batch?: boolean
    }): Promise<Record<string, boolean>> | BatchRequestDescriptor<Record<string, boolean>> {
        const method = 'GET'
        const url = `${ENDPOINT_USERS}/get_unsubscribe_settings`
        if (options?.batch) {
            return { method, url }
        }
        return request<Record<string, boolean>>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: undefined,
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    /**
     * Toggles per-email-type opt-out settings.
     */
    updateUnsubscribeSettings(
        settings: Record<string, boolean>,
        options: { batch: true },
    ): BatchRequestDescriptor<{ status: string }>
    updateUnsubscribeSettings(
        settings: Record<string, boolean>,
        options?: { batch?: false },
    ): Promise<{ status: string }>
    updateUnsubscribeSettings(
        settings: Record<string, boolean>,
        options?: { batch?: boolean },
    ): Promise<{ status: string }> | BatchRequestDescriptor<{ status: string }> {
        const method = 'POST'
        const url = `${ENDPOINT_USERS}/update_unsubscribe_settings`
        if (options?.batch) {
            return { method, url, params: settings }
        }
        return request<{ status: string }>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: settings,
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    // --- internal helpers -------------------------------------------------

    private authedGet<T>(
        url: string,
        params: Record<string, unknown> | undefined,
        schema: ZodLikeSchema<T>,
        options?: { batch?: boolean },
    ): Promise<T> | BatchRequestDescriptor<T> {
        const method = 'GET'
        if (options?.batch) {
            return { method, url, ...(params ? { params } : {}), schema }
        }
        return request<T>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }

    private authedPost<T>(
        url: string,
        params: Record<string, unknown> | undefined,
        schema: ZodLikeSchema<T>,
        options?: { batch?: boolean },
    ): Promise<T> | BatchRequestDescriptor<T> {
        const method = 'POST'
        if (options?.batch) {
            return { method, url, ...(params ? { params } : {}), schema }
        }
        return request<T>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }

    private unauthedPost<T>(
        url: string,
        params: Record<string, unknown> | undefined,
        schema: ZodLikeSchema<T>,
        options?: { batch?: boolean },
    ): Promise<T> | BatchRequestDescriptor<T> {
        const method = 'POST'
        if (options?.batch) {
            return { method, url, ...(params ? { params } : {}), schema }
        }
        return request<T>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: undefined,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }
}
