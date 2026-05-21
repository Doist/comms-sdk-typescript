import { z } from 'zod'
import { ENDPOINT_CHANNELS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import { type Channel, ChannelSchema, type StatusOk, StatusOkSchema } from '../types/entities'
import type {
    AddChannelUserArgs,
    AddChannelUsersArgs,
    CreateChannelArgs,
    GetChannelsArgs,
    RemoveChannelUserArgs,
    RemoveChannelUsersArgs,
    UpdateChannelArgs,
} from '../types/requests'
import { resolveCreateId } from '../utils/uuidv7'
import { BaseClient } from './base-client'

export const ChannelListSchema = z.array(ChannelSchema)

/**
 * Client for `/api/v1/channels/`. The SDK auto-generates an `id` on
 * `createChannel` when the caller doesn't supply one — pass your own `id`
 * to keep an optimistic-UI ID stable through the round-trip.
 */
export class ChannelsClient extends BaseClient {
    /** Lists channels in a workspace. */
    getChannels(args: GetChannelsArgs): Promise<Channel[]> {
        return request<Channel[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_CHANNELS}/get`,
            apiToken: this.apiToken,
            payload: args,
            customFetch: this.customFetch,
        }).then((response) => ChannelListSchema.parse(response.data))
    }

    /** Fetches a single channel by ID. */
    getChannel(id: string): Promise<Channel> {
        return this.simple('GET', 'getone', { id }, ChannelSchema)
    }

    /** Creates a new channel. `id` is auto-generated if not supplied. */
    createChannel(args: CreateChannelArgs): Promise<Channel> {
        return this.simple('POST', 'add', { ...args, id: resolveCreateId(args.id) }, ChannelSchema)
    }

    /** Partial update of an existing channel. */
    updateChannel(args: UpdateChannelArgs): Promise<Channel> {
        return this.simple('POST', 'update', { ...args }, ChannelSchema)
    }

    /** Updates the channel's view filter (`only_open` / `all` / `only_closed`). */
    updateFilters(args: {
        id: string
        filterClosed: 'only_open' | 'all' | 'only_closed'
    }): Promise<StatusOk> {
        return this.simple('POST', 'update_filters', { ...args }, StatusOkSchema)
    }

    /** Permanently deletes a channel. */
    deleteChannel(id: string): Promise<StatusOk> {
        return this.simple('POST', 'remove', { id }, StatusOkSchema)
    }

    archiveChannel(id: string): Promise<StatusOk> {
        return this.simple('POST', 'archive', { id }, StatusOkSchema)
    }

    unarchiveChannel(id: string): Promise<StatusOk> {
        return this.simple('POST', 'unarchive', { id }, StatusOkSchema)
    }

    favoriteChannel(id: string): Promise<StatusOk> {
        return this.simple('POST', 'favorite', { id }, StatusOkSchema)
    }

    unfavoriteChannel(id: string): Promise<StatusOk> {
        return this.simple('POST', 'unfavorite', { id }, StatusOkSchema)
    }

    addUser(args: AddChannelUserArgs): Promise<Channel> {
        return this.simple('POST', 'add_user', { ...args }, ChannelSchema)
    }

    addUsers(args: AddChannelUsersArgs): Promise<Channel> {
        return this.simple('POST', 'add_users', { ...args }, ChannelSchema)
    }

    removeUser(args: RemoveChannelUserArgs): Promise<Channel> {
        return this.simple('POST', 'remove_user', { ...args }, ChannelSchema)
    }

    removeUsers(args: RemoveChannelUsersArgs): Promise<Channel> {
        return this.simple('POST', 'remove_users', { ...args }, ChannelSchema)
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
            relativePath: `${ENDPOINT_CHANNELS}/${suffix}`,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }
}
