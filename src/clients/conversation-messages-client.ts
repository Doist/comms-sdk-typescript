import { z } from 'zod'
import { ENDPOINT_CONVERSATION_MESSAGES } from '../consts/endpoints'
import { request } from '../transport/http-client'
import type { BatchRequestDescriptor } from '../types/batch'
import { type ConversationMessage, ConversationMessageSchema } from '../types/entities'
import type {
    CreateConversationMessageArgs,
    GetConversationMessagesArgs,
    UpdateConversationMessageArgs,
} from '../types/requests'
import { resolveCreateId } from '../utils/uuidv7'
import { BaseClient } from './base-client'

const StatusOkSchema = z.object({ status: z.string() })
type StatusOk = z.infer<typeof StatusOkSchema>

/**
 * Client for `/api/v3/conversation_messages/`. Message IDs and conversation
 * IDs are both base58-encoded UUIDv7 strings on the wire.
 */
export class ConversationMessagesClient extends BaseClient {
    /** Lists messages in a conversation. */
    getMessages(
        args: GetConversationMessagesArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<ConversationMessage[]>
    getMessages(
        args: GetConversationMessagesArgs,
        options?: { batch?: false },
    ): Promise<ConversationMessage[]>
    getMessages(
        args: GetConversationMessagesArgs,
        options?: { batch?: boolean },
    ): Promise<ConversationMessage[]> | BatchRequestDescriptor<ConversationMessage[]> {
        const params: Record<string, unknown> = { conversation_id: args.conversationId }
        if (args.newerThan) params.newer_than_ts = Math.floor(args.newerThan.getTime() / 1000)
        if (args.olderThan) params.older_than_ts = Math.floor(args.olderThan.getTime() / 1000)
        if (args.limit) params.limit = args.limit
        if (args.cursor) params.cursor = args.cursor

        const method = 'GET'
        const url = `${ENDPOINT_CONVERSATION_MESSAGES}/get`

        if (options?.batch) {
            return { method, url, params, schema: z.array(ConversationMessageSchema) }
        }

        return request<ConversationMessage[]>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) =>
            response.data.map((message) => ConversationMessageSchema.parse(message)),
        )
    }

    /** Fetches a single message by ID. */
    getMessage(id: string, options: { batch: true }): BatchRequestDescriptor<ConversationMessage>
    getMessage(id: string, options?: { batch?: false }): Promise<ConversationMessage>
    getMessage(
        id: string,
        options?: { batch?: boolean },
    ): Promise<ConversationMessage> | BatchRequestDescriptor<ConversationMessage> {
        return this.simple('GET', 'getone', { id }, ConversationMessageSchema, options)
    }

    /** Creates a new message. `id` is auto-generated if not supplied. */
    createMessage(
        args: CreateConversationMessageArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<ConversationMessage>
    createMessage(
        args: CreateConversationMessageArgs,
        options?: { batch?: false },
    ): Promise<ConversationMessage>
    createMessage(
        args: CreateConversationMessageArgs,
        options?: { batch?: boolean },
    ): Promise<ConversationMessage> | BatchRequestDescriptor<ConversationMessage> {
        const params: Record<string, unknown> = {
            conversation_id: args.conversationId,
            content: args.content,
            id: resolveCreateId(args.id),
        }
        if (args.attachments) params.attachments = args.attachments
        if (args.actions) params.actions = args.actions
        if (args.directMentions) params.direct_mentions = args.directMentions
        if (args.directGroupMentions) params.direct_group_mentions = args.directGroupMentions
        if (args.notify !== undefined) params.notify = args.notify

        return this.simple('POST', 'add', params, ConversationMessageSchema, options)
    }

    /** Updates a message. */
    updateMessage(
        args: UpdateConversationMessageArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<ConversationMessage>
    updateMessage(
        args: UpdateConversationMessageArgs,
        options?: { batch?: false },
    ): Promise<ConversationMessage>
    updateMessage(
        args: UpdateConversationMessageArgs,
        options?: { batch?: boolean },
    ): Promise<ConversationMessage> | BatchRequestDescriptor<ConversationMessage> {
        const params: Record<string, unknown> = { id: args.id, content: args.content }
        if (args.attachments) params.attachments = args.attachments
        if (args.actions) params.actions = args.actions
        if (args.directMentions) params.direct_mentions = args.directMentions
        if (args.directGroupMentions) params.direct_group_mentions = args.directGroupMentions

        return this.simple('POST', 'update', params, ConversationMessageSchema, options)
    }

    /** Permanently deletes a message. */
    deleteMessage(id: string, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    deleteMessage(id: string, options?: { batch?: false }): Promise<StatusOk>
    deleteMessage(
        id: string,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'remove', { id }, StatusOkSchema, options)
    }

    private simple<T>(
        httpMethod: 'GET' | 'POST',
        suffix: string,
        params: Record<string, unknown>,
        schema: z.ZodType<T>,
        options?: { batch?: boolean },
    ): Promise<T> | BatchRequestDescriptor<T> {
        const url = `${ENDPOINT_CONVERSATION_MESSAGES}/${suffix}`
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
