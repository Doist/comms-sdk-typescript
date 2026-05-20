import { request } from '../transport/http-client'
import { BatchRequestDescriptor } from '../types/batch'
import { type WorkspaceUser, WorkspaceUserSchema } from '../types/entities'
import { UserType } from '../types/enums'
import type {
    GetUserByEmailArgs,
    GetUserByIdArgs,
    GetUserInfoArgs,
    GetUserLocalTimeArgs,
    GetWorkspaceUsersArgs,
} from '../types/requests'
import { BaseClient } from './base-client'

/**
 * Client for `/api/v3/workspace_users/`. The backend's `add` endpoint
 * rejects non-empty `name` and `channelIds` — set neither.
 */
export class WorkspaceUsersClient extends BaseClient {
    /**
     * Returns a list of workspace user objects for the given workspace id.
     *
     * @param args - The arguments for getting workspace users.
     * @param args.workspaceId - The workspace ID.
     * @param args.archived - Optional flag to filter archived users.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns An array of workspace user objects.
     *
     * @example
     * ```typescript
     * const users = await api.workspaceUsers.getWorkspaceUsers({ workspaceId: 123 })
     * users.forEach(u => console.log(u.name, u.userType))
     * ```
     */
    getWorkspaceUsers(
        args: GetWorkspaceUsersArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<WorkspaceUser[]>
    getWorkspaceUsers(
        args: GetWorkspaceUsersArgs,
        options?: { batch?: false },
    ): Promise<WorkspaceUser[]>
    getWorkspaceUsers(
        args: GetWorkspaceUsersArgs,
        options?: { batch?: boolean },
    ): Promise<WorkspaceUser[]> | BatchRequestDescriptor<WorkspaceUser[]> {
        const method = 'GET'
        const url = 'workspace_users/get'
        const params = { id: args.workspaceId, archived: args.archived }

        if (options?.batch) {
            return { method, url, params }
        }

        return request<WorkspaceUser[]>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => response.data.map((user) => WorkspaceUserSchema.parse(user)))
    }

