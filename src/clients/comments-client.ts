import { z } from 'zod'
import { ENDPOINT_COMMENTS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import type { BatchRequestDescriptor } from '../types/batch'
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
 * Client for `/api/v3/comments/`. The SDK auto-generates the comment `id`
 * on `createComment` when the caller doesn't supply one.
 */
export class CommentsClient extends BaseClient {
    /**
     * Lists comments in a thread. `newerThan` / `olderThan` (`Date`) are
     * converted to `newer_than_ts` / `older_than_ts` epoch seconds on the
     * wire.
     */
    getComments(args: GetCommentsArgs, options: { batch: true }): BatchRequestDescriptor<Comment[]>
    getComments(args: GetCommentsArgs, options?: { batch?: false }): Promise<Comment[]>
    getComments(
        args: GetCommentsArgs,
        options?: { batch?: boolean },
    ): Promise<Comment[]> | BatchRequestDescriptor<Comment[]> {
        const params: Record<string, unknown> = { threadId: args.threadId }

        const newerThan = args.newerThan ?? args.from
        if (newerThan) params.newerThanTs = Math.floor(newerThan.getTime() / 1000)
        if (args.olderThan) params.olderThanTs = Math.floor(args.olderThan.getTime() / 1000)
        if (args.limit) params.limit = args.limit

        const method = 'GET'
        const url = `${ENDPOINT_COMMENTS}/get`

        if (options?.batch) {
            return { method, url, params, schema: CommentListSchema }
        }

        return request<Comment[]>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => CommentListSchema.parse(response.data))
    }

    /** Fetches a single comment by ID. The API wraps it in `{comment: ...}`. */
    getComment(id: string, options: { batch: true }): BatchRequestDescriptor<Comment>
    getComment(id: string, options?: { batch?: false }): Promise<Comment>
    getComment(
        id: string,
        options?: { batch?: boolean },
    ): Promise<Comment> | BatchRequestDescriptor<Comment> {
        const method = 'GET'
        const url = `${ENDPOINT_COMMENTS}/getone`
        const params = { id }
        const wrappedSchema = z.object({ comment: CommentSchema }).transform((data) => data.comment)

        if (options?.batch) {
            return { method, url, params, schema: wrappedSchema }
        }

        return request<Comment>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => wrappedSchema.parse(response.data))
    }

    /**
     * Creates a new comment. `id` is auto-generated if not supplied.
     */
    createComment(
        args: CreateCommentArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Comment>
    createComment(args: CreateCommentArgs, options?: { batch?: false }): Promise<Comment>
    createComment(
        args: CreateCommentArgs,
        options?: { batch?: boolean },
    ): Promise<Comment> | BatchRequestDescriptor<Comment> {
        return addCommentRequest(
            { baseUri: this.getBaseUri(), apiToken: this.apiToken, customFetch: this.customFetch },
            args,
            options,
        )
    }

    /** Updates a comment. */
    updateComment(
        args: UpdateCommentArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Comment>
    updateComment(args: UpdateCommentArgs, options?: { batch?: false }): Promise<Comment>
    updateComment(
        args: UpdateCommentArgs,
        options?: { batch?: boolean },
    ): Promise<Comment> | BatchRequestDescriptor<Comment> {
        const method = 'POST'
        const url = `${ENDPOINT_COMMENTS}/update`
        const params = { ...args }
        const schema = CommentSchema

        if (options?.batch) {
            return { method, url, params, schema }
        }

        return request<Comment>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }

    /** Permanently deletes a comment. */
    deleteComment(id: string, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    deleteComment(id: string, options?: { batch?: false }): Promise<StatusOk>
    deleteComment(
        id: string,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        const method = 'POST'
        const url = `${ENDPOINT_COMMENTS}/remove`
        const params = { id }

        if (options?.batch) {
            return { method, url, params, schema: StatusOkSchema }
        }

        return request<StatusOk>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => StatusOkSchema.parse(response.data))
    }

    /**
     * Marks the user's read position in a thread. Comment IDs are strings.
     */
    markPosition(
        args: MarkCommentPositionArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<StatusOk>
    markPosition(args: MarkCommentPositionArgs, options?: { batch?: false }): Promise<StatusOk>
    markPosition(
        args: MarkCommentPositionArgs,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        const method = 'POST'
        const url = `${ENDPOINT_COMMENTS}/mark_position`
        const params = { threadId: args.threadId, commentId: args.commentId }

        if (options?.batch) {
            return { method, url, params, schema: StatusOkSchema }
        }

        return request<StatusOk>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => StatusOkSchema.parse(response.data))
    }
}
