import { z } from 'zod'
import { ENDPOINT_CONVERSATION_MESSAGES } from '../consts/endpoints'
import { request } from '../transport/http-client'
import {
    type ConversationMessage,
    ConversationMessageSchema,
    type StatusOk,
    StatusOkSchema,
} from '../types/entities'
import type {
    CreateConversationMessageArgs,
    GetConversationMessagesArgs,
    UpdateConversationMessageArgs,
} from '../types/requests'
import { resolveCreateId } from '../utils/uuidv7'
import { BaseClient } from './base-client'

export const ConversationMessageListSchema = z.array(ConversationMessageSchema)

/**
 * Client for `/api/v1/conversation_messages/`. The SDK auto-generates the
 * message `id` on `createMessage` when the caller doesn't supply one.
 */
export class ConversationMessagesClient extends BaseClient {
    /** Lists messages in a conversation. */
    getMessages(args: GetConversationMessagesArgs): Promise<ConversationMessage[]> {
        const params: Record<string, unknown> = { conversationId: args.conversationId }
        if (args.newerThan) params.newerThanTs = Math.floor(args.newerThan.getTime() / 1000)
        if (args.olderThan) params.olderThanTs = Math.floor(args.olderThan.getTime() / 1000)
        if (args.limit) params.limit = args.limit
        if (args.cursor) params.cursor = args.cursor

        return request<ConversationMessage[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_CONVERSATION_MESSAGES}/get`,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => ConversationMessageListSchema.parse(response.data))
    }

    /** Fetches a single message by ID. */
    getMessage(id: string): Promise<ConversationMessage> {
        return this.simple('GET', 'getone', { id }, ConversationMessageSchema)
    }

    /** Creates a new message. `id` is auto-generated if not supplied. */
    createMessage(args: CreateConversationMessageArgs): Promise<ConversationMessage> {
        const params: Record<string, unknown> = {
            conversationId: args.conversationId,
            content: args.content,
            id: resolveCreateId(args.id),
        }
        if (args.attachments) params.attachments = args.attachments
        if (args.actions) params.actions = args.actions
        if (args.directMentions) params.directMentions = args.directMentions
        if (args.directGroupMentions) params.directGroupMentions = args.directGroupMentions
        if (args.notify !== undefined) params.notify = args.notify

        return this.simple('POST', 'add', params, ConversationMessageSchema)
    }

    /** Updates a message. */
    updateMessage(args: UpdateConversationMessageArgs): Promise<ConversationMessage> {
        const params: Record<string, unknown> = { id: args.id, content: args.content }
        if (args.attachments) params.attachments = args.attachments
        if (args.actions) params.actions = args.actions
        if (args.directMentions) params.directMentions = args.directMentions
        if (args.directGroupMentions) params.directGroupMentions = args.directGroupMentions

        return this.simple('POST', 'update', params, ConversationMessageSchema)
    }

    /** Permanently deletes a message. */
    deleteMessage(id: string): Promise<StatusOk> {
        return this.simple('POST', 'remove', { id }, StatusOkSchema)
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
            relativePath: `${ENDPOINT_CONVERSATION_MESSAGES}/${suffix}`,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }
}
