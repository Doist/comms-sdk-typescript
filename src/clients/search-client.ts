import { ENDPOINT_SEARCH } from '../consts/endpoints'
import { request } from '../transport/http-client'
import {
    type SearchConversationResponse,
    type SearchResponse,
    SearchResultSchema,
    type SearchThreadResponse,
} from '../types/entities'
import type { SearchArgs, SearchConversationArgs, SearchThreadArgs } from '../types/requests'
import { BaseClient } from './base-client'

/**
 * Client for interacting with Comms search endpoints.
 */
export class SearchClient extends BaseClient {
    /**
     * Searches across all threads and conversations in a workspace.
     *
     * @param args - The arguments for searching.
     * @param args.query - The search query string. Optional when `mentionSelf: true` is set; required otherwise.
     * @param args.workspaceId - The workspace ID to search in.
     * @param args.channelIds - Optional array of channel IDs to filter by.
     * @param args.authorIds - Optional array of author user IDs to filter by.
     * @param args.mentionSelf - Optional flag to filter by mentions of the current user. When true, `query` may be omitted.
     * @param args.dateFrom - Optional start date for filtering (YYYY-MM-DD).
     * @param args.dateTo - Optional end date for filtering (YYYY-MM-DD).
     * @param args.limit - Optional limit on number of results returned.
     * @param args.cursor - Optional cursor for pagination.
     * @returns Search results with pagination.
     *
     * @example
     * ```typescript
     * const results = await api.search.search({
     *   query: 'important meeting',
     *   workspaceId: 123,
     * })
     * ```
     */
    search(args: SearchArgs): Promise<SearchResponse> {
        const params: Record<string, unknown> = { workspace_id: args.workspaceId }
        if (args.query !== undefined) params.query = args.query
        if (args.channelIds) params.channel_ids = args.channelIds
        if (args.authorIds) params.author_ids = args.authorIds
        if (args.mentionSelf !== undefined) params.mention_self = args.mentionSelf
        if (args.dateFrom) params.date_from = args.dateFrom
        if (args.dateTo) params.date_to = args.dateTo
        if (args.limit) params.limit = args.limit
        if (args.cursor) params.cursor = args.cursor

        return request<SearchResponse>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: ENDPOINT_SEARCH,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => ({
            ...response.data,
            items: response.data.items.map((result) => SearchResultSchema.parse(result)),
        }))
    }

    /**
     * Searches within comments of a specific thread.
     *
     * @param args - The arguments for searching within a thread.
     * @param args.query - The search query string.
     * @param args.threadId - The thread ID to search in.
     * @param args.limit - Optional limit on number of results returned.
     * @param args.cursor - Optional cursor for pagination.
     * @returns Comment IDs that match the search query.
     *
     * @example
     * ```typescript
     * const results = await api.search.searchThread({
     *   query: 'deadline',
     *   threadId: '7YpL3oZ4kZ9vP7Q1tR2sX3z',
     * })
     * ```
     */
    searchThread(args: SearchThreadArgs): Promise<SearchThreadResponse> {
        const params: Record<string, unknown> = {
            query: args.query,
            thread_id: args.threadId,
        }
        if (args.limit) params.limit = args.limit
        if (args.cursor) params.cursor = args.cursor

        return request<SearchThreadResponse>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_SEARCH}/thread`,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }

    /**
     * Searches within messages of a specific conversation.
     *
     * @param args - The arguments for searching within a conversation.
     * @param args.query - The search query string.
     * @param args.conversationId - The conversation ID to search in.
     * @param args.limit - Optional limit on number of results returned.
     * @param args.cursor - Optional cursor for pagination.
     * @returns Message IDs that match the search query.
     *
     * @example
     * ```typescript
     * const results = await api.search.searchConversation({
     *   query: 'budget',
     *   conversationId: '7YpL3oZ4kZ9vP7Q1tR2sX42',
     * })
     * ```
     */
    searchConversation(args: SearchConversationArgs): Promise<SearchConversationResponse> {
        const params: Record<string, unknown> = {
            query: args.query,
            conversation_id: args.conversationId,
        }
        if (args.limit) params.limit = args.limit
        if (args.cursor) params.cursor = args.cursor

        return request<SearchConversationResponse>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_SEARCH}/conversation`,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => response.data)
    }
}
