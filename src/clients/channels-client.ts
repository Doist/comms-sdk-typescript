import { z } from 'zod'
import { ENDPOINT_CHANNELS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import type { BatchRequestDescriptor } from '../types/batch'
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

const ChannelListSchema = z.array(ChannelSchema)

/**
 * Client for `/api/v3/channels/`. The SDK auto-generates an `id` on
 * `createChannel` when the caller doesn't supply one — pass your own `id`
 * to keep an optimistic-UI ID stable through the round-trip.
 */
export class ChannelsClient extends BaseClient {
    /** Lists channels in a workspace. */
    getChannels(args: GetChannelsArgs, options: { batch: true }): BatchRequestDescriptor<Channel[]>
    getChannels(args: GetChannelsArgs, options?: { batch?: false }): Promise<Channel[]>
    getChannels(
        args: GetChannelsArgs,
        options?: { batch?: boolean },
    ): Promise<Channel[]> | BatchRequestDescriptor<Channel[]> {
        const method = 'GET'
        const url = `${ENDPOINT_CHANNELS}/get`
        if (options?.batch) {
            return { method, url, params: args, schema: ChannelListSchema }
        }
        return request<Channel[]>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: args,
            customFetch: this.customFetch,
        }).then((response) => ChannelListSchema.parse(response.data))
    }

    /** Fetches a single channel by ID. */
    getChannel(id: string, options: { batch: true }): BatchRequestDescriptor<Channel>
    getChannel(id: string, options?: { batch?: false }): Promise<Channel>
    getChannel(
        id: string,
        options?: { batch?: boolean },
    ): Promise<Channel> | BatchRequestDescriptor<Channel> {
        return this.simple('GET', 'getone', { id }, ChannelSchema, options)
    }

    /** Creates a new channel. `id` is auto-generated if not supplied. */
    createChannel(
        args: CreateChannelArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Channel>
    createChannel(args: CreateChannelArgs, options?: { batch?: false }): Promise<Channel>
    createChannel(
        args: CreateChannelArgs,
        options?: { batch?: boolean },
    ): Promise<Channel> | BatchRequestDescriptor<Channel> {
        const params: Record<string, unknown> = { ...args, id: resolveCreateId(args.id) }
        return this.simple('POST', 'add', params, ChannelSchema, options)
    }

    /** Partial update of an existing channel. */
    updateChannel(
        args: UpdateChannelArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Channel>
    updateChannel(args: UpdateChannelArgs, options?: { batch?: false }): Promise<Channel>
    updateChannel(
        args: UpdateChannelArgs,
        options?: { batch?: boolean },
    ): Promise<Channel> | BatchRequestDescriptor<Channel> {
        return this.simple('POST', 'update', { ...args }, ChannelSchema, options)
    }

    /** Updates the channel's view filter (`only_open` / `all` / `only_closed`). */
    updateFilters(
        args: { id: string; filterClosed: 'only_open' | 'all' | 'only_closed' },
        options: { batch: true },
    ): BatchRequestDescriptor<StatusOk>
    updateFilters(
        args: { id: string; filterClosed: 'only_open' | 'all' | 'only_closed' },
        options?: { batch?: false },
    ): Promise<StatusOk>
    updateFilters(
        args: { id: string; filterClosed: 'only_open' | 'all' | 'only_closed' },
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'update_filters', { ...args }, StatusOkSchema, options)
    }

    /** Permanently deletes a channel. */
    deleteChannel(id: string, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    deleteChannel(id: string, options?: { batch?: false }): Promise<StatusOk>
    deleteChannel(
        id: string,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'remove', { id }, StatusOkSchema, options)
    }

    archiveChannel(id: string, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    archiveChannel(id: string, options?: { batch?: false }): Promise<StatusOk>
    archiveChannel(
        id: string,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'archive', { id }, StatusOkSchema, options)
    }

    unarchiveChannel(id: string, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    unarchiveChannel(id: string, options?: { batch?: false }): Promise<StatusOk>
    unarchiveChannel(
        id: string,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'unarchive', { id }, StatusOkSchema, options)
    }

    favoriteChannel(id: string, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    favoriteChannel(id: string, options?: { batch?: false }): Promise<StatusOk>
    favoriteChannel(
        id: string,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'favorite', { id }, StatusOkSchema, options)
    }

    unfavoriteChannel(id: string, options: { batch: true }): BatchRequestDescriptor<StatusOk>
    unfavoriteChannel(id: string, options?: { batch?: false }): Promise<StatusOk>
    unfavoriteChannel(
        id: string,
        options?: { batch?: boolean },
    ): Promise<StatusOk> | BatchRequestDescriptor<StatusOk> {
        return this.simple('POST', 'unfavorite', { id }, StatusOkSchema, options)
    }

    addUser(args: AddChannelUserArgs, options: { batch: true }): BatchRequestDescriptor<Channel>
    addUser(args: AddChannelUserArgs, options?: { batch?: false }): Promise<Channel>
    addUser(
        args: AddChannelUserArgs,
        options?: { batch?: boolean },
    ): Promise<Channel> | BatchRequestDescriptor<Channel> {
        return this.simple('POST', 'add_user', { ...args }, ChannelSchema, options)
    }

    addUsers(args: AddChannelUsersArgs, options: { batch: true }): BatchRequestDescriptor<Channel>
    addUsers(args: AddChannelUsersArgs, options?: { batch?: false }): Promise<Channel>
    addUsers(
        args: AddChannelUsersArgs,
        options?: { batch?: boolean },
    ): Promise<Channel> | BatchRequestDescriptor<Channel> {
        return this.simple('POST', 'add_users', { ...args }, ChannelSchema, options)
    }

    removeUser(
        args: RemoveChannelUserArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Channel>
    removeUser(args: RemoveChannelUserArgs, options?: { batch?: false }): Promise<Channel>
    removeUser(
        args: RemoveChannelUserArgs,
        options?: { batch?: boolean },
    ): Promise<Channel> | BatchRequestDescriptor<Channel> {
        return this.simple('POST', 'remove_user', { ...args }, ChannelSchema, options)
    }

    removeUsers(
        args: RemoveChannelUsersArgs,
        options: { batch: true },
    ): BatchRequestDescriptor<Channel>
    removeUsers(args: RemoveChannelUsersArgs, options?: { batch?: false }): Promise<Channel>
    removeUsers(
        args: RemoveChannelUsersArgs,
        options?: { batch?: boolean },
    ): Promise<Channel> | BatchRequestDescriptor<Channel> {
        return this.simple('POST', 'remove_users', { ...args }, ChannelSchema, options)
    }

    private simple<T>(
        httpMethod: 'GET' | 'POST',
        suffix: string,
        params: Record<string, unknown>,
        schema: z.ZodType<T>,
        options?: { batch?: boolean },
    ): Promise<T> | BatchRequestDescriptor<T> {
        const url = `${ENDPOINT_CHANNELS}/${suffix}`
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
