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
     * Lists comments in a thread. `newerThan` / `olderThan` (`Date`) are
     * converted to `newer_than_ts` / `older_than_ts` epoch seconds on the
     * wire.
     */
    getComments(args: GetCommentsArgs): Promise<Comment[]> {
        const params: Record<string, unknown> = { threadId: args.threadId }
        const newerThan = args.newerThan ?? args.from
        if (newerThan) params.newerThanTs = Math.floor(newerThan.getTime() / 1000)
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

    /** Fetches a single comment by ID. The API wraps it in `{comment: ...}`. */
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
     * Creates a new comment. `id` is auto-generated if not supplied.
     */
    createComment(args: CreateCommentArgs): Promise<Comment> {
        return addCommentRequest(
            { baseUri: this.getBaseUri(), apiToken: this.apiToken, customFetch: this.customFetch },
            args,
        )
    }

    /** Updates a comment. */
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

    /** Permanently deletes a comment. */
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
     * Marks the user's read position in a thread. Comment IDs are strings.
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
