import { ENDPOINT_COMMENTS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import { type Comment, type createCommentSchema } from '../types/entities'
import type { CustomFetch } from '../types/http'
import type { CreateCommentArgs, ThreadAction } from '../types/requests'
import { resolveCreateId, resolveReferenceId } from '../utils/uuidv7'
import { applyNotifyAudience } from './notify-audience'

type ClientContext = {
    baseUri: string
    apiToken: string
    customFetch?: CustomFetch
    /** Per-client Comment schema, base-bound for the returned comment's web `url`. */
    schema: ReturnType<typeof createCommentSchema>
}

/**
 * Internal helper that powers `comments.createComment`,
 * `threads.closeThread`, and `threads.reopenThread`.
 *
 * Normalizes the `notifyAudience` flag into a sentinel `groups` entry,
 * rejects sentinel IDs passed via `groups` / `directGroupMentions`, mints a
 * UUIDv7 `id` when the caller omits one, and posts to `/comments/add`. When
 * `threadAction` is set (`'close'` / `'reopen'`), it is forwarded on the
 * wire so the same request both adds the comment and transitions the
 * parent thread.
 *
 * @param context - Per-call client context (base URI, API token, optional `customFetch`).
 * @param params - The comment payload (`{@link CreateCommentArgs}`).
 * @param options - Optional configuration.
 * @param options.threadAction - When set, also transitions the parent thread (`'close'` or `'reopen'`).
 * @returns The parsed {@link Comment} returned by the API.
 */
export function addCommentRequest(
    context: ClientContext,
    params: CreateCommentArgs,
    options?: { threadAction?: ThreadAction },
): Promise<Comment> {
    const normalized = applyNotifyAudience(params)
    const withId = {
        ...normalized,
        id: resolveCreateId(normalized.id),
        threadId: resolveReferenceId(normalized.threadId, 'threadId'),
    }
    const payload = options?.threadAction
        ? { ...withId, threadAction: options.threadAction }
        : withId

    return request<Comment>({
        httpMethod: 'POST',
        baseUri: context.baseUri,
        relativePath: `${ENDPOINT_COMMENTS}/add`,
        apiToken: context.apiToken,
        payload,
        customFetch: context.customFetch,
    }).then((response) => context.schema.parse(response.data))
}
