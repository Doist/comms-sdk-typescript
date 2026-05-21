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
