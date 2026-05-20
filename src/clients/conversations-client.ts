import { z } from 'zod'
import { ENDPOINT_CONVERSATIONS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import type { BatchRequestDescriptor } from '../types/batch'
import {
    type Conversation,
    ConversationSchema,
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

const StatusOkSchema = z.object({ status: z.string() })
type StatusOk = z.infer<typeof StatusOkSchema>

const GetUnreadResponseSchema = z.object({
    data: z.array(UnreadConversationSchema),
    version: z.number().int(),
})

/**
 * Client for `/api/v3/conversations/`. Conversation IDs are
 * base58-encoded UUIDv7 strings. `getOrCreate` requires an `id` (the SDK
 * auto-generates one for new conversations); the backend dedupes on
 * `userIds`, so an existing conversation will be returned with its own
 * already-assigned `id` and your generated one is silently dropped.
 */
export class ConversationsClient extends BaseClient {
    /** Lists conversations in a workspace. */
    getConversations(
        args: GetConversationsArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Conversation[]>
    getConversations(
        args: GetConversationsArgs,
        options?: { batch?: false },
    ): Promise<Conversation[]>
    getConversations(
        args: GetConversationsArgs,
        options?: { batch?: boolean },
    ): Promise<Conversation[]> | BatchRequestDescriptor<Conversation[]> {
        const method = 'GET'
        const url = `${ENDPOINT_CONVERSATIONS}/get`
        const params = args

        if (options?.batch) {
            return { method, url, params, schema: z.array(ConversationSchema) }
        }

        return request<Conversation[]>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) =>
            response.data.map((conversation) => ConversationSchema.parse(conversation)),
        )
    }

    /** Fetches a single conversation by ID. */
    getConversation(id: string, options: { batch: true }): BatchRequestDescriptor<Conversation>
    getConversation(id: string, options?: { batch?: false }): Promise<Conversation>
    getConversation(
        id: string,
        options?: { batch?: boolean },
    ): Promise<Conversation> | BatchRequestDescriptor<Conversation> {
        return this.simple('GET', 'getone', { id }, ConversationSchema, options)
    }

    /**
     * Gets an existing 1:1 / group conversation with `userIds`, or creates a
     * new one. `id` is auto-generated if not supplied — on dedupe, the
     * backend returns the existing conversation's `id` instead.
     */
    getOrCreateConversation(
        args: GetOrCreateConversationArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Conversation>
    getOrCreateConversation(
        args: GetOrCreateConversationArgs,
        options?: { batch?: false },
    ): Promise<Conversation>
    getOrCreateConversation(
        args: GetOrCreateConversationArgs,
        options?: { batch?: boolean },
    ): Promise<Conversation> | BatchRequestDescriptor<Conversation> {
        const params = { ...args, id: resolveCreateId(args.id) }
        return this.simple('GET', 'get_or_create', params, ConversationSchema, options)
    }

    /** Updates a conversation's title. */
    updateConversation(
        args: UpdateConversationArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Conversation>
    updateConversation(
        args: UpdateConversationArgs,
        options?: { batch?: false },
    ): Promise<Conversation>
    updateConversation(
        args: UpdateConversationArgs,
        options?: { batch?: boolean },
    ): Promise<Conversation> | BatchRequestDescriptor<Conversation> {
        const params: Record<string, unknown> = { id: args.id, title: args.title }
        if (args.archived !== undefined) params.archived = args.archived
        return this.simple('POST', 'update', params, ConversationSchema, options)
    }

    archiveConversation(id: string, options: { batch: true }): BatchRequestDescriptor<Conversation>
    archiveConversation(id: string, options?: { batch?: false }): Promise<Conversation>
    archiveConversation(
        id: string,
        options?: { batch?: boolean },
    ): Promise<Conversation> | BatchRequestDescriptor<Conversation> {
        return this.simple('GET', 'archive', { id }, ConversationSchema, options)
    }

    unarchiveConversation(
        id: string,
        options: { batch: true },
    ): BatchRequestDescriptor<Conversation>
    unarchiveConversation(id: string, options?: { batch?: false }): Promise<Conversation>
    unarchiveConversation(
        id: string,
        options?: { batch?: boolean },
    ): Promise<Conversation> | BatchRequestDescriptor<Conversation> {
        return this.simple('GET', 'unarchive', { id }, ConversationSchema, options)
    }

    addUser(
        args: AddConversationUserArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Conversation>
    addUser(args: AddConversationUserArgs, options?: { batch?: false }): Promise<Conversation>
    addUser(
        args: AddConversationUserArgs,
        options?: { batch?: boolean },
    ): Promise<Conversation> | BatchRequestDescriptor<Conversation> {
        return this.simple('POST', 'add_user', { ...args }, ConversationSchema, options)
    }

    addUsers(
        args: AddConversationUsersArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Conversation>
    addUsers(args: AddConversationUsersArgs, options?: { batch?: false }): Promise<Conversation>
    addUsers(
        args: AddConversationUsersArgs,
        options?: { batch?: boolean },
    ): Promise<Conversation> | BatchRequestDescriptor<Conversation> {
        return this.simple('POST', 'add_users', { ...args }, ConversationSchema, options)
    }

    removeUser(
        args: RemoveConversationUserArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Conversation>
    removeUser(args: RemoveConversationUserArgs, options?: { batch?: false }): Promise<Conversation>
    removeUser(
        args: RemoveConversationUserArgs,
        options?: { batch?: boolean },
    ): Promise<Conversation> | BatchRequestDescriptor<Conversation> {
        return this.simple('POST', 'remove_user', { ...args }, ConversationSchema, options)
    }

    removeUsers(
        args: RemoveConversationUsersArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Conversation>
    removeUsers(
        args: RemoveConversationUsersArgs,
        options?: { batch?: false },
    ): Promise<Conversation>
    removeUsers(
        args: RemoveConversationUsersArgs,
        options?: { batch?: boolean },
    ): Promise<Conversation> | BatchRequestDescriptor<Conversation> {
        return this.simple('POST', 'remove_users', { ...args }, ConversationSchema, options)
    }

    markRead(
        args: { id: string; objIndex?: number; messageId?: string },
        options: { batch: true },
    ): BatchRequestDescriptor<StatusOk>
    markRead(
        args: { id: string; objIndex?: number; messageId?: string },
        options?: { batch?: false },
    ): Promise<StatusOk>
    markRead(
        args: { id: string; objIndex?: number; messageId?: string },
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'mark_read', { ...args }, StatusOkSchema, options)
    }

    markUnread(
        args: { id: string; objIndex?: number; messageId?: string },
        options: { batch: true },
    ): BatchRequestDescriptor<StatusOk>
    markUnread(
        args: { id: string; objIndex?: number; messageId?: string },
        options?: { batch?: false },
    ): Promise<StatusOk>
    markUnread(
        args: { id: string; objIndex?: number; messageId?: string },
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'mark_unread', { ...args }, StatusOkSchema, options)
    }

    /**
     * Returns unread conversations for a workspace, paired with the unread
     * version counter.
     */
    getUnread(
        workspaceId: number,
        options: { batch: true },
    ): BatchRequestDescriptor<{ data: UnreadConversation[]; version: number }>
    getUnread(
        workspaceId: number,
        options?: { batch?: false },
    ): Promise<{ data: UnreadConversation[]; version: number }>
    getUnread(
        workspaceId: number,
        options?: { batch?: boolean },
    ):
        | Promise<{ data: UnreadConversation[]; version: number }>
        | BatchRequestDescriptor<{ data: UnreadConversation[]; version: number }> {
        return this.simple('GET', 'get_unread', { workspaceId }, GetUnreadResponseSchema, options)
    }

    clearUnread(workspaceId: number, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    clearUnread(workspaceId: number, options?: { batch?: false }): Promise<StatusOk>
    clearUnread(
        workspaceId: number,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('GET', 'clear_unread', { workspaceId }, StatusOkSchema, options)
    }

    muteConversation(
        args: MuteConversationArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Conversation>
    muteConversation(args: MuteConversationArgs, options?: { batch?: false }): Promise<Conversation>
    muteConversation(
        args: MuteConversationArgs,
        options?: { batch?: boolean },
    ): Promise<Conversation> | BatchRequestDescriptor<Conversation> {
        return this.simple('GET', 'mute', { ...args }, ConversationSchema, options)
    }

    unmuteConversation(id: string, options: { batch: true }): BatchRequestDescriptor<Conversation>
    unmuteConversation(id: string, options?: { batch?: false }): Promise<Conversation>
    unmuteConversation(
        id: string,
        options?: { batch?: boolean },
    ): Promise<Conversation> | BatchRequestDescriptor<Conversation> {
        return this.simple('GET', 'unmute', { id }, ConversationSchema, options)
    }

    private simple<T>(
        httpMethod: 'GET' | 'POST',
        suffix: string,
        params: Record<string, unknown>,
        schema: z.ZodType<T>,
        options?: { batch?: boolean },
    ): Promise<T> | BatchRequestDescriptor<T> {
        const url = `${ENDPOINT_CONVERSATIONS}/${suffix}`
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
