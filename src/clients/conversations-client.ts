import { z } from 'zod'
import { ENDPOINT_CONVERSATIONS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import {
    type Conversation,
    ConversationSchema,
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
    /** Lists conversations in a workspace. */
    getConversations(args: GetConversationsArgs): Promise<Conversation[]> {
        return request<Conversation[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_CONVERSATIONS}/get`,
            apiToken: this.apiToken,
            payload: args,
            customFetch: this.customFetch,
        }).then((response) => ConversationListSchema.parse(response.data))
    }

    /** Fetches a single conversation by ID. */
    getConversation(id: string): Promise<Conversation> {
        return this.simple('GET', 'getone', { id }, ConversationSchema)
    }

    /**
     * Gets an existing 1:1 / group conversation with `userIds`, or creates a
     * new one. `id` is auto-generated if not supplied — on dedupe, the
     * backend returns the existing conversation's `id` instead.
     */
    getOrCreateConversation(args: GetOrCreateConversationArgs): Promise<Conversation> {
        return this.simple(
            'GET',
            'get_or_create',
            { ...args, id: resolveCreateId(args.id) },
            ConversationSchema,
        )
    }

    /** Updates a conversation's title. */
    updateConversation(args: UpdateConversationArgs): Promise<Conversation> {
        const params: Record<string, unknown> = { id: args.id, title: args.title }
        if (args.archived !== undefined) params.archived = args.archived
        return this.simple('POST', 'update', params, ConversationSchema)
    }

    archiveConversation(id: string): Promise<Conversation> {
        return this.simple('GET', 'archive', { id }, ConversationSchema)
    }

    unarchiveConversation(id: string): Promise<Conversation> {
        return this.simple('GET', 'unarchive', { id }, ConversationSchema)
    }

    addUser(args: AddConversationUserArgs): Promise<Conversation> {
        return this.simple('POST', 'add_user', { ...args }, ConversationSchema)
    }

    addUsers(args: AddConversationUsersArgs): Promise<Conversation> {
        return this.simple('POST', 'add_users', { ...args }, ConversationSchema)
    }

    removeUser(args: RemoveConversationUserArgs): Promise<Conversation> {
        return this.simple('POST', 'remove_user', { ...args }, ConversationSchema)
    }

    removeUsers(args: RemoveConversationUsersArgs): Promise<Conversation> {
        return this.simple('POST', 'remove_users', { ...args }, ConversationSchema)
    }

    markRead(args: { id: string; objIndex?: number; messageId?: string }): Promise<StatusOk> {
        return this.simple('POST', 'mark_read', { ...args }, StatusOkSchema)
    }

    markUnread(args: { id: string; objIndex?: number; messageId?: string }): Promise<StatusOk> {
        return this.simple('POST', 'mark_unread', { ...args }, StatusOkSchema)
    }

    /**
     * Returns unread conversations for a workspace, paired with the unread
     * version counter.
     */
    getUnread(workspaceId: number): Promise<{ data: UnreadConversation[]; version: number }> {
        return this.simple('GET', 'get_unread', { workspaceId }, GetUnreadResponseSchema)
    }

    clearUnread(workspaceId: number): Promise<StatusOk> {
        return this.simple('GET', 'clear_unread', { workspaceId }, StatusOkSchema)
    }

    muteConversation(args: MuteConversationArgs): Promise<Conversation> {
        return this.simple('GET', 'mute', { ...args }, ConversationSchema)
    }

    unmuteConversation(id: string): Promise<Conversation> {
        return this.simple('GET', 'unmute', { id }, ConversationSchema)
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
