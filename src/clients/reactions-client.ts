import { ENDPOINT_REACTIONS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import type { ReactionObject } from '../types/entities'
import type { AddReactionArgs, GetReactionsArgs, RemoveReactionArgs } from '../types/requests'
import { BaseClient } from './base-client'

function reactionTarget(args: {
    threadId?: string
    commentId?: string
    messageId?: string
}): Record<string, string> {
    if (args.threadId) return { thread_id: args.threadId }
    if (args.commentId) return { comment_id: args.commentId }
    if (args.messageId) return { message_id: args.messageId }
    throw new Error('Must provide one of: threadId, commentId, or messageId')
}

/**
 * Client for interacting with Comms reaction endpoints.
 */
export class ReactionsClient extends BaseClient {
    /**
     * Adds an emoji reaction to a thread, comment, or conversation message.
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
