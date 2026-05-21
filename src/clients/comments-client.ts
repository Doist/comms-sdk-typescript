import { z } from 'zod'
import { ENDPOINT_COMMENTS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import { type Comment, CommentSchema, type StatusOk, StatusOkSchema } from '../types/entities'
import type {
    CreateCommentArgs,
    GetCommentsArgs,
    MarkCommentPositionArgs,
    UpdateCommentArgs,
} from '../types/requests'
import { addCommentRequest } from './add-comment-helper'
import { BaseClient } from './base-client'

export const CommentListSchema = z.array(CommentSchema)

/**
 * Client for `/api/v1/comments/`. The SDK auto-generates the comment `id`
 * on `createComment` when the caller doesn't supply one.
 */
export class CommentsClient extends BaseClient {
    /**
     * Gets all comments for a thread. `newerThan` / `olderThan` (`Date`) are
     * converted to `newer_than_ts` / `older_than_ts` epoch seconds on the
     * wire.
     *
     * @param args - The arguments for getting comments.
     * @param args.threadId - The thread ID.
     * @param args.newerThan - Optional date to get comments newer than.
     * @param args.olderThan - Optional date to get comments older than.
     * @param args.limit - Optional limit on number of comments returned.
     * @returns An array of comment objects.
     *
     * @example
     * ```typescript
     * const comments = await api.comments.getComments({
     *   threadId: '7YpL3oZ4kZ9vP7Q1tR2sX3z',
     *   newerThan: new Date('2024-01-01'),
     * })
     * comments.forEach(c => console.log(c.content))
     * ```
     */
    getComments(args: GetCommentsArgs): Promise<Comment[]> {
        const params: Record<string, unknown> = { threadId: args.threadId }
        if (args.newerThan) params.newerThanTs = Math.floor(args.newerThan.getTime() / 1000)
        if (args.olderThan) params.olderThanTs = Math.floor(args.olderThan.getTime() / 1000)
        if (args.limit) params.limit = args.limit

        return request<Comment[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_COMMENTS}/get`,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => CommentListSchema.parse(response.data))
    }

    /**
     * Gets a single comment object by id. The API wraps it in `{comment: ...}`.
     *
     * @param id - The comment ID.
     * @returns The comment object.
     */
    getComment(id: string): Promise<Comment> {
        const wrappedSchema = z.object({ comment: CommentSchema }).transform((data) => data.comment)
        return request<Comment>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_COMMENTS}/getone`,
            apiToken: this.apiToken,
            payload: { id },
            customFetch: this.customFetch,
        }).then((response) => wrappedSchema.parse(response.data))
    }

    /**
     * Creates a new comment on a thread. `id` is auto-generated if not supplied.
     *
     * @param args - The arguments for creating a comment.
     * @param args.threadId - The thread ID.
     * @param args.content - The comment content.
     * @param args.recipients - Optional array of user IDs to notify directly.
     * @param args.groups - Optional array of custom group IDs to notify.
     * @param args.directMentions - Optional array of user IDs that were @-mentioned in
     *   `content`.
     * @param args.notifyAudience - Optional broader audience to notify in addition to
     *   `recipients` and `groups`. `'channel'` notifies everyone in the channel;
     *   `'thread'` notifies everyone who has interacted with the thread.
     * @param args.attachments - Optional array of {@link Attachment} objects.
     * @returns The created comment object.
     *
     * @example
     * ```typescript
     * // Notify everyone who has interacted with the thread, plus two extra users.
     * const comment = await api.comments.createComment({
     *   threadId: '7YpL3oZ4kZ9vP7Q1tR2sX3z',
     *   content: 'Great idea! Let\'s proceed.',
     *   notifyAudience: 'thread',
     *   recipients: [101, 202],
     * })
     * ```
     */
    createComment(args: CreateCommentArgs): Promise<Comment> {
        return addCommentRequest(
            { baseUri: this.getBaseUri(), apiToken: this.apiToken, customFetch: this.customFetch },
            args,
        )
    }

    /**
     * Updates a comment's properties.
     *
     * @param args - The arguments for updating a comment.
     * @param args.id - The comment ID.
     * @param args.content - The new comment content.
     * @returns The updated comment object.
     */
    updateComment(args: UpdateCommentArgs): Promise<Comment> {
        return request<Comment>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_COMMENTS}/update`,
            apiToken: this.apiToken,
            payload: { ...args },
            customFetch: this.customFetch,
        }).then((response) => CommentSchema.parse(response.data))
    }

    /**
     * Permanently deletes a comment.
     *
     * @param id - The comment ID.
     */
    deleteComment(id: string): Promise<StatusOk> {
        return request<StatusOk>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_COMMENTS}/remove`,
            apiToken: this.apiToken,
            payload: { id },
            customFetch: this.customFetch,
        }).then((response) => StatusOkSchema.parse(response.data))
    }

    /**
     * Marks the user's read position in a thread. Used to track where the user has read up to,
     * so clients can scroll to this position and show a visual indicator (blue line).
     * Comment IDs are strings.
     *
     * @param args - The arguments for marking read position.
     * @param args.threadId - The thread ID.
     * @param args.commentId - The comment ID to mark as the last read position.
     *
     * @example
     * ```typescript
     * await api.comments.markPosition({ threadId: '7YpL3oZ4kZ9vP7Q1tR2sX3z', commentId: '7YpL3oZ4kZ9vP7Q1tR2sX41' })
     * ```
     */
    markPosition(args: MarkCommentPositionArgs): Promise<StatusOk> {
        return request<StatusOk>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_COMMENTS}/mark_position`,
            apiToken: this.apiToken,
            payload: { threadId: args.threadId, commentId: args.commentId },
            customFetch: this.customFetch,
        }).then((response) => StatusOkSchema.parse(response.data))
    }
}
