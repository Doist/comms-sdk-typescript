import { z } from 'zod'
import { ENDPOINT_INBOX } from '../consts/endpoints'
import { request } from '../transport/http-client'
import type { BatchRequestDescriptor } from '../types/batch'
import { type InboxThread, InboxThreadSchema } from '../types/entities'
import type { ArchiveAllArgs, GetInboxArgs } from '../types/requests'
import { BaseClient } from './base-client'

type InboxCountResponse = {
    data: number
    version: number
}

/** Client for `/api/v3/inbox/`. */
export class InboxClient extends BaseClient {
    /**
     * Gets inbox items (threads).
     *
     * @param args - The arguments for getting inbox.
     * @param args.workspaceId - The workspace ID.
     * @param args.newerThan - Optional date to get items newer than.
     * @param args.olderThan - Optional date to get items older than.
     * @param args.since - @deprecated Use `newerThan` instead.
     * @param args.until - @deprecated Use `olderThan` instead.
     * @param args.limit - Optional limit on number of items returned.
     * @param args.cursor - Optional cursor for pagination.
     * @param args.archiveFilter - Optional filter: 'active' (default), 'archived', or 'all'.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns Inbox threads.
     *
     * @example
     * ```typescript
     * const inbox = await api.inbox.getInbox({
     *   workspaceId: 123,
     *   newerThan: new Date('2024-01-01')
     * })
     *
     * // Include archived (done) items alongside active ones
     * const allInbox = await api.inbox.getInbox({
     *   workspaceId: 123,
     *   archiveFilter: 'all'
     * })
     * ```
     */
    getInbox(args: GetInboxArgs, options: { batch: true }): BatchRequestDescriptor<InboxThread[]>
    getInbox(args: GetInboxArgs, options?: { batch?: false }): Promise<InboxThread[]>
    getInbox(
        args: GetInboxArgs,
        options?: { batch?: boolean },
    ): Promise<InboxThread[]> | BatchRequestDescriptor<InboxThread[]> {
        const params: Record<string, unknown> = {
            workspace_id: args.workspaceId,
        }

        const newerThan = args.newerThan ?? args.since
        if (newerThan) params.newer_than_ts = Math.floor(newerThan.getTime() / 1000)
        const olderThan = args.olderThan ?? args.until
        if (olderThan) params.older_than_ts = Math.floor(olderThan.getTime() / 1000)
        if (args.limit) params.limit = args.limit
        if (args.cursor) params.cursor = args.cursor
        if (args.archiveFilter) params.archive_filter = args.archiveFilter

        const method = 'GET'
        const url = `${ENDPOINT_INBOX}/get`

        if (options?.batch) {
            return { method, url, params, schema: z.array(InboxThreadSchema) }
        }

        return request<InboxThread[]>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => response.data.map((thread) => InboxThreadSchema.parse(thread)))
    }

    /**
     * Gets unread count for inbox.
     *
     * @param workspaceId - The workspace ID.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns The unread count.
     *
     * @example
     * ```typescript
     * const count = await api.inbox.getCount(123)
     * console.log(`Unread items: ${count}`)
     * ```
     */
    getCount(workspaceId: number, options: { batch: true }): BatchRequestDescriptor<number>
    getCount(workspaceId: number, options?: { batch?: false }): Promise<number>
    getCount(
        workspaceId: number,
        options?: { batch?: boolean },
    ): Promise<number> | BatchRequestDescriptor<number> {
        const method = 'GET'
        const url = `${ENDPOINT_INBOX}/get_count`
        const params = { workspace_id: workspaceId }

        if (options?.batch) {
            return { method, url, params }
        }

        return request<InboxCountResponse>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => response.data.data)
    }

    /**
     * Archives a thread in the inbox.
     *
     * @param id - The thread ID.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     *
     * @example
     * ```typescript
     * await api.inbox.archiveThread(456)
     * ```
     */
    archiveThread(id: string, options: { batch: true }): BatchRequestDescriptor<void>
    archiveThread(id: string, options?: { batch?: false }): Promise<void>
    archiveThread(
        id: string,
        options?: { batch?: boolean },
    ): Promise<void> | BatchRequestDescriptor<void> {
        const method = 'POST'
        const url = `${ENDPOINT_INBOX}/archive`
        const params = { id }

        if (options?.batch) {
            return { method, url, params }
        }

        return request<void>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Unarchives a thread in the inbox.
     *
     * @param id - The thread ID.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     *
     * @example
     * ```typescript
     * await api.inbox.unarchiveThread(456)
     * ```
     */
    unarchiveThread(id: string, options: { batch: true }): BatchRequestDescriptor<void>
    unarchiveThread(id: string, options?: { batch?: false }): Promise<void>
    unarchiveThread(
        id: string,
        options?: { batch?: boolean },
    ): Promise<void> | BatchRequestDescriptor<void> {
        const method = 'POST'
        const url = `${ENDPOINT_INBOX}/unarchive`
        const params = { id }

        if (options?.batch) {
            return { method, url, params }
        }

        return request<void>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Marks all inbox items as read in a workspace.
     *
     * @param workspaceId - The workspace ID.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     *
     * @example
     * ```typescript
     * await api.inbox.markAllRead(123)
     * ```
     */
    markAllRead(workspaceId: number, options: { batch: true }): BatchRequestDescriptor<void>
    markAllRead(workspaceId: number, options?: { batch?: false }): Promise<void>
    markAllRead(
        workspaceId: number,
        options?: { batch?: boolean },
    ): Promise<void> | BatchRequestDescriptor<void> {
        const method = 'POST'
        const url = `${ENDPOINT_INBOX}/mark_all_read`
        const params = { workspace_id: workspaceId }

        if (options?.batch) {
            return { method, url, params }
        }

        return request<void>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
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
     * @param args.until - @deprecated Use `olderThan` instead.
     * @param args.since - @deprecated Not supported by the archive_all endpoint — this value is ignored.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     *
     * @example
     * ```typescript
     * await api.inbox.archiveAll({
     *   workspaceId: 123,
     *   olderThan: new Date('2024-01-01')
     * })
     * ```
     */
    archiveAll(args: ArchiveAllArgs, options: { batch: true }): BatchRequestDescriptor<void>
    archiveAll(args: ArchiveAllArgs, options?: { batch?: false }): Promise<void>
    archiveAll(
        args: ArchiveAllArgs,
        options?: { batch?: boolean },
    ): Promise<void> | BatchRequestDescriptor<void> {
        const params: Record<string, unknown> = {
            workspace_id: args.workspaceId,
        }

        if (args.channelIds) params.channel_ids = args.channelIds
        const olderThan = args.olderThan ?? args.until
        if (olderThan) params.older_than_ts = Math.floor(olderThan.getTime() / 1000)

        const method = 'POST'
        const url = `${ENDPOINT_INBOX}/archive_all`

        if (options?.batch) {
            return { method, url, params }
        }

        return request<void>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then(() => undefined)
    }
}
