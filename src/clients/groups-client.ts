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
    /**
     * Gets all groups for a given workspace.
     *
     * @param workspaceId - The workspace ID.
     * @returns An array of group objects.
     *
     * @example
     * ```typescript
     * const groups = await api.groups.getGroups(123)
     * groups.forEach(g => console.log(g.name))
     * ```
     */
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

    /**
     * Gets a single group object by id. Requires `workspaceId`.
     *
     * @param args - The arguments for getting a group.
     * @param args.id - The group ID.
     * @param args.workspaceId - The workspace ID.
     * @returns The group object.
     */
    getGroup(args: { id: string; workspaceId: number }): Promise<Group> {
        return this.simple('GET', 'getone', { ...args }, GroupSchema)
    }

    /**
     * Creates a new group. `id` is auto-generated if not supplied.
     *
     * @param args - The arguments for creating a group.
     * @param args.workspaceId - The workspace ID.
     * @param args.name - The group name.
     * @param args.id - Optional caller-supplied group ID (for optimistic-UI workflows).
     * @param args.description - Optional group description.
     * @param args.userIds - Optional array of user IDs to add to the group.
     * @returns The created group object.
     *
     * @example
     * ```typescript
     * const group = await api.groups.createGroup({
     *   workspaceId: 123,
     *   name: 'Engineering Team',
     *   userIds: [1, 2, 3],
     * })
     * ```
     */
    createGroup(args: {
        workspaceId: number
        name: string
        id?: string
        description?: string
        userIds?: number[]
    }): Promise<Group> {
        return this.simple('POST', 'add', { ...args, id: resolveCreateId(args.id) }, GroupSchema)
    }

    /**
     * Updates a group's properties. Requires `workspaceId`.
     *
     * @param args - The arguments for updating a group.
     * @param args.id - The group ID.
     * @param args.workspaceId - The workspace ID.
     * @param args.name - Optional new group name.
     * @param args.description - Optional new group description.
     * @returns The updated group object.
     */
    updateGroup(args: {
        id: string
        workspaceId: number
        name?: string
        description?: string
    }): Promise<Group> {
        return this.simple('POST', 'update', { ...args }, GroupSchema)
    }

    /**
     * Permanently deletes a group. Requires `workspaceId`.
     *
     * @param args - The arguments for deleting a group.
     * @param args.id - The group ID.
     * @param args.workspaceId - The workspace ID.
     */
    deleteGroup(args: { id: string; workspaceId: number }): Promise<StatusOk> {
        return this.simple('POST', 'remove', { ...args }, StatusOkSchema)
    }

    /**
     * Adds a user to a group.
     *
     * @param args - The arguments for adding a user.
     * @param args.id - The group ID.
     * @param args.workspaceId - The workspace ID.
     * @param args.userId - The user ID to add.
     */
    addUser(args: AddGroupUserArgs): Promise<StatusOk> {
        return this.simple('POST', 'add_user', { ...args }, StatusOkSchema)
    }

    /**
     * Adds multiple users to a group.
     *
     * @param args - The arguments for adding users.
     * @param args.id - The group ID.
     * @param args.workspaceId - The workspace ID.
     * @param args.userIds - Array of user IDs to add.
     *
     * @example
     * ```typescript
     * await api.groups.addUsers({
     *   id: '7YpL3oZ4kZ9vP7Q1tR2sX45',
     *   workspaceId: 123,
     *   userIds: [101, 202, 303],
     * })
     * ```
     */
    addUsers(args: AddGroupUsersArgs): Promise<StatusOk> {
        return this.simple('POST', 'add_users', { ...args }, StatusOkSchema)
    }

    /**
     * Removes a user from a group.
     *
     * @param args - The arguments for removing a user.
     * @param args.id - The group ID.
     * @param args.workspaceId - The workspace ID.
     * @param args.userId - The user ID to remove.
     */
    removeUser(args: RemoveGroupUserArgs): Promise<StatusOk> {
        return this.simple('POST', 'remove_user', { ...args }, StatusOkSchema)
    }

    /**
     * Removes multiple users from a group.
     *
     * @param args - The arguments for removing users.
     * @param args.id - The group ID.
     * @param args.workspaceId - The workspace ID.
     * @param args.userIds - Array of user IDs to remove.
     */
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
