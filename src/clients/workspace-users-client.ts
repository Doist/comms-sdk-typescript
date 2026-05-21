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
    /** Returns workspace user objects for the given workspace id. */
    getWorkspaceUsers(args: GetWorkspaceUsersArgs): Promise<WorkspaceUser[]> {
        return request<WorkspaceUser[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: 'workspace_users/get',
            apiToken: this.apiToken,
            payload: { id: args.workspaceId, archived: args.archived },
            customFetch: this.customFetch,
        }).then((response) => response.data.map((user) => WorkspaceUserSchema.parse(user)))
    }

    /** Returns workspace user IDs for the given workspace id. */
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

    /** Gets a user by id. */
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

    /** Gets a user by email. */
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

    /** Gets the user's info in the context of the workspace. */
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

    /** Gets the user's local time (e.g., "2017-05-10 07:55:40"). */
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

    /** Adds a person to a workspace. */
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

    /** Updates a person in a workspace. */
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

    /** Removes a person from a workspace. */
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

    /** Sends a new workspace invitation to the selected user. */
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
