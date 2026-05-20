import { z } from 'zod'
import { ENDPOINT_GROUPS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import type { BatchRequestDescriptor } from '../types/batch'
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
 * Client for `/api/v3/groups/`. The broadcast markers `EVERYONE` /
 * `EVERYONE_IN_THREAD` are NOT addressable through these endpoints — they
 * only appear as members of `direct_group_mentions` / `groups` lists on
 * thread/comment writes.
 *
 * `getone` / `update` / `remove` and the member-management ops all require
 * `workspace_id` alongside the group `id`.
 */
export class GroupsClient extends BaseClient {
    /** Lists groups in a workspace. */
    getGroups(workspaceId: number, options: { batch: true }): BatchRequestDescriptor<Group[]>
    getGroups(workspaceId: number, options?: { batch?: false }): Promise<Group[]>
    getGroups(
        workspaceId: number,
        options?: { batch?: boolean },
    ): Promise<Group[]> | BatchRequestDescriptor<Group[]> {
        const method = 'GET'
        const url = `${ENDPOINT_GROUPS}/get`
        const params = { workspaceId }

        if (options?.batch) {
            return { method, url, params, schema: GroupListSchema }
        }

        return request<Group[]>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => GroupListSchema.parse(response.data))
    }

    /** Fetches a single group by ID (requires `workspaceId`). */
    getGroup(
        args: { id: string; workspaceId: number },
        options: { batch: true },
    ): BatchRequestDescriptor<Group>
    getGroup(args: { id: string; workspaceId: number }, options?: { batch?: false }): Promise<Group>
    getGroup(
        args: { id: string; workspaceId: number },
        options?: { batch?: boolean },
    ): Promise<Group> | BatchRequestDescriptor<Group> {
        return this.simple('GET', 'getone', { ...args }, GroupSchema, options)
    }

    /** Creates a new group. `id` is auto-generated if not supplied. */
    createGroup(
        args: {
            workspaceId: number
            name: string
            id?: string
            description?: string
            userIds?: number[]
        },
        options: { batch: true },
    ): BatchRequestDescriptor<Group>
    createGroup(
        args: {
            workspaceId: number
            name: string
            id?: string
            description?: string
            userIds?: number[]
        },
        options?: { batch?: false },
    ): Promise<Group>
    createGroup(
        args: {
            workspaceId: number
            name: string
            id?: string
            description?: string
            userIds?: number[]
        },
        options?: { batch?: boolean },
    ): Promise<Group> | BatchRequestDescriptor<Group> {
        const params = { ...args, id: resolveCreateId(args.id) }
        return this.simple('POST', 'add', params, GroupSchema, options)
    }

    /** Updates a group. Requires `workspaceId`. */
    updateGroup(
        args: { id: string; workspaceId: number; name?: string; description?: string },
        options: { batch: true },
    ): BatchRequestDescriptor<Group>
    updateGroup(
        args: { id: string; workspaceId: number; name?: string; description?: string },
        options?: { batch?: false },
    ): Promise<Group>
    updateGroup(
        args: { id: string; workspaceId: number; name?: string; description?: string },
        options?: { batch?: boolean },
    ): Promise<Group> | BatchRequestDescriptor<Group> {
        return this.simple('POST', 'update', { ...args }, GroupSchema, options)
    }

    /** Permanently deletes a group. Requires `workspaceId`. */
    deleteGroup(
        args: { id: string; workspaceId: number },
        options: { batch: true },
    ): BatchRequestDescriptor<StatusOk>
    deleteGroup(
        args: { id: string; workspaceId: number },
        options?: { batch?: false },
    ): Promise<StatusOk>
    deleteGroup(
        args: { id: string; workspaceId: number },
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'remove', { ...args }, StatusOkSchema, options)
    }

    addUser(args: AddGroupUserArgs, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    addUser(args: AddGroupUserArgs, options?: { batch?: false }): Promise<StatusOk>
    addUser(
        args: AddGroupUserArgs,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'add_user', { ...args }, StatusOkSchema, options)
    }

    addUsers(args: AddGroupUsersArgs, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    addUsers(args: AddGroupUsersArgs, options?: { batch?: false }): Promise<StatusOk>
    addUsers(
        args: AddGroupUsersArgs,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'add_users', { ...args }, StatusOkSchema, options)
    }

    removeUser(
        args: RemoveGroupUserArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<StatusOk>
    removeUser(args: RemoveGroupUserArgs, options?: { batch?: false }): Promise<StatusOk>
    removeUser(
        args: RemoveGroupUserArgs,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'remove_user', { ...args }, StatusOkSchema, options)
    }

    removeUsers(
        args: RemoveGroupUsersArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<StatusOk>
    removeUsers(args: RemoveGroupUsersArgs, options?: { batch?: false }): Promise<StatusOk>
    removeUsers(
        args: RemoveGroupUsersArgs,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'remove_users', { ...args }, StatusOkSchema, options)
    }

    private simple<T>(
        httpMethod: 'GET' | 'POST',
        suffix: string,
        params: Record<string, unknown>,
        schema: z.ZodType<T>,
        options?: { batch?: boolean },
    ): Promise<T> | BatchRequestDescriptor<T> {
        const url = `${ENDPOINT_GROUPS}/${suffix}`
        if (options?.batch) {
            return { method: httpMethod, url, params, schema }
        }
        return request<T>({
            httpMethod,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }
}
