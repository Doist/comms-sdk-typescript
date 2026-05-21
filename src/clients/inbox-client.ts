import { ENDPOINT_INBOX } from '../consts/endpoints'
import { request } from '../transport/http-client'
import { type InboxThread, InboxThreadSchema } from '../types/entities'
import type { ArchiveAllArgs, GetInboxArgs } from '../types/requests'
import { BaseClient } from './base-client'

type InboxCountResponse = {
    data: number
    version: number
}

/** Client for `/api/v1/inbox/`. */
export class InboxClient extends BaseClient {
    /**
     * Gets inbox items (threads).
     */
    getInbox(args: GetInboxArgs): Promise<InboxThread[]> {
        const params: Record<string, unknown> = { workspace_id: args.workspaceId }
        const newerThan = args.newerThan ?? args.since
        if (newerThan) params.newer_than_ts = Math.floor(newerThan.getTime() / 1000)
        const olderThan = args.olderThan ?? args.until
        if (olderThan) params.older_than_ts = Math.floor(olderThan.getTime() / 1000)
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
        }).then((response) => response.data.map((thread) => InboxThreadSchema.parse(thread)))
    }

    /** Gets unread count for inbox. */
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

    /** Archives a thread in the inbox. */
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

    /** Unarchives a thread in the inbox. */
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

    /** Marks all inbox items as read in a workspace. */
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

    /** Archives all inbox items in a workspace. */
    archiveAll(args: ArchiveAllArgs): Promise<void> {
        const params: Record<string, unknown> = { workspace_id: args.workspaceId }
        if (args.channelIds) params.channel_ids = args.channelIds
        const olderThan = args.olderThan ?? args.until
        if (olderThan) params.older_than_ts = Math.floor(olderThan.getTime() / 1000)

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
