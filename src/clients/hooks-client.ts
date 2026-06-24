import { ENDPOINT_HOOKS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import {
    type HookSubscribeResponse,
    HookSubscribeResponseSchema,
    type StatusOk,
    StatusOkSchema,
} from '../types/entities'
import type { SubscribeHookArgs, UnsubscribeHookArgs } from '../types/requests'
import { BaseClient } from './base-client'

/**
 * Client for `/api/v1/hooks/`. REST hooks require Todoist OAuth bearer tokens
 * that include app identity; session tokens are rejected by the backend.
 */
export class HooksClient extends BaseClient {
    /**
     * Subscribes the current OAuth app to a REST hook event.
     *
     * @param args - The hook subscription parameters.
     * @param args.targetUrl - HTTPS endpoint, up to 150 characters, that will receive webhook POSTs.
     * @param args.event - Event name to subscribe to.
     * @param args.workspaceId - Optional workspace filter.
     * @param args.channelId - Optional channel filter.
     * @param args.threadId - Optional thread filter.
     * @param args.conversationId - Optional conversation filter for message events.
     * @returns The `{ status: 'ok', id }` response for the subscription.
     */
    subscribe(args: SubscribeHookArgs): Promise<HookSubscribeResponse> {
        return request<HookSubscribeResponse>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_HOOKS}/subscribe`,
            apiToken: this.apiToken,
            payload: args,
            customFetch: this.customFetch,
        }).then((response) => HookSubscribeResponseSchema.parse(response.data))
    }

    /**
     * Unsubscribes all hooks for the current OAuth app and target URL.
     *
     * @param args - The hook unsubscribe parameters.
     * @param args.targetUrl - Target URL to remove.
     */
    unsubscribe(args: UnsubscribeHookArgs): Promise<StatusOk> {
        return request<StatusOk>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_HOOKS}/unsubscribe`,
            apiToken: this.apiToken,
            payload: args,
            customFetch: this.customFetch,
        }).then((response) => StatusOkSchema.parse(response.data))
    }
}