    /**
     * Returns a list of workspace user IDs for the given workspace id.
     *
     * @param workspaceId - The workspace ID.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns An array of user IDs.
     */
    getWorkspaceUserIds(
        workspaceId: number,
        options: { batch: true },
    ): BatchRequestDescriptor<number[]>
    getWorkspaceUserIds(workspaceId: number, options?: { batch?: false }): Promise<number[]>
    getWorkspaceUserIds(
        workspaceId: number,
        options?: { batch?: boolean },
    ): Promise<number[]> | BatchRequestDescriptor<number[]> {
        const method = 'GET'
        const url = 'workspace_users/get_ids'
        const params = { id: workspaceId }

        if (options?.batch) {
            return { method, url, params }
        }

        return request<number[]>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    /**
     * Gets a user by id.
     *
     * @param args - The arguments for getting a user by ID.
     * @param args.workspaceId - The workspace ID.
     * @param args.userId - The user's ID.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns The workspace user object or a batch request descriptor.
     *
     * @example
     * ```typescript
     * // Normal usage
     * const user = await api.workspaceUsers.getUserById({ workspaceId: 123, userId: 456 })
     * console.log(user.name, user.email)
     *
     * // Batch usage
     * const batch = api.createBatch()
     * batch.add((api) => api.workspaceUsers.getUserById({ workspaceId: 123, userId: 456 }))
     * const results = await batch.execute()
     * ```
     */
    getUserById(
        args: GetUserByIdArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<WorkspaceUser>
    getUserById(args: GetUserByIdArgs, options?: { batch?: false }): Promise<WorkspaceUser>
    getUserById(
        args: GetUserByIdArgs,
        options?: { batch?: boolean },
    ): Promise<WorkspaceUser> | BatchRequestDescriptor<WorkspaceUser> {
        const method = 'GET'
        const url = 'workspace_users/getone'
        const params = { id: args.workspaceId, user_id: args.userId }
        const schema = WorkspaceUserSchema

        if (options?.batch) {
            return { method, url, params, schema }
        }

        return request<WorkspaceUser>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }

    /**
     * Gets a user by email.
     *
     * @param args - The arguments for getting a user by email.
     * @param args.workspaceId - The workspace ID.
     * @param args.email - The user's email.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns The workspace user object.
     *
     * @example
     * ```typescript
     * const user = await api.workspaceUsers.getUserByEmail({ workspaceId: 123, email: 'user@example.com' })
     * ```
     */
    getUserByEmail(
        args: GetUserByEmailArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<WorkspaceUser>
    getUserByEmail(args: GetUserByEmailArgs, options?: { batch?: false }): Promise<WorkspaceUser>
    getUserByEmail(
        args: GetUserByEmailArgs,
        options?: { batch?: boolean },
    ): Promise<WorkspaceUser> | BatchRequestDescriptor<WorkspaceUser> {
        const method = 'GET'
        const url = 'workspace_users/get_by_email'
        const params = { id: args.workspaceId, email: args.email }
        const schema = WorkspaceUserSchema

        if (options?.batch) {
            return { method, url, params, schema }
        }

        return request<WorkspaceUser>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }

    /**
     * Gets the user's info in the context of the workspace.
     *
     * @param args - The arguments for getting user info.
     * @param args.workspaceId - The workspace ID.
     * @param args.userId - The user's ID.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns Information about the user in the workspace context.
     */
    getUserInfo(
        args: GetUserInfoArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Record<string, unknown>>
    getUserInfo(
        args: GetUserInfoArgs,
        options?: { batch?: false },
    ): Promise<Record<string, unknown>>
    getUserInfo(
        args: GetUserInfoArgs,
        options?: { batch?: boolean },
    ): Promise<Record<string, unknown>> | BatchRequestDescriptor<Record<string, unknown>> {
        const method = 'GET'
        const url = 'workspace_users/get_info'
        const params = { id: args.workspaceId, user_id: args.userId }

        if (options?.batch) {
            return { method, url, params }
        }

        return request<Record<string, unknown>>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    /**
     * Gets the user's local time.
     *
     * @param args - The arguments for getting user local time.
     * @param args.workspaceId - The workspace ID.
     * @param args.userId - The user's ID.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns The user's local time as a string (e.g., "2017-05-10 07:55:40").
     *
     * @example
     * ```typescript
     * const localTime = await api.workspaceUsers.getUserLocalTime({ workspaceId: 123, userId: 456 })
     * console.log('User local time:', localTime)
     * ```
     */
    getUserLocalTime(
        args: GetUserLocalTimeArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<string>
    getUserLocalTime(args: GetUserLocalTimeArgs, options?: { batch?: false }): Promise<string>
    getUserLocalTime(
        args: GetUserLocalTimeArgs,
        options?: { batch?: boolean },
    ): Promise<string> | BatchRequestDescriptor<string> {
        const method = 'GET'
        const url = 'workspace_users/get_local_time'
        const params = { id: args.workspaceId, user_id: args.userId }

        if (options?.batch) {
            return { method, url, params }
        }

        return request<string>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    /**
     * Adds a person to a workspace.
     *
     * @param args - The arguments for adding a user.
     * @param args.workspaceId - The workspace ID.
     * @param args.email - The user's email.
     * @param args.name - Optional name for the user.
     * @param args.userType - Optional user type (USER, GUEST, or ADMIN).
     * @param args.channelIds - Optional array of channel IDs to add the user to.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns The created workspace user object.
     */
    addUser(
        args: {
            workspaceId: number
            email: string
            userType?: UserType
        },
        options: { batch: true },
    ): BatchRequestDescriptor<WorkspaceUser>
    addUser(args: {
        workspaceId: number
        email: string
        userType?: UserType
    }): Promise<WorkspaceUser>
    addUser(
        args: {
            workspaceId: number
            email: string
            userType?: UserType
        },
        options?: { batch?: boolean },
    ): Promise<WorkspaceUser> | BatchRequestDescriptor<WorkspaceUser> {
        const params = {
            id: args.workspaceId,
            email: args.email,
            userType: args.userType,
        }

        const method = 'POST'
        const url = 'workspace_users/add'
        const schema = WorkspaceUserSchema

        if (options?.batch) {
            return { method, url, params, schema }
        }

        return request<WorkspaceUser>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }

    /**
     * Updates a person in a workspace.
     *
     * @param args - The arguments for updating a user.
     * @param args.workspaceId - The workspace ID.
     * @param args.userType - The user type (USER, GUEST, or ADMIN).
     * @param args.email - Optional email of the user to update.
     * @param args.userId - Optional user ID to update (use either email or userId).
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns The updated workspace user object.
     */
    updateUser(
        args: {
            workspaceId: number
            userType: UserType
            email?: string
            userId?: number
        },
        options: { batch: true },
    ): BatchRequestDescriptor<WorkspaceUser>
    updateUser(args: {
        workspaceId: number
        userType: UserType
        email?: string
        userId?: number
    }): Promise<WorkspaceUser>
    updateUser(
        args: {
            workspaceId: number
            userType: UserType
            email?: string
            userId?: number
        },
        options?: { batch?: boolean },
    ): Promise<WorkspaceUser> | BatchRequestDescriptor<WorkspaceUser> {
        const params = {
            id: args.workspaceId,
            userType: args.userType,
            email: args.email,
            userId: args.userId,
        }

        const method = 'POST'
        const url = 'workspace_users/update'
        const schema = WorkspaceUserSchema

        if (options?.batch) {
            return { method, url, params, schema }
        }

        return request<WorkspaceUser>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }

    /**
     * Removes a person from a workspace.
     *
     * @param args - The arguments for removing a user.
     * @param args.workspaceId - The workspace ID.
     * @param args.email - Optional email of the user to remove.
     * @param args.userId - Optional user ID to remove (use either email or userId).
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     */
    removeUser(
        args: {
            workspaceId: number
            email?: string
            userId?: number
        },
        options: { batch: true },
    ): BatchRequestDescriptor<void>
    removeUser(args: { workspaceId: number; email?: string; userId?: number }): Promise<void>
    removeUser(
        args: {
            workspaceId: number
            email?: string
            userId?: number
        },
        options?: { batch?: boolean },
    ): Promise<void> | BatchRequestDescriptor<void> {
        const params = {
            id: args.workspaceId,
            email: args.email,
            userId: args.userId,
        }

        const method = 'POST'
        const url = 'workspace_users/remove'

        if (options?.batch) {
            return { method, url, params }
        }

        return request<void>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Sends a new workspace invitation to the selected user.
     *
     * @param args - The arguments for resending an invite.
     * @param args.workspaceId - The workspace ID.
     * @param args.email - The user's email.
     * @param args.userId - Optional user ID.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     */
    resendInvite(
        args: {
            workspaceId: number
            email: string
            userId?: number
        },
        options: { batch: true },
    ): BatchRequestDescriptor<void>
    resendInvite(args: { workspaceId: number; email: string; userId?: number }): Promise<void>
    resendInvite(
        args: {
            workspaceId: number
            email: string
            userId?: number
        },
        options?: { batch?: boolean },
    ): Promise<void> | BatchRequestDescriptor<void> {
        const params = {
            id: args.workspaceId,
            email: args.email,
            userId: args.userId,
        }

        const method = 'POST'
        const url = 'workspace_users/resend_invite'

        if (options?.batch) {
            return { method, url, params }
        }

        return request<void>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then(() => undefined)
    }
}
