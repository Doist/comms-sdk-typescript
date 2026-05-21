import { z } from 'zod'
import { ENDPOINT_GROUPS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import { type Group, GroupSchema, type StatusOk, StatusOkSchema } from '../types/entities'
import type {
    AddGroupUserArgs,
    AddGroupUsersArgs,
    RemoveGroupUserArgs,
    RemoveGroupUsersArgs,
} from '../types/requests'
import { resolveCreateId } from '../utils/uuidv7'
import { BaseClient } from './base-client'

export const GroupListSchema = z.array(GroupSchema)

/**
 * Client for `/api/v1/groups/`. The broadcast markers `EVERYONE` /
 * `EVERYONE_IN_THREAD` are NOT addressable through these endpoints — they
 * only appear as members of `direct_group_mentions` / `groups` lists on
 * thread/comment writes.
 *
 * `getone` / `update` / `remove` and the member-management ops all require
 * `workspace_id` alongside the group `id`.
 */
export class GroupsClient extends BaseClient {
    /** Lists groups in a workspace. */
    getGroups(workspaceId: number): Promise<Group[]> {
        return request<Group[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_GROUPS}/get`,
            apiToken: this.apiToken,
            payload: { workspaceId },
            customFetch: this.customFetch,
        }).then((response) => GroupListSchema.parse(response.data))
    }

    /** Fetches a single group by ID (requires `workspaceId`). */
    getGroup(args: { id: string; workspaceId: number }): Promise<Group> {
        return this.simple('GET', 'getone', { ...args }, GroupSchema)
    }

    /** Creates a new group. `id` is auto-generated if not supplied. */
    createGroup(args: {
        workspaceId: number
        name: string
        id?: string
        description?: string
        userIds?: number[]
    }): Promise<Group> {
        return this.simple('POST', 'add', { ...args, id: resolveCreateId(args.id) }, GroupSchema)
    }

    /** Updates a group. Requires `workspaceId`. */
    updateGroup(args: {
        id: string
        workspaceId: number
        name?: string
        description?: string
    }): Promise<Group> {
        return this.simple('POST', 'update', { ...args }, GroupSchema)
    }

    /** Permanently deletes a group. Requires `workspaceId`. */
    deleteGroup(args: { id: string; workspaceId: number }): Promise<StatusOk> {
        return this.simple('POST', 'remove', { ...args }, StatusOkSchema)
    }

    addUser(args: AddGroupUserArgs): Promise<StatusOk> {
        return this.simple('POST', 'add_user', { ...args }, StatusOkSchema)
    }

    addUsers(args: AddGroupUsersArgs): Promise<StatusOk> {
        return this.simple('POST', 'add_users', { ...args }, StatusOkSchema)
    }

    removeUser(args: RemoveGroupUserArgs): Promise<StatusOk> {
        return this.simple('POST', 'remove_user', { ...args }, StatusOkSchema)
    }

    removeUsers(args: RemoveGroupUsersArgs): Promise<StatusOk> {
        return this.simple('POST', 'remove_users', { ...args }, StatusOkSchema)
    }

    private simple<T>(
        httpMethod: 'GET' | 'POST',
        suffix: string,
        params: Record<string, unknown>,
        schema: z.ZodType<T>,
    ): Promise<T> {
        return request<T>({
            httpMethod,
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_GROUPS}/${suffix}`,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }
}
