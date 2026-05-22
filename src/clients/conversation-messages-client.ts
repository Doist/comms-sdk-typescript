import { z } from 'zod'
import { ENDPOINT_CONVERSATION_MESSAGES } from '../consts/endpoints'
import { request } from '../transport/http-client'
import {
    type ConversationMessage,
    ConversationMessageSchema,
    createConversationMessageSchema,
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
    private readonly linkBaseUrl = this.getLinkBaseUrl()
    // Reuse the shared singletons when no custom base is configured.
    private readonly messageSchema = this.linkBaseUrl
        ? createConversationMessageSchema(this.linkBaseUrl)
        : ConversationMessageSchema
    private readonly messageListSchema = this.linkBaseUrl
        ? z.array(this.messageSchema)
        : ConversationMessageListSchema

    /**
     * Gets all messages in a conversation.
     *
     * @param args - The arguments for getting messages.
     * @param args.conversationId - The conversation ID.
     * @param args.newerThan - Optional date to get messages newer than.
     * @param args.olderThan - Optional date to get messages older than.
     * @param args.limit - Optional limit on number of messages returned.
     * @param args.cursor - Optional cursor for pagination.
     * @returns An array of message objects.
     *
     * @example
     * ```typescript
     * const messages = await api.conversationMessages.getMessages({
     *   conversationId: '7YpL3oZ4kZ9vP7Q1tR2sX42',
     *   newerThan: new Date('2024-01-01'),
     * })
     * ```
     */
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
        }).then((response) => this.messageListSchema.parse(response.data))
    }

    /**
     * Gets a single conversation message by id.
     *
     * @param id - The message ID.
     * @returns The conversation message object.
     *
     * @example
     * ```typescript
     * const message = await api.conversationMessages.getMessage('7YpL3oZ4kZ9vP7Q1tR2sX43')
     * ```
     */
    getMessage(id: string): Promise<ConversationMessage> {
        return this.simple('GET', 'getone', { id }, this.messageSchema)
    }

    /**
     * Creates a new message in a conversation. `id` is auto-generated if not
     * supplied.
     *
     * @param args - The arguments for creating a message.
     * @param args.conversationId - The conversation ID.
     * @param args.content - The message content.
     * @param args.attachments - Optional array of {@link Attachment} objects.
     * @param args.actions - Optional array of action objects.
     * @returns The created message object.
     *
     * @example
     * ```typescript
     * const message = await api.conversationMessages.createMessage({
     *   conversationId: '7YpL3oZ4kZ9vP7Q1tR2sX42',
     *   content: 'Thanks for the update!',
     * })
     * ```
     */
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

        return this.simple('POST', 'add', params, this.messageSchema)
    }

    /**
     * Updates a conversation message.
     *
     * @param args - The arguments for updating a message.
     * @param args.id - The message ID.
     * @param args.content - The new message content.
     * @param args.attachments - Optional array of {@link Attachment} objects.
     * @returns The updated message object.
     *
     * @example
     * ```typescript
     * const message = await api.conversationMessages.updateMessage({
     *   id: '7YpL3oZ4kZ9vP7Q1tR2sX43',
     *   content: 'Updated message content',
     * })
     * ```
     */
    updateMessage(args: UpdateConversationMessageArgs): Promise<ConversationMessage> {
        const params: Record<string, unknown> = { id: args.id, content: args.content }
        if (args.attachments) params.attachments = args.attachments
        if (args.actions) params.actions = args.actions
        if (args.directMentions) params.directMentions = args.directMentions
        if (args.directGroupMentions) params.directGroupMentions = args.directGroupMentions

        return this.simple('POST', 'update', params, this.messageSchema)
    }

    /**
     * Permanently deletes a conversation message.
     *
     * @param id - The message ID.
     *
     * @example
     * ```typescript
     * await api.conversationMessages.deleteMessage('7YpL3oZ4kZ9vP7Q1tR2sX43')
     * ```
     */
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
