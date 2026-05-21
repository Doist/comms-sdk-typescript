import { ENDPOINT_REACTIONS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import type { ReactionObject } from '../types/entities'
import type { AddReactionArgs, GetReactionsArgs, RemoveReactionArgs } from '../types/requests'
import { BaseClient } from './base-client'

type ReactionTarget = { threadId: string } | { commentId: string } | { messageId: string }

function reactionTarget(args: {
    threadId?: string
    commentId?: string
    messageId?: string
}): ReactionTarget {
    if (args.threadId) return { threadId: args.threadId }
    if (args.commentId) return { commentId: args.commentId }
    if (args.messageId) return { messageId: args.messageId }
    throw new Error('Must provide one of: threadId, commentId, or messageId')
}

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
     *
     * @example
     * ```typescript
     * await api.reactions.add({ threadId: '7YpL3oZ4kZ9vP7Q1tR2sX3z', reaction: '👍' })
     * ```
     */
    add(args: AddReactionArgs): Promise<void> {
        return request<void>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_REACTIONS}/add`,
            apiToken: this.apiToken,
            payload: { ...reactionTarget(args), reaction: args.reaction },
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Gets reactions for a thread, comment, or conversation message.
     *
     * Returns an object with emoji reactions as keys and arrays of user IDs as
     * values, or null if no reactions.
     *
     * @param args - The arguments for getting reactions.
     * @param args.threadId - Optional thread ID.
     * @param args.commentId - Optional comment ID.
     * @param args.messageId - Optional message ID (for conversation messages).
     * @returns A reaction object with emoji reactions as keys and arrays of user IDs as values, or null if no reactions.
     *
     * @example
     * ```typescript
     * const reactions = await api.reactions.get({ threadId: '7YpL3oZ4kZ9vP7Q1tR2sX3z' })
     * // Returns: { "👍": [101, 202, 303], "❤️": [101, 202] }
     * ```
     */
    get(args: GetReactionsArgs): Promise<ReactionObject> {
        return request<ReactionObject>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_REACTIONS}/get`,
            apiToken: this.apiToken,
            payload: reactionTarget(args),
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
     *
     * @example
     * ```typescript
     * await api.reactions.remove({ threadId: '7YpL3oZ4kZ9vP7Q1tR2sX3z', reaction: '👍' })
     * ```
     */
    remove(args: RemoveReactionArgs): Promise<void> {
        return request<void>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_REACTIONS}/remove`,
            apiToken: this.apiToken,
            payload: { ...reactionTarget(args), reaction: args.reaction },
            customFetch: this.customFetch,
        }).then(() => undefined)
    }
}
