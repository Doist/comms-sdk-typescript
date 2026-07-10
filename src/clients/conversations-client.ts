import { z } from 'zod'
import { ENDPOINT_CONVERSATIONS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import {
    type Conversation,
    ConversationSchema,
    createConversationSchema,
    type StatusOk,
    StatusOkSchema,
    type UnreadConversation,
    UnreadConversationSchema,
} from '../types/entities'
import type {
    AddConversationUserArgs,
    AddConversationUsersArgs,
    GetConversationsArgs,
    GetOrCreateConversationArgs,
    MuteConversationArgs,
    RemoveConversationUserArgs,
    RemoveConversationUsersArgs,
    UpdateConversationArgs,
} from '../types/requests'
import { resolveCreateId } from '../utils/uuidv7'
import { BaseClient } from './base-client'

export const ConversationListSchema = z.array(ConversationSchema)

const GetUnreadResponseSchema = z.object({
    data: z.array(UnreadConversationSchema),
    version: z.number().int(),
})

/**
 * Client for `/api/v1/conversations/`. `getOrCreate` requires an `id` (the
 * SDK auto-generates one for new conversations); the backend dedupes on
 * `userIds`, so an existing conversation will be returned with its own
 * already-assigned `id` and your generated one is silently dropped.
 */
export class ConversationsClient extends BaseClient {
    private readonly linkBaseUrl = this.getLinkBaseUrl()
    // Reuse the shared singletons when no custom base is configured.
    private readonly conversationSchema = this.linkBaseUrl
        ? createConversationSchema(this.linkBaseUrl)
        : ConversationSchema
    private readonly conversationListSchema = this.linkBaseUrl
        ? z.array(this.conversationSchema)
        : ConversationListSchema

    /**
     * Gets a page of conversations for a workspace, newest activity first.
     * The server returns at most 500 rows per request (20 by default); pass
     * the last row's `lastActive`/`id` as `olderThan`/`beforeId` to fetch
     * the next page. Paired, they form a strict compound boundary, so pages
     * never repeat rows. Omitting `archived` returns active and archived
     * conversations mixed.
     *
     * @param args - The arguments for getting conversations.
     * @param args.workspaceId - The workspace ID.
     * @param args.archived - Optional flag to filter archived (true) or active (false) conversations.
     * @param args.olderThan - Optional date to get conversations last active before.
     * @param args.beforeId - Optional conversation id. Paired with olderThan it forms the
     *   strict compound cursor; alone it pages by conversation id order instead.
     * @param args.limit - Optional page size (server default 20, max 500).
     * @returns An array of conversation objects.
     *
     * @example
     * ```typescript
     * const page = await api.conversations.getConversations({ workspaceId: 123, limit: 500 })
     * const last = page.at(-1)
     * const nextPage = last
     *     ? await api.conversations.getConversations({
     *           workspaceId: 123,
     *           limit: 500,
     *           olderThan: last.lastActive,
     *           beforeId: last.id,
     *       })
     *     : []
     * ```
     */
    getConversations(args: GetConversationsArgs): Promise<Conversation[]> {
        // Fields are picked explicitly (matching getThreads/getComments) so a
        // future Date field can't silently reach the generic snake-casing,
        // which would turn it into an empty object on the wire.
        const params: Record<string, unknown> = { workspaceId: args.workspaceId }
        if (args.archived != null) params.archived = args.archived
        if (args.olderThan) params.olderThanTs = Math.floor(args.olderThan.getTime() / 1000)
        if (args.beforeId != null) params.beforeId = args.beforeId
        if (args.limit != null) params.limit = args.limit

        return request<Conversation[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_CONVERSATIONS}/get`,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => this.conversationListSchema.parse(response.data))
    }

    /**
     * Gets a single conversation object by id.
     *
     * @param id - The conversation ID.
     * @returns The conversation object.
     */
    getConversation(id: string): Promise<Conversation> {
        return this.simple('GET', 'getone', { id }, this.conversationSchema)
    }

    /**
     * Gets an existing 1:1 / group conversation with `userIds`, or creates a
     * new one. `id` is auto-generated if not supplied — on dedupe, the
     * backend returns the existing conversation's `id` instead.
     *
     * @param args - The arguments for getting or creating a conversation.
     * @param args.workspaceId - The workspace ID.
     * @param args.userIds - Array of user IDs to include in the conversation.
     * @returns The conversation object (existing or newly created).
     *
     * @example
     * ```typescript
     * const conversation = await api.conversations.getOrCreateConversation({
     *   workspaceId: 123,
     *   userIds: [101, 202, 303],
     * })
     * ```
     */
    getOrCreateConversation(args: GetOrCreateConversationArgs): Promise<Conversation> {
        return this.simple(
            'GET',
            'get_or_create',
            { ...args, id: resolveCreateId(args.id) },
            this.conversationSchema,
        )
    }

    /**
     * Updates a conversation's title.
     *
     * @param args - The arguments for updating a conversation.
     * @param args.id - The conversation ID.
     * @param args.title - The new title for the conversation.
     * @param args.archived - Optional flag to archive/unarchive the conversation.
     * @returns The updated conversation object.
     *
     * @example
     * ```typescript
     * const conversation = await api.conversations.updateConversation({
     *   id: '7YpL3oZ4kZ9vP7Q1tR2sX42',
     *   title: 'New Title',
     * })
     * ```
     */
    updateConversation(args: UpdateConversationArgs): Promise<Conversation> {
        const params: Record<string, unknown> = { id: args.id, title: args.title }
        if (args.archived !== undefined) params.archived = args.archived
        return this.simple('POST', 'update', params, this.conversationSchema)
    }

    /**
     * Archives a conversation.
     *
     * @param id - The conversation ID.
     * @returns The updated conversation object.
     */
    archiveConversation(id: string): Promise<Conversation> {
        return this.simple('GET', 'archive', { id }, this.conversationSchema)
    }

    /**
     * Unarchives a conversation.
     *
     * @param id - The conversation ID.
     * @returns The updated conversation object.
     */
    unarchiveConversation(id: string): Promise<Conversation> {
        return this.simple('GET', 'unarchive', { id }, this.conversationSchema)
    }

    /**
     * Adds a user to a conversation.
     *
     * @param args - The arguments for adding a user.
     * @param args.id - The conversation ID.
     * @param args.userId - The user ID to add.
     * @returns The updated conversation object.
     */
    addUser(args: AddConversationUserArgs): Promise<Conversation> {
        return this.simple('POST', 'add_user', { ...args }, this.conversationSchema)
    }

    /**
     * Adds multiple users to a conversation.
     *
     * @param args - The arguments for adding users.
     * @param args.id - The conversation ID.
     * @param args.userIds - Array of user IDs to add.
     * @returns The updated conversation object.
     *
     * @example
     * ```typescript
     * await api.conversations.addUsers({ id: '7YpL3oZ4kZ9vP7Q1tR2sX42', userIds: [101, 202] })
     * ```
     */
    addUsers(args: AddConversationUsersArgs): Promise<Conversation> {
        return this.simple('POST', 'add_users', { ...args }, this.conversationSchema)
    }

    /**
     * Removes a user from a conversation.
     *
     * @param args - The arguments for removing a user.
     * @param args.id - The conversation ID.
     * @param args.userId - The user ID to remove.
     * @returns The updated conversation object.
     */
    removeUser(args: RemoveConversationUserArgs): Promise<Conversation> {
        return this.simple('POST', 'remove_user', { ...args }, this.conversationSchema)
    }

    /**
     * Removes multiple users from a conversation.
     *
     * @param args - The arguments for removing users.
     * @param args.id - The conversation ID.
     * @param args.userIds - Array of user IDs to remove.
     * @returns The updated conversation object.
     */
    removeUsers(args: RemoveConversationUsersArgs): Promise<Conversation> {
        return this.simple('POST', 'remove_users', { ...args }, this.conversationSchema)
    }

    /**
     * Marks a conversation as read.
     *
     * @param args - The arguments for marking as read.
     * @param args.id - The conversation ID.
     * @param args.objIndex - Optional index of the message to mark as last read.
     * @param args.messageId - Optional message ID to mark as last read.
     */
    markRead(args: { id: string; objIndex?: number; messageId?: string }): Promise<StatusOk> {
        return this.simple('POST', 'mark_read', { ...args }, StatusOkSchema)
    }

    /**
     * Marks a conversation as unread.
     *
     * @param args - The arguments for marking as unread.
     * @param args.id - The conversation ID.
     * @param args.objIndex - Optional index of the message to mark as last unread.
     * @param args.messageId - Optional message ID to mark as last unread.
     */
    markUnread(args: { id: string; objIndex?: number; messageId?: string }): Promise<StatusOk> {
        return this.simple('POST', 'mark_unread', { ...args }, StatusOkSchema)
    }

    /**
     * Returns unread conversations for a workspace, paired with the unread
     * version counter.
     *
     * @param workspaceId - The workspace ID.
     * @returns Object containing the array of unread conversation references and a version counter.
     */
    getUnread(workspaceId: number): Promise<{ data: UnreadConversation[]; version: number }> {
        return this.simple('GET', 'get_unread', { workspaceId }, GetUnreadResponseSchema)
    }

    /**
     * Clears all unread conversations for a workspace.
     *
     * @param workspaceId - The workspace ID.
     */
    clearUnread(workspaceId: number): Promise<StatusOk> {
        return this.simple('GET', 'clear_unread', { workspaceId }, StatusOkSchema)
    }

    /**
     * Mutes a conversation for a specified number of minutes.
     * The user will receive no notifications from this conversation during that period.
     *
     * @param args - The arguments for muting a conversation.
     * @param args.id - The conversation ID.
     * @param args.minutes - Number of minutes to mute the conversation.
     * @returns The updated conversation object.
     *
     * @example
     * ```typescript
     * const conversation = await api.conversations.muteConversation({ id: '7YpL3oZ4kZ9vP7Q1tR2sX42', minutes: 30 })
     * ```
     */
    muteConversation(args: MuteConversationArgs): Promise<Conversation> {
        return this.simple('GET', 'mute', { ...args }, this.conversationSchema)
    }

    /**
     * Unmutes a conversation.
     *
     * @param id - The conversation ID.
     * @returns The updated conversation object.
     */
    unmuteConversation(id: string): Promise<Conversation> {
        return this.simple('GET', 'unmute', { id }, this.conversationSchema)
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
            relativePath: `${ENDPOINT_CONVERSATIONS}/${suffix}`,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }
}
