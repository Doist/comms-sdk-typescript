import { request } from '../transport/http-client'
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
 * Client for `/api/v1/workspace_users/`. The backend's `add` endpoint
 * rejects non-empty `name` and `channelIds` — set neither.
 */
export class WorkspaceUsersClient extends BaseClient {
    /**
     * Returns a list of workspace user objects for the given workspace id.
     *
     * Removed users are excluded by default; set `args.includeRemoved` to `true` to include them.
     * The Comms API always returns removed users, so the filtering happens client-side.
     *
     * @param args - The arguments for getting workspace users.
     * @param args.workspaceId - The workspace ID.
     * @param args.archived - Optional flag to filter archived users.
     * @param args.includeRemoved - Include users removed from the workspace. Defaults to `false`.
     * @returns An array of workspace user objects.
     *
     * @example
     * ```typescript
     * const users = await api.workspaceUsers.getWorkspaceUsers({ workspaceId: 123 })
     * users.forEach(u => console.log(u.fullName, u.userType))
     * ```
     */
    getWorkspaceUsers(args: GetWorkspaceUsersArgs): Promise<WorkspaceUser[]> {
        const includeRemoved = args.includeRemoved ?? false
        return request<WorkspaceUser[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: 'workspace_users/get',
            apiToken: this.apiToken,
            payload: { id: args.workspaceId, archived: args.archived },
            customFetch: this.customFetch,
        }).then((response) => {
            const users = response.data.map((user) => WorkspaceUserSchema.parse(user))
            return includeRemoved ? users : users.filter((user) => !user.removed)
        })
    }

    /**
     * Returns a list of workspace user IDs for the given workspace id.
     *
     * @param workspaceId - The workspace ID.
     * @returns An array of user IDs.
     */
    getWorkspaceUserIds(workspaceId: number): Promise<number[]> {
        return request<number[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: 'workspace_users/get_ids',
            apiToken: this.apiToken,
            payload: { id: workspaceId },
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    /**
     * Gets a user by id.
     *
     * @param args - The arguments for getting a user by ID.
     * @param args.workspaceId - The workspace ID.
     * @param args.userId - The user's ID.
     * @returns The workspace user object.
     *
     * @example
     * ```typescript
     * const user = await api.workspaceUsers.getUserById({ workspaceId: 123, userId: 456 })
     * console.log(user.fullName, user.email)
     * ```
     */
    getUserById(args: GetUserByIdArgs): Promise<WorkspaceUser> {
        return request<WorkspaceUser>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: 'workspace_users/getone',
            apiToken: this.apiToken,
            payload: { id: args.workspaceId, user_id: args.userId },
            customFetch: this.customFetch,
        }).then((response) => WorkspaceUserSchema.parse(response.data))
    }

    /**
     * Gets a user by email.
     *
     * @param args - The arguments for getting a user by email.
     * @param args.workspaceId - The workspace ID.
     * @param args.email - The user's email.
     * @returns The workspace user object.
     *
     * @example
     * ```typescript
     * const user = await api.workspaceUsers.getUserByEmail({
     *   workspaceId: 123,
     *   email: 'user@example.com',
     * })
     * ```
     */
    getUserByEmail(args: GetUserByEmailArgs): Promise<WorkspaceUser> {
        return request<WorkspaceUser>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: 'workspace_users/get_by_email',
            apiToken: this.apiToken,
            payload: { id: args.workspaceId, email: args.email },
            customFetch: this.customFetch,
        }).then((response) => WorkspaceUserSchema.parse(response.data))
    }

    /**
     * Gets the user's info in the context of the workspace.
     *
     * @param args - The arguments for getting user info.
     * @param args.workspaceId - The workspace ID.
     * @param args.userId - The user's ID.
     * @returns Information about the user in the workspace context.
     */
    getUserInfo(args: GetUserInfoArgs): Promise<Record<string, unknown>> {
        return request<Record<string, unknown>>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: 'workspace_users/get_info',
            apiToken: this.apiToken,
            payload: { id: args.workspaceId, user_id: args.userId },
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    /**
     * Gets the user's local time (e.g., "2017-05-10 07:55:40").
     *
     * @param args - The arguments for getting user local time.
     * @param args.workspaceId - The workspace ID.
     * @param args.userId - The user's ID.
     * @returns The user's local time as a string.
     *
     * @example
     * ```typescript
     * const localTime = await api.workspaceUsers.getUserLocalTime({
     *   workspaceId: 123,
     *   userId: 456,
     * })
     * console.log('User local time:', localTime)
     * ```
     */
    getUserLocalTime(args: GetUserLocalTimeArgs): Promise<string> {
        return request<string>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: 'workspace_users/get_local_time',
            apiToken: this.apiToken,
            payload: { id: args.workspaceId, user_id: args.userId },
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    /**
     * Adds a person to a workspace.
     *
     * @param args - The arguments for adding a user.
     * @param args.workspaceId - The workspace ID.
     * @param args.email - The user's email.
     * @param args.userType - Optional user type (USER, GUEST, or ADMIN).
     * @returns The created workspace user object.
     */
    addUser(args: {
        workspaceId: number
        email: string
        userType?: UserType
    }): Promise<WorkspaceUser> {
        return request<WorkspaceUser>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: 'workspace_users/add',
            apiToken: this.apiToken,
            payload: {
                id: args.workspaceId,
                email: args.email,
                userType: args.userType,
            },
            customFetch: this.customFetch,
        }).then((response) => WorkspaceUserSchema.parse(response.data))
    }

    /**
     * Updates a person in a workspace.
     *
     * @param args - The arguments for updating a user.
     * @param args.workspaceId - The workspace ID.
     * @param args.userType - The user type (USER, GUEST, or ADMIN).
     * @param args.email - Optional email of the user to update.
     * @param args.userId - Optional user ID to update (use either email or userId).
     * @returns The updated workspace user object.
     */
    updateUser(args: {
        workspaceId: number
        userType: UserType
        email?: string
        userId?: number
    }): Promise<WorkspaceUser> {
        return request<WorkspaceUser>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: 'workspace_users/update',
            apiToken: this.apiToken,
            payload: {
                id: args.workspaceId,
                userType: args.userType,
                email: args.email,
                userId: args.userId,
            },
            customFetch: this.customFetch,
        }).then((response) => WorkspaceUserSchema.parse(response.data))
    }

    /**
     * Removes a person from a workspace.
     *
     * @param args - The arguments for removing a user.
     * @param args.workspaceId - The workspace ID.
     * @param args.email - Optional email of the user to remove.
     * @param args.userId - Optional user ID to remove (use either email or userId).
     */
    removeUser(args: { workspaceId: number; email?: string; userId?: number }): Promise<void> {
        return request<void>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: 'workspace_users/remove',
            apiToken: this.apiToken,
            payload: {
                id: args.workspaceId,
                email: args.email,
                userId: args.userId,
            },
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
     */
    resendInvite(args: { workspaceId: number; email: string; userId?: number }): Promise<void> {
        return request<void>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: 'workspace_users/resend_invite',
            apiToken: this.apiToken,
            payload: {
                id: args.workspaceId,
                email: args.email,
                userId: args.userId,
            },
            customFetch: this.customFetch,
        }).then(() => undefined)
    }
}
