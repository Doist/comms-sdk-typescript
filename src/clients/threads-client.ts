import { z } from 'zod'
import { ENDPOINT_THREADS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import type { BatchRequestDescriptor } from '../types/batch'
import {
    type Comment,
    type Thread,
    ThreadSchema,
    type UnreadThread,
    UnreadThreadSchema,
} from '../types/entities'
import type {
    CloseThreadArgs,
    CreateThreadArgs,
    GetThreadsArgs,
    MarkThreadReadArgs,
    MarkThreadUnreadArgs,
    MarkThreadUnreadForOthersArgs,
    MoveThreadToChannelArgs,
    MuteThreadArgs,
    ReopenThreadArgs,
    ThreadAction,
    UpdateThreadArgs,
} from '../types/requests'
import { resolveCreateId } from '../utils/uuidv7'
import { addCommentRequest } from './add-comment-helper'
import { BaseClient } from './base-client'

const StatusOkSchema = z.object({ status: z.string() })
type StatusOk = z.infer<typeof StatusOkSchema>

const GetUnreadResponseSchema = z.object({
    data: z.array(UnreadThreadSchema),
    version: z.number().int(),
    inboxUnread: z.number().int().nullable().optional(),
})

/**
 * Client for `/api/v3/threads/`.
 *
 * Thread IDs and channel IDs are base58-encoded UUIDv7 strings. The SDK
 * auto-generates the thread `id` on `createThread` when the caller doesn't
 * supply one. `is_starred` / `star` are gone — use `save` / `unsave` (a.k.a.
 * `isSaved` in JSON).
 */
export class ThreadsClient extends BaseClient {
    /**
     * Lists threads. At least one of `channelId` / `workspaceId` is required.
     * `newerThan` / `olderThan` (`Date`) are converted to the
     * `newer_than_ts` / `older_than_ts` epoch-second params on the wire.
     */
    getThreads(args: GetThreadsArgs, options: { batch: true }): BatchRequestDescriptor<Thread[]>
    getThreads(args: GetThreadsArgs, options?: { batch?: false }): Promise<Thread[]>
    getThreads(
        args: GetThreadsArgs,
        options?: { batch?: boolean },
    ): Promise<Thread[]> | BatchRequestDescriptor<Thread[]> {
        const method = 'GET'
        const url = `${ENDPOINT_THREADS}/get`
        const { newerThan, olderThan, newer_than_ts, older_than_ts, ...rest } = args
        const resolvedNewerThan = newerThan ? Math.floor(newerThan.getTime() / 1000) : newer_than_ts
        const resolvedOlderThan = olderThan ? Math.floor(olderThan.getTime() / 1000) : older_than_ts
        const params = {
            ...rest,
            ...(resolvedNewerThan != null ? { newer_than_ts: resolvedNewerThan } : {}),
            ...(resolvedOlderThan != null ? { older_than_ts: resolvedOlderThan } : {}),
        }

        if (options?.batch) {
            return { method, url, params, schema: z.array(ThreadSchema) }
        }

        return request<Thread[]>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => response.data.map((thread) => ThreadSchema.parse(thread)))
    }

    /** Fetches a single thread by ID. */
    getThread(id: string, options: { batch: true }): BatchRequestDescriptor<Thread>
    getThread(id: string, options?: { batch?: false }): Promise<Thread>
    getThread(
        id: string,
        options?: { batch?: boolean },
    ): Promise<Thread> | BatchRequestDescriptor<Thread> {
        return this.simple('GET', 'getone', { id }, ThreadSchema, options)
    }

    /** Creates a new thread. `id` is auto-generated if not supplied. */
    createThread(args: CreateThreadArgs, options: { batch: true }): BatchRequestDescriptor<Thread>
    createThread(args: CreateThreadArgs, options?: { batch?: false }): Promise<Thread>
    createThread(
        args: CreateThreadArgs,
        options?: { batch?: boolean },
    ): Promise<Thread> | BatchRequestDescriptor<Thread> {
        const params = { ...args, id: resolveCreateId(args.id) }
        return this.simple('POST', 'add', params, ThreadSchema, options)
    }

    /** Partial update of an existing thread. */
    updateThread(args: UpdateThreadArgs, options: { batch: true }): BatchRequestDescriptor<Thread>
    updateThread(args: UpdateThreadArgs, options?: { batch?: false }): Promise<Thread>
    updateThread(
        args: UpdateThreadArgs,
        options?: { batch?: boolean },
    ): Promise<Thread> | BatchRequestDescriptor<Thread> {
        return this.simple('POST', 'update', { ...args }, ThreadSchema, options)
    }

    /** Permanently deletes a thread. */
    deleteThread(id: string, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    deleteThread(id: string, options?: { batch?: false }): Promise<StatusOk>
    deleteThread(
        id: string,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'remove', { id }, StatusOkSchema, options)
    }

    /** Saves a thread (formerly "star"). */
    saveThread(id: string, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    saveThread(id: string, options?: { batch?: false }): Promise<StatusOk>
    saveThread(
        id: string,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('GET', 'save', { id }, StatusOkSchema, options)
    }

    /** Unsaves a thread (formerly "unstar"). */
    unsaveThread(id: string, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    unsaveThread(id: string, options?: { batch?: false }): Promise<StatusOk>
    unsaveThread(
        id: string,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('GET', 'unsave', { id }, StatusOkSchema, options)
    }

    pinThread(id: string, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    pinThread(id: string, options?: { batch?: false }): Promise<StatusOk>
    pinThread(
        id: string,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('GET', 'pin', { id }, StatusOkSchema, options)
    }

    unpinThread(id: string, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    unpinThread(id: string, options?: { batch?: false }): Promise<StatusOk>
    unpinThread(
        id: string,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('GET', 'unpin', { id }, StatusOkSchema, options)
    }

    /** Moves a thread to another channel. */
    moveToChannel(
        args: MoveThreadToChannelArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Thread>
    moveToChannel(args: MoveThreadToChannelArgs, options?: { batch?: false }): Promise<Thread>
    moveToChannel(
        args: MoveThreadToChannelArgs,
        options?: { batch?: boolean },
    ): Promise<Thread> | BatchRequestDescriptor<Thread> {
        return this.simple('GET', 'move_to_channel', { ...args }, ThreadSchema, options)
    }

    markRead(args: MarkThreadReadArgs, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    markRead(args: MarkThreadReadArgs, options?: { batch?: false }): Promise<StatusOk>
    markRead(
        args: MarkThreadReadArgs,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'mark_read', { ...args }, StatusOkSchema, options)
    }

    markUnread(
        args: MarkThreadUnreadArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<StatusOk>
    markUnread(args: MarkThreadUnreadArgs, options?: { batch?: false }): Promise<StatusOk>
    markUnread(
        args: MarkThreadUnreadArgs,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'mark_unread', { ...args }, StatusOkSchema, options)
    }

    markUnreadForOthers(
        args: MarkThreadUnreadForOthersArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<StatusOk>
    markUnreadForOthers(
        args: MarkThreadUnreadForOthersArgs,
        options?: { batch?: false },
    ): Promise<StatusOk>
    markUnreadForOthers(
        args: MarkThreadUnreadForOthersArgs,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'mark_unread_for_others', { ...args }, StatusOkSchema, options)
    }

    /**
     * Marks every thread in a workspace or channel as read. Exactly one of
     * `workspaceId` / `channelId` should be set.
     */
    markAllRead(
        args: { workspaceId?: number; channelId?: string },
        options: { batch: true },
    ): BatchRequestDescriptor<StatusOk>
    markAllRead(
        args: { workspaceId?: number; channelId?: string },
        options?: { batch?: false },
    ): Promise<StatusOk>
    markAllRead(
        args: { workspaceId?: number; channelId?: string },
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        if (!args.workspaceId && !args.channelId) {
            throw new Error('Either workspaceId or channelId is required')
        }
        return this.simple('POST', 'mark_all_read', { ...args }, StatusOkSchema, options)
    }

    clearUnread(workspaceId: number, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    clearUnread(workspaceId: number, options?: { batch?: false }): Promise<StatusOk>
    clearUnread(
        workspaceId: number,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('GET', 'clear_unread', { workspaceId }, StatusOkSchema, options)
    }

    /**
     * Returns unread threads for a workspace, paired with the unread version
     * counter and (optionally) the inbox unread count.
     */
    getUnread(
        workspaceId: number,
        options: { batch: true },
    ): BatchRequestDescriptor<{
        data: UnreadThread[]
        version: number
        inboxUnread?: number | null
    }>
    getUnread(
        workspaceId: number,
        options?: { batch?: false },
    ): Promise<{ data: UnreadThread[]; version: number; inboxUnread?: number | null }>
    getUnread(
        workspaceId: number,
        options?: { batch?: boolean },
    ):
        | Promise<{ data: UnreadThread[]; version: number; inboxUnread?: number | null }>
        | BatchRequestDescriptor<{
              data: UnreadThread[]
              version: number
              inboxUnread?: number | null
          }> {
        return this.simple('GET', 'get_unread', { workspaceId }, GetUnreadResponseSchema, options)
    }

    muteThread(args: MuteThreadArgs, options: { batch: true }): BatchRequestDescriptor<Thread>
    muteThread(args: MuteThreadArgs, options?: { batch?: false }): Promise<Thread>
    muteThread(
        args: MuteThreadArgs,
        options?: { batch?: boolean },
    ): Promise<Thread> | BatchRequestDescriptor<Thread> {
        return this.simple('GET', 'mute', { ...args }, ThreadSchema, options)
    }

    unmuteThread(id: string, options: { batch: true }): BatchRequestDescriptor<Thread>
    unmuteThread(id: string, options?: { batch?: false }): Promise<Thread>
    unmuteThread(
        id: string,
        options?: { batch?: boolean },
    ): Promise<Thread> | BatchRequestDescriptor<Thread> {
        return this.simple('GET', 'unmute', { id }, ThreadSchema, options)
    }

    closeThread(args: CloseThreadArgs, options: { batch: true }): BatchRequestDescriptor<Comment>
    closeThread(args: CloseThreadArgs, options?: { batch?: false }): Promise<Comment>
    closeThread(
        args: CloseThreadArgs,
        options?: { batch?: boolean },
    ): Promise<Comment> | BatchRequestDescriptor<Comment> {
        return this.addCommentWithAction(args, 'close', options)
    }

    reopenThread(args: ReopenThreadArgs, options: { batch: true }): BatchRequestDescriptor<Comment>
    reopenThread(args: ReopenThreadArgs, options?: { batch?: false }): Promise<Comment>
    reopenThread(
        args: ReopenThreadArgs,
        options?: { batch?: boolean },
    ): Promise<Comment> | BatchRequestDescriptor<Comment> {
        return this.addCommentWithAction(args, 'reopen', options)
    }

    private addCommentWithAction(
        args: CloseThreadArgs | ReopenThreadArgs,
        threadAction: ThreadAction,
        options?: { batch?: boolean },
    ): Promise<Comment> | BatchRequestDescriptor<Comment> {
        const { id, ...rest } = args
        return addCommentRequest(
            { baseUri: this.getBaseUri(), apiToken: this.apiToken, customFetch: this.customFetch },
            { threadId: id, ...rest },
            { ...options, threadAction },
        )
    }

    private simple<T>(
        httpMethod: 'GET' | 'POST',
        suffix: string,
        params: Record<string, unknown>,
        schema: z.ZodType<T>,
        options?: { batch?: boolean },
    ): Promise<T> | BatchRequestDescriptor<T> {
        const url = `${ENDPOINT_THREADS}/${suffix}`
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
