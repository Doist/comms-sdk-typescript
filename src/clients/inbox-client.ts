import { z } from 'zod'
import { ENDPOINT_INBOX } from '../consts/endpoints'
import { request } from '../transport/http-client'
import { createInboxThreadSchema, type InboxThread, InboxThreadSchema } from '../types/entities'
import type { ArchiveAllArgs, GetInboxArgs } from '../types/requests'
import { BaseClient } from './base-client'

export const InboxThreadListSchema = z.array(InboxThreadSchema)

type InboxCountResponse = {
    data: number
    version: number
}

/** Client for `/api/v1/inbox/`. */
export class InboxClient extends BaseClient {
    private readonly linkBaseUrl = this.getLinkBaseUrl()
    // Reuse the shared singletons when no custom base is configured.
    private readonly inboxThreadSchema = this.linkBaseUrl
        ? createInboxThreadSchema(this.linkBaseUrl)
        : InboxThreadSchema
    private readonly inboxThreadListSchema = this.linkBaseUrl
        ? z.array(this.inboxThreadSchema)
        : InboxThreadListSchema

    /**
     * Gets inbox items (threads).
     *
     * @param args - The arguments for getting inbox.
     * @param args.workspaceId - The workspace ID.
     * @param args.newerThan - Optional date to get items newer than.
     * @param args.olderThan - Optional date to get items older than.
     * @param args.limit - Optional limit on number of items returned.
     * @param args.cursor - Optional cursor for pagination.
     * @param args.archiveFilter - Optional filter: 'active' (default), 'archived', or 'all'.
     * @returns Inbox threads.
     *
     * @example
     * ```typescript
     * const inbox = await api.inbox.getInbox({
     *   workspaceId: 123,
     *   newerThan: new Date('2024-01-01'),
     * })
     *
     * // Include archived (done) items alongside active ones
     * const allInbox = await api.inbox.getInbox({
     *   workspaceId: 123,
     *   archiveFilter: 'all',
     * })
     * ```
     */
    getInbox(args: GetInboxArgs): Promise<InboxThread[]> {
        const params: Record<string, unknown> = { workspace_id: args.workspaceId }
        if (args.newerThan) params.newer_than_ts = Math.floor(args.newerThan.getTime() / 1000)
        if (args.olderThan) params.older_than_ts = Math.floor(args.olderThan.getTime() / 1000)
        if (args.limit) params.limit = args.limit
        if (args.cursor) params.cursor = args.cursor
        if (args.archiveFilter) params.archive_filter = args.archiveFilter

        return request<InboxThread[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_INBOX}/get`,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => this.inboxThreadListSchema.parse(response.data))
    }

    /**
     * Gets unread count for inbox.
     *
     * @param workspaceId - The workspace ID.
     * @returns The unread count.
     *
     * @example
     * ```typescript
     * const count = await api.inbox.getCount(123)
     * console.log(`Unread items: ${count}`)
     * ```
     */
    getCount(workspaceId: number): Promise<number> {
        return request<InboxCountResponse>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_INBOX}/get_count`,
            apiToken: this.apiToken,
            payload: { workspace_id: workspaceId },
            customFetch: this.customFetch,
        }).then((response) => response.data.data)
    }

    /**
     * Archives a thread in the inbox.
     *
     * @param id - The thread ID.
     *
     * @example
     * ```typescript
     * await api.inbox.archiveThread('7YpL3oZ4kZ9vP7Q1tR2sX3z')
     * ```
     */
    archiveThread(id: string): Promise<void> {
        return request<void>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_INBOX}/archive`,
            apiToken: this.apiToken,
            payload: { id },
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Unarchives a thread in the inbox.
     *
     * @param id - The thread ID.
     *
     * @example
     * ```typescript
     * await api.inbox.unarchiveThread('7YpL3oZ4kZ9vP7Q1tR2sX3z')
     * ```
     */
    unarchiveThread(id: string): Promise<void> {
        return request<void>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_INBOX}/unarchive`,
            apiToken: this.apiToken,
            payload: { id },
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Marks all inbox items as read in a workspace.
     *
     * @param workspaceId - The workspace ID.
     *
     * @example
     * ```typescript
     * await api.inbox.markAllRead(123)
     * ```
     */
    markAllRead(workspaceId: number): Promise<void> {
        return request<void>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_INBOX}/mark_all_read`,
            apiToken: this.apiToken,
            payload: { workspace_id: workspaceId },
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Archives all inbox items in a workspace.
     *
     * @param args - The arguments for archiving all.
     * @param args.workspaceId - The workspace ID.
     * @param args.channelIds - Optional array of channel IDs to filter by.
     * @param args.olderThan - Optional date to filter items older than.
     *
     * @example
     * ```typescript
     * await api.inbox.archiveAll({
     *   workspaceId: 123,
     *   olderThan: new Date('2024-01-01'),
     * })
     * ```
     */
    archiveAll(args: ArchiveAllArgs): Promise<void> {
        const params: Record<string, unknown> = { workspace_id: args.workspaceId }
        if (args.channelIds) params.channel_ids = args.channelIds
        if (args.olderThan) params.older_than_ts = Math.floor(args.olderThan.getTime() / 1000)

        return request<void>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_INBOX}/archive_all`,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then(() => undefined)
    }
}
