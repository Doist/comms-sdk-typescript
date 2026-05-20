import { ENDPOINT_REACTIONS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import type { BatchRequestDescriptor } from '../types/batch'
import type { ReactionObject } from '../types/entities'
import type { AddReactionArgs, GetReactionsArgs, RemoveReactionArgs } from '../types/requests'
import { BaseClient } from './base-client'

/**
 * Client for interacting with Comms reaction endpoints.
 */
export class ReactionsClient extends BaseClient {
    /**
     * Adds an emoji reaction to a thread, comment, or conversation message.
     *
     * @param args - The arguments for adding a reaction.
     * @param args.threadId - Optional thread ID.
     * @param args.commentId - Optional comment ID.
     * @param args.messageId - Optional message ID (for conversation messages).
     * @param args.reaction - The reaction emoji to add.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     *
     * @example
     * ```typescript
     * await api.reactions.add({ threadId: 789, reaction: '👍' })
     *
     * // Batch usage
     * const batch = api.createBatch()
     * batch.add(() => api.reactions.add({ threadId: 789, reaction: '👍' }, { batch: true }))
     * ```
     */
    add(args: AddReactionArgs, options: { batch: true }): BatchRequestDescriptor<void>
    add(args: AddReactionArgs, options?: { batch?: false }): Promise<void>
    add(
        args: AddReactionArgs,
        options?: { batch?: boolean },
    ): Promise<void> | BatchRequestDescriptor<void> {
        const params: Record<string, string | undefined> = {
            reaction: args.reaction,
        }

        if (args.threadId) {
            params.thread_id = args.threadId
        } else if (args.commentId) {
            params.comment_id = args.commentId
        } else if (args.messageId) {
            params.message_id = args.messageId
        } else {
            throw new Error('Must provide one of: threadId, commentId, or messageId')
        }

        const method = 'POST'
        const url = `${ENDPOINT_REACTIONS}/add`

        if (options?.batch) {
            return { method, url, params }
        }

        return request<void>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Gets reactions for a thread, comment, or conversation message.
     *
     * @param args - The arguments for getting reactions.
     * @param args.threadId - Optional thread ID.
     * @param args.commentId - Optional comment ID.
     * @param args.messageId - Optional message ID (for conversation messages).
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns A reaction object with emoji reactions as keys and arrays of user IDs as values, or null if no reactions.
     *
     * @example
     * ```typescript
     * const reactions = await api.reactions.get({ threadId: 789 })
     * // Returns: { "👍": [1, 2, 3], "❤️": [4, 5] }
     * ```
     */
    get(args: GetReactionsArgs, options: { batch: true }): BatchRequestDescriptor<ReactionObject>
    get(args: GetReactionsArgs, options?: { batch?: false }): Promise<ReactionObject>
    get(
        args: GetReactionsArgs,
        options?: { batch?: boolean },
    ): Promise<ReactionObject> | BatchRequestDescriptor<ReactionObject> {
        const params: Record<string, string | undefined> = {}

        if (args.threadId) {
            params.thread_id = args.threadId
        } else if (args.commentId) {
            params.comment_id = args.commentId
        } else if (args.messageId) {
            params.message_id = args.messageId
        } else {
            throw new Error('Must provide one of: threadId, commentId, or messageId')
        }

        const method = 'GET'
        const url = `${ENDPOINT_REACTIONS}/get`

        if (options?.batch) {
            return { method, url, params }
        }

        return request<ReactionObject>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    /**
     * Removes an emoji reaction from a thread, comment, or conversation message.
     *
     * @param args - The arguments for removing a reaction.
     * @param args.threadId - Optional thread ID.
     * @param args.commentId - Optional comment ID.
     * @param args.messageId - Optional message ID (for conversation messages).
     * @param args.reaction - The reaction emoji to remove.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     *
     * @example
     * ```typescript
     * await api.reactions.remove({ threadId: 789, reaction: '👍' })
     * ```
     */
    remove(args: RemoveReactionArgs, options: { batch: true }): BatchRequestDescriptor<void>
    remove(args: RemoveReactionArgs, options?: { batch?: false }): Promise<void>
    remove(
        args: RemoveReactionArgs,
        options?: { batch?: boolean },
    ): Promise<void> | BatchRequestDescriptor<void> {
        const params: Record<string, string | undefined> = {
            reaction: args.reaction,
        }

        if (args.threadId) {
            params.thread_id = args.threadId
        } else if (args.commentId) {
            params.comment_id = args.commentId
        } else if (args.messageId) {
            params.message_id = args.messageId
        } else {
            throw new Error('Must provide one of: threadId, commentId, or messageId')
        }

        const method = 'POST'
        const url = `${ENDPOINT_REACTIONS}/remove`

        if (options?.batch) {
            return { method, url, params }
        }

        return request<void>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then(() => undefined)
    }
}
