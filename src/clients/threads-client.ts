import { z } from 'zod'
import { ENDPOINT_THREADS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import {
    type Comment,
    type StatusOk,
    StatusOkSchema,
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

export const ThreadListSchema = z.array(ThreadSchema)

const GetUnreadResponseSchema = z.object({
    data: z.array(UnreadThreadSchema),
    version: z.number().int(),
    inboxUnread: z.number().int().nullable().optional(),
})

/**
 * Client for `/api/v1/threads/`. The SDK auto-generates the thread `id` on
 * `createThread` when the caller doesn't supply one.
 */
export class ThreadsClient extends BaseClient {
    /**
     * Lists threads. At least one of `channelId` / `workspaceId` is required.
     * `newerThan` / `olderThan` (`Date`) are converted to the
     * `newer_than_ts` / `older_than_ts` epoch-second params on the wire.
     */
    getThreads(args: GetThreadsArgs): Promise<Thread[]> {
        const { newerThan, olderThan, newer_than_ts, older_than_ts, ...rest } = args
        const resolvedNewerThan = newerThan ? Math.floor(newerThan.getTime() / 1000) : newer_than_ts
        const resolvedOlderThan = olderThan ? Math.floor(olderThan.getTime() / 1000) : older_than_ts
        const params = {
            ...rest,
            ...(resolvedNewerThan != null ? { newer_than_ts: resolvedNewerThan } : {}),
            ...(resolvedOlderThan != null ? { older_than_ts: resolvedOlderThan } : {}),
        }

        return request<Thread[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_THREADS}/get`,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => ThreadListSchema.parse(response.data))
    }

    /** Fetches a single thread by ID. */
    getThread(id: string): Promise<Thread> {
        return this.simple('GET', 'getone', { id }, ThreadSchema)
    }

    /** Creates a new thread. `id` is auto-generated if not supplied. */
    createThread(args: CreateThreadArgs): Promise<Thread> {
        return this.simple('POST', 'add', { ...args, id: resolveCreateId(args.id) }, ThreadSchema)
    }

    /** Partial update of an existing thread. */
    updateThread(args: UpdateThreadArgs): Promise<Thread> {
        return this.simple('POST', 'update', { ...args }, ThreadSchema)
    }

    /** Permanently deletes a thread. */
    deleteThread(id: string): Promise<StatusOk> {
        return this.simple('POST', 'remove', { id }, StatusOkSchema)
    }

    /** Saves a thread (formerly "star"). */
    saveThread(id: string): Promise<StatusOk> {
        return this.simple('GET', 'save', { id }, StatusOkSchema)
    }

    /** Unsaves a thread (formerly "unstar"). */
    unsaveThread(id: string): Promise<StatusOk> {
        return this.simple('GET', 'unsave', { id }, StatusOkSchema)
    }

    pinThread(id: string): Promise<StatusOk> {
        return this.simple('GET', 'pin', { id }, StatusOkSchema)
    }

    unpinThread(id: string): Promise<StatusOk> {
        return this.simple('GET', 'unpin', { id }, StatusOkSchema)
    }

    /** Moves a thread to another channel. */
    moveToChannel(args: MoveThreadToChannelArgs): Promise<Thread> {
        return this.simple('GET', 'move_to_channel', { ...args }, ThreadSchema)
    }

    markRead(args: MarkThreadReadArgs): Promise<StatusOk> {
        return this.simple('POST', 'mark_read', { ...args }, StatusOkSchema)
    }

    markUnread(args: MarkThreadUnreadArgs): Promise<StatusOk> {
        return this.simple('POST', 'mark_unread', { ...args }, StatusOkSchema)
    }

    markUnreadForOthers(args: MarkThreadUnreadForOthersArgs): Promise<StatusOk> {
        return this.simple('POST', 'mark_unread_for_others', { ...args }, StatusOkSchema)
    }

    /**
     * Marks every thread in a workspace or channel as read. Exactly one of
     * `workspaceId` / `channelId` should be set.
     */
    markAllRead(args: { workspaceId?: number; channelId?: string }): Promise<StatusOk> {
        if (!args.workspaceId && !args.channelId) {
            throw new Error('Either workspaceId or channelId is required')
        }
        return this.simple('POST', 'mark_all_read', { ...args }, StatusOkSchema)
    }

    clearUnread(workspaceId: number): Promise<StatusOk> {
        return this.simple('GET', 'clear_unread', { workspaceId }, StatusOkSchema)
    }

    /**
     * Returns unread threads for a workspace, paired with the unread version
     * counter and (optionally) the inbox unread count.
     */
    getUnread(workspaceId: number): Promise<{
        data: UnreadThread[]
        version: number
        inboxUnread?: number | null
    }> {
        return this.simple('GET', 'get_unread', { workspaceId }, GetUnreadResponseSchema)
    }

    muteThread(args: MuteThreadArgs): Promise<Thread> {
        return this.simple('GET', 'mute', { ...args }, ThreadSchema)
    }

    unmuteThread(id: string): Promise<Thread> {
        return this.simple('GET', 'unmute', { id }, ThreadSchema)
    }

    closeThread(args: CloseThreadArgs): Promise<Comment> {
        return this.addCommentWithAction(args, 'close')
    }

    reopenThread(args: ReopenThreadArgs): Promise<Comment> {
        return this.addCommentWithAction(args, 'reopen')
    }

    private addCommentWithAction(
        args: CloseThreadArgs | ReopenThreadArgs,
        threadAction: ThreadAction,
    ): Promise<Comment> {
        const { id, ...rest } = args
        return addCommentRequest(
            { baseUri: this.getBaseUri(), apiToken: this.apiToken, customFetch: this.customFetch },
            { threadId: id, ...rest },
            { threadAction },
        )
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
            relativePath: `${ENDPOINT_THREADS}/${suffix}`,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }
}
