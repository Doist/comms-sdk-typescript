import { z } from 'zod'
import { ENDPOINT_THREADS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import {
    type Comment,
    CommentSchema,
    createCommentSchema,
    createThreadSchema,
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
    private readonly linkBaseUrl = this.getLinkBaseUrl()
    // Reuse the shared singletons when no custom base is configured.
    private readonly threadSchema = this.linkBaseUrl
        ? createThreadSchema(this.linkBaseUrl)
        : ThreadSchema
    private readonly threadListSchema = this.linkBaseUrl
        ? z.array(this.threadSchema)
        : ThreadListSchema
    private readonly commentSchema = this.linkBaseUrl
        ? createCommentSchema(this.linkBaseUrl)
        : CommentSchema

    /**
     * Gets threads. At least one of `channelId` / `workspaceId` is required.
     * `newerThan` / `olderThan` (`Date`) are converted to the
     * `newer_than_ts` / `older_than_ts` epoch-second params on the wire.
     *
     * @param args - The arguments for getting threads.
     * @param args.workspaceId - The workspace ID.
     * @param args.channelId - Optional channel ID to narrow to a single channel.
     * @param args.archived - Optional flag to include archived threads.
     * @param args.newerThan - Optional date to get threads newer than.
     * @param args.olderThan - Optional date to get threads older than.
     * @param args.limit - Optional limit on number of threads returned.
     * @returns An array of thread objects.
     *
     * @example
     * ```typescript
     * const threads = await api.threads.getThreads({
     *   workspaceId: 123,
     *   channelId: '7YpL3oZ4kZ9vP7Q1tR2sX44',
     * })
     * threads.forEach(t => console.log(t.title))
     * ```
     */
    getThreads(args: GetThreadsArgs): Promise<Thread[]> {
        const params: Record<string, unknown> = { workspaceId: args.workspaceId }
        if (args.channelId != null) params.channelId = args.channelId
        if (args.archived != null) params.archived = args.archived
        if (args.limit != null) params.limit = args.limit
        if (args.newerThan) params.newer_than_ts = Math.floor(args.newerThan.getTime() / 1000)
        if (args.olderThan) params.older_than_ts = Math.floor(args.olderThan.getTime() / 1000)

        return request<Thread[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_THREADS}/get`,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => this.threadListSchema.parse(response.data))
    }

    /**
     * Gets a single thread object by id.
     *
     * @param id - The thread ID.
     * @returns The thread object.
     */
    getThread(id: string): Promise<Thread> {
        return this.simple('GET', 'getone', { id }, this.threadSchema)
    }

    /**
     * Creates a new thread in a channel. `id` is auto-generated if not supplied.
     *
     * @param args - The arguments for creating a thread.
     * @param args.channelId - The channel ID.
     * @param args.title - Optional thread title.
     * @param args.content - The thread content.
     * @param args.recipients - Optional array of user IDs to notify.
     * @param args.groups - Optional array of custom group IDs to notify.
     * @param args.attachments - Optional array of {@link Attachment}s (from `attachments.upload`).
     * @returns The created thread object.
     *
     * @example
     * ```typescript
     * const thread = await api.threads.createThread({
     *   channelId: '7YpL3oZ4kZ9vP7Q1tR2sX44',
     *   title: 'New Feature Discussion',
     *   content: 'Let\'s discuss the new feature...',
     * })
     * ```
     */
    createThread(args: CreateThreadArgs): Promise<Thread> {
        return this.simple(
            'POST',
            'add',
            { ...args, id: resolveCreateId(args.id) },
            this.threadSchema,
        )
    }

    /**
     * Partial update of an existing thread.
     *
     * @param args - The arguments for updating a thread.
     * @param args.id - The thread ID.
     * @param args.title - Optional new thread title.
     * @param args.content - Optional new thread content.
     * @returns The updated thread object.
     */
    updateThread(args: UpdateThreadArgs): Promise<Thread> {
        return this.simple('POST', 'update', { ...args }, this.threadSchema)
    }

    /**
     * Permanently deletes a thread.
     *
     * @param id - The thread ID.
     */
    deleteThread(id: string): Promise<StatusOk> {
        return this.simple('POST', 'remove', { id }, StatusOkSchema)
    }

    /**
     * Saves a thread (formerly "star").
     *
     * @param id - The thread ID.
     */
    saveThread(id: string): Promise<StatusOk> {
        return this.simple('GET', 'save', { id }, StatusOkSchema)
    }

    /**
     * Unsaves a thread (formerly "unstar").
     *
     * @param id - The thread ID.
     */
    unsaveThread(id: string): Promise<StatusOk> {
        return this.simple('GET', 'unsave', { id }, StatusOkSchema)
    }

    /**
     * Pins a thread.
     *
     * @param id - The thread ID.
     */
    pinThread(id: string): Promise<StatusOk> {
        return this.simple('GET', 'pin', { id }, StatusOkSchema)
    }

    /**
     * Unpins a thread.
     *
     * @param id - The thread ID.
     */
    unpinThread(id: string): Promise<StatusOk> {
        return this.simple('GET', 'unpin', { id }, StatusOkSchema)
    }

    /**
     * Moves a thread to another channel.
     *
     * @param args - The arguments for moving a thread.
     * @param args.id - The thread ID.
     * @param args.toChannel - The target channel ID.
     * @returns The updated thread object.
     */
    moveToChannel(args: MoveThreadToChannelArgs): Promise<Thread> {
        return this.simple('GET', 'move_to_channel', { ...args }, this.threadSchema)
    }

    /**
     * Marks a thread as read.
     *
     * @param args - The arguments for marking a thread as read.
     * @param args.id - The thread ID.
     * @param args.objIndex - The index of the last known read message.
     */
    markRead(args: MarkThreadReadArgs): Promise<StatusOk> {
        const { id, ...rest } = args
        return this.simple('POST', 'mark_read', { threadId: id, ...rest }, StatusOkSchema)
    }

    /**
     * Marks a thread as unread.
     *
     * @param args - The arguments for marking a thread as unread.
     * @param args.id - The thread ID.
     * @param args.objIndex - The index of the last unread message. Use -1 to mark the whole thread as unread.
     */
    markUnread(args: MarkThreadUnreadArgs): Promise<StatusOk> {
        const { id, ...rest } = args
        return this.simple('POST', 'mark_unread', { threadId: id, ...rest }, StatusOkSchema)
    }

    /**
     * Marks a thread as unread for others. Useful to notify others about thread changes.
     *
     * @param args - The arguments for marking a thread as unread for others.
     * @param args.id - The thread ID.
     * @param args.objIndex - The index of the last unread message. Use -1 to mark the whole thread as unread.
     */
    markUnreadForOthers(args: MarkThreadUnreadForOthersArgs): Promise<StatusOk> {
        return this.simple('POST', 'mark_unread_for_others', { ...args }, StatusOkSchema)
    }

    /**
     * Marks every thread in a workspace or channel as read. Exactly one of
     * `workspaceId` / `channelId` should be set.
     *
     * @param args - Either workspaceId or channelId (one is required).
     * @param args.workspaceId - The workspace ID.
     * @param args.channelId - The channel ID.
     *
     * @example
     * ```typescript
     * // Mark all in workspace
     * await api.threads.markAllRead({ workspaceId: 123 })
     *
     * // Mark all in channel
     * await api.threads.markAllRead({ channelId: '7YpL3oZ4kZ9vP7Q1tR2sX44' })
     * ```
     */
    markAllRead(args: { workspaceId?: number; channelId?: string }): Promise<StatusOk> {
        if (!args.workspaceId && !args.channelId) {
            throw new Error('Either workspaceId or channelId is required')
        }
        return this.simple('POST', 'mark_all_read', { ...args }, StatusOkSchema)
    }

    /**
     * Clears unread threads in a workspace.
     *
     * @param workspaceId - The workspace ID.
     */
    clearUnread(workspaceId: number): Promise<StatusOk> {
        return this.simple('GET', 'clear_unread', { workspaceId }, StatusOkSchema)
    }

    /**
     * Returns unread threads for a workspace, paired with the unread version
     * counter and (optionally) the inbox unread count.
     *
     * @param workspaceId - The workspace ID.
     * @returns Object containing the array of unread thread references, a version counter, and optionally the inbox unread count.
     */
    getUnread(workspaceId: number): Promise<{
        data: UnreadThread[]
        version: number
        inboxUnread?: number | null
    }> {
        return this.simple('GET', 'get_unread', { workspaceId }, GetUnreadResponseSchema)
    }

    /**
     * Mutes a thread for a specified number of minutes.
     * When muted, you will not get notified in your inbox about new comments.
     *
     * @param args - The arguments for muting a thread.
     * @param args.id - The thread ID.
     * @param args.minutes - Number of minutes to mute the thread.
     * @returns The updated thread object.
     *
     * @example
     * ```typescript
     * const thread = await api.threads.muteThread({ id: '7YpL3oZ4kZ9vP7Q1tR2sX3z', minutes: 30 })
     * ```
     */
    muteThread(args: MuteThreadArgs): Promise<Thread> {
        return this.simple('GET', 'mute', { ...args }, this.threadSchema)
    }

    /**
     * Unmutes a thread.
     * You will start to see notifications in your inbox again when new comments are added.
     *
     * @param id - The thread ID.
     * @returns The updated thread object.
     */
    unmuteThread(id: string): Promise<Thread> {
        return this.simple('GET', 'unmute', { id }, this.threadSchema)
    }

    /**
     * Closes a thread by adding a comment with a close action.
     *
     * @param args - The arguments for closing a thread.
     * @param args.id - The thread ID.
     * @param args.content - The comment content.
     * @param args.attachments - Optional array of {@link Attachment} objects.
     * @param args.actions - Optional array of action objects.
     * @param args.recipients - Optional array of user IDs to notify directly.
     * @param args.groups - Optional array of custom group IDs to notify.
     * @param args.directMentions - Optional array of user IDs that were @-mentioned in
     *   `content`.
     * @param args.notifyAudience - Optional broader audience to notify in addition to
     *   `recipients` and `groups`. `'channel'` notifies everyone in the channel;
     *   `'thread'` notifies everyone who has interacted with the thread.
     * @returns The created comment object.
     *
     * @example
     * ```typescript
     * const comment = await api.threads.closeThread({
     *   id: '7YpL3oZ4kZ9vP7Q1tR2sX3z',
     *   content: 'Closing this thread — resolved.',
     * })
     * ```
     */
    closeThread(args: CloseThreadArgs): Promise<Comment> {
        return this.addCommentWithAction(args, 'close')
    }

    /**
     * Reopens a thread by adding a comment with a reopen action.
     *
     * @param args - The arguments for reopening a thread.
     * @param args.id - The thread ID.
     * @param args.content - The comment content.
     * @param args.attachments - Optional array of {@link Attachment} objects.
     * @param args.actions - Optional array of action objects.
     * @param args.recipients - Optional array of user IDs to notify directly.
     * @param args.groups - Optional array of custom group IDs to notify.
     * @param args.directMentions - Optional array of user IDs that were @-mentioned in
     *   `content`.
     * @param args.notifyAudience - Optional broader audience to notify in addition to
     *   `recipients` and `groups`. `'channel'` notifies everyone in the channel;
     *   `'thread'` notifies everyone who has interacted with the thread.
     * @returns The created comment object.
     *
     * @example
     * ```typescript
     * const comment = await api.threads.reopenThread({
     *   id: '7YpL3oZ4kZ9vP7Q1tR2sX3z',
     *   content: 'Reopening — need further discussion.',
     * })
     * ```
     */
    reopenThread(args: ReopenThreadArgs): Promise<Comment> {
        return this.addCommentWithAction(args, 'reopen')
    }

    private addCommentWithAction(
        args: CloseThreadArgs | ReopenThreadArgs,
        threadAction: ThreadAction,
    ): Promise<Comment> {
        const { id, ...rest } = args
        return addCommentRequest(
            {
                baseUri: this.getBaseUri(),
                apiToken: this.apiToken,
                customFetch: this.customFetch,
                schema: this.commentSchema,
            },
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
