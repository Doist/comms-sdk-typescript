import { z } from 'zod'
import { ENDPOINT_CHANNELS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import {
    type Channel,
    ChannelSchema,
    createChannelSchema,
    type StatusOk,
    StatusOkSchema,
} from '../types/entities'
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
    private readonly channelSchema = createChannelSchema(this.getLinkBaseUrl())
    private readonly channelListSchema = z.array(this.channelSchema)

    /**
     * Gets all channels for a given workspace.
     *
     * @param args - The arguments for getting channels.
     * @param args.workspaceId - The workspace ID.
     * @param args.archived - Optional flag to include archived channels.
     * @returns An array of channel objects.
     *
     * @example
     * ```typescript
     * const channels = await api.channels.getChannels({ workspaceId: 123 })
     * channels.forEach(ch => console.log(ch.name))
     * ```
     */
    getChannels(args: GetChannelsArgs): Promise<Channel[]> {
        return request<Channel[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_CHANNELS}/get`,
            apiToken: this.apiToken,
            payload: args,
            customFetch: this.customFetch,
        }).then((response) => this.channelListSchema.parse(response.data))
    }

    /**
     * Gets a single channel object by id.
     *
     * @param id - The channel ID.
     * @returns The channel object.
     */
    getChannel(id: string): Promise<Channel> {
        return this.simple('GET', 'getone', { id }, this.channelSchema)
    }

    /**
     * Creates a new channel. `id` is auto-generated if not supplied — pass your
     * own `id` to keep an optimistic-UI ID stable through the round-trip.
     *
     * @param args - The arguments for creating a channel.
     * @param args.workspaceId - The workspace ID.
     * @param args.name - The channel name.
     * @param args.description - Optional channel description.
     * @param args.color - Optional channel color.
     * @param args.userIds - Optional array of user IDs to add to the channel.
     * @param args.public - Optional flag to make the channel public.
     * @returns The created channel object.
     *
     * @example
     * ```typescript
     * const channel = await api.channels.createChannel({
     *   workspaceId: 123,
     *   name: 'Engineering',
     *   description: 'Engineering team channel',
     * })
     * ```
     */
    createChannel(args: CreateChannelArgs): Promise<Channel> {
        return this.simple(
            'POST',
            'add',
            { ...args, id: resolveCreateId(args.id) },
            this.channelSchema,
        )
    }

    /**
     * Partial update of an existing channel.
     *
     * @param args - The arguments for updating a channel.
     * @param args.id - The channel ID.
     * @param args.name - Optional new channel name.
     * @param args.description - Optional new channel description.
     * @param args.color - Optional new channel color.
     * @param args.public - Optional flag to change channel visibility.
     * @returns The updated channel object.
     */
    updateChannel(args: UpdateChannelArgs): Promise<Channel> {
        return this.simple('POST', 'update', { ...args }, this.channelSchema)
    }

    /**
     * Updates the channel's view filter (`only_open` / `all` / `only_closed`).
     *
     * @param args - The arguments for updating the channel filter.
     * @param args.id - The channel ID.
     * @param args.filterClosed - The new filter value.
     */
    updateFilters(args: {
        id: string
        filterClosed: 'only_open' | 'all' | 'only_closed'
    }): Promise<StatusOk> {
        return this.simple('POST', 'update_filters', { ...args }, StatusOkSchema)
    }

    /**
     * Permanently deletes a channel.
     *
     * @param id - The channel ID.
     */
    deleteChannel(id: string): Promise<StatusOk> {
        return this.simple('POST', 'remove', { id }, StatusOkSchema)
    }

    /**
     * Archives a channel.
     *
     * @param id - The channel ID.
     */
    archiveChannel(id: string): Promise<StatusOk> {
        return this.simple('POST', 'archive', { id }, StatusOkSchema)
    }

    /**
     * Unarchives a channel.
     *
     * @param id - The channel ID.
     */
    unarchiveChannel(id: string): Promise<StatusOk> {
        return this.simple('POST', 'unarchive', { id }, StatusOkSchema)
    }

    /**
     * Favorites a channel.
     *
     * @param id - The channel ID.
     */
    favoriteChannel(id: string): Promise<StatusOk> {
        return this.simple('POST', 'favorite', { id }, StatusOkSchema)
    }

    /**
     * Unfavorites a channel.
     *
     * @param id - The channel ID.
     */
    unfavoriteChannel(id: string): Promise<StatusOk> {
        return this.simple('POST', 'unfavorite', { id }, StatusOkSchema)
    }

    /**
     * Adds a user to a channel.
     *
     * @param args - The arguments for adding a user.
     * @param args.id - The channel ID.
     * @param args.userId - The user ID to add.
     *
     * @example
     * ```typescript
     * await api.channels.addUser({ id: '7YpL3oZ4kZ9vP7Q1tR2sX44', userId: 101 })
     * ```
     */
    addUser(args: AddChannelUserArgs): Promise<Channel> {
        return this.simple('POST', 'add_user', { ...args }, this.channelSchema)
    }

    /**
     * Adds multiple users to a channel.
     *
     * @param args - The arguments for adding users.
     * @param args.id - The channel ID.
     * @param args.userIds - Array of user IDs to add.
     *
     * @example
     * ```typescript
     * await api.channels.addUsers({ id: '7YpL3oZ4kZ9vP7Q1tR2sX44', userIds: [101, 202] })
     * ```
     */
    addUsers(args: AddChannelUsersArgs): Promise<Channel> {
        return this.simple('POST', 'add_users', { ...args }, this.channelSchema)
    }

    /**
     * Removes a user from a channel.
     *
     * @param args - The arguments for removing a user.
     * @param args.id - The channel ID.
     * @param args.userId - The user ID to remove.
     */
    removeUser(args: RemoveChannelUserArgs): Promise<Channel> {
        return this.simple('POST', 'remove_user', { ...args }, this.channelSchema)
    }

    /**
     * Removes multiple users from a channel.
     *
     * @param args - The arguments for removing users.
     * @param args.id - The channel ID.
     * @param args.userIds - Array of user IDs to remove.
     */
    removeUsers(args: RemoveChannelUsersArgs): Promise<Channel> {
        return this.simple('POST', 'remove_users', { ...args }, this.channelSchema)
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
