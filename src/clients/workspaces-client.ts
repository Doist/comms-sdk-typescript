import { z } from 'zod'
import { ENDPOINT_WORKSPACES } from '../consts/endpoints'
import { request } from '../transport/http-client'
import { Channel, ChannelSchema, Workspace, WorkspaceSchema } from '../types/entities'
import { BaseClient } from './base-client'

export const ChannelListSchema = z.array(ChannelSchema)

/**
 * Client for `/api/v1/workspaces/`. Workspace IDs are integers. The backend
 * currently rejects any `color` other than `1` on add/update.
 */
export class WorkspacesClient extends BaseClient {
    /**
     * Gets all the user's workspaces.
     *
     * @returns An array of all workspaces the user belongs to.
     *
     * @example
     * ```typescript
     * const workspaces = await api.workspaces.getWorkspaces()
     * workspaces.forEach(ws => console.log(ws.name))
     * ```
     */
    getWorkspaces(): Promise<Workspace[]> {
        return request<Workspace[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_WORKSPACES}/get`,
            apiToken: this.apiToken,
            payload: undefined,
            customFetch: this.customFetch,
        }).then((response) => response.data.map((workspace) => WorkspaceSchema.parse(workspace)))
    }

    /**
     * Gets a single workspace object by id.
     *
     * @param id - The workspace ID.
     * @returns The workspace object.
     *
     * @example
     * ```typescript
     * const workspace = await api.workspaces.getWorkspace(123)
     * console.log(workspace.name)
     * ```
     */
    getWorkspace(id: number): Promise<Workspace> {
        return request<Workspace>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_WORKSPACES}/getone`,
            apiToken: this.apiToken,
            payload: { id },
            customFetch: this.customFetch,
        }).then((response) => WorkspaceSchema.parse(response.data))
    }

    /**
     * Gets the user's default workspace.
     *
     * @returns The default workspace object.
     *
     * @example
     * ```typescript
     * const workspace = await api.workspaces.getDefaultWorkspace()
     * console.log(workspace.name)
     * ```
     */
    getDefaultWorkspace(): Promise<Workspace> {
        return request<Workspace>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_WORKSPACES}/get_default`,
            apiToken: this.apiToken,
            payload: undefined,
            customFetch: this.customFetch,
        }).then((response) => WorkspaceSchema.parse(response.data))
    }

    /**
     * Creates a new workspace.
     *
     * @param name - The name of the new workspace.
     * @returns The created workspace object.
     *
     * @example
     * ```typescript
     * const workspace = await api.workspaces.createWorkspace('My Team')
     * console.log('Created:', workspace.name)
     * ```
     */
    createWorkspace(name: string): Promise<Workspace> {
        return request<Workspace>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_WORKSPACES}/add`,
            apiToken: this.apiToken,
            payload: { name },
            customFetch: this.customFetch,
        }).then((response) => WorkspaceSchema.parse(response.data))
    }

    /**
     * Updates an existing workspace.
     *
     * @param id - The workspace ID.
     * @param name - The new name for the workspace.
     * @returns The updated workspace object.
     *
     * @example
     * ```typescript
     * const workspace = await api.workspaces.updateWorkspace(123, 'New Team Name')
     * ```
     */
    updateWorkspace(id: number, name: string): Promise<Workspace> {
        return request<Workspace>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_WORKSPACES}/update`,
            apiToken: this.apiToken,
            payload: { id, name },
            customFetch: this.customFetch,
        }).then((response) => WorkspaceSchema.parse(response.data))
    }

    /**
     * Removes a workspace and all its data (not recoverable).
     *
     * @param id - The workspace ID.
     *
     * @example
     * ```typescript
     * await api.workspaces.removeWorkspace(123)
     * ```
     */
    removeWorkspace(id: number): Promise<void> {
        return request<void>({
            httpMethod: 'POST',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_WORKSPACES}/remove`,
            apiToken: this.apiToken,
            payload: { id },
            customFetch: this.customFetch,
        }).then(() => undefined)
    }

    /**
     * Gets the public channels of a workspace.
     *
     * @param id - The workspace ID.
     * @returns An array of public channel objects.
     *
     * @example
     * ```typescript
     * const channels = await api.workspaces.getPublicChannels(123)
     * channels.forEach(ch => console.log(ch.name))
     * ```
     */
    getPublicChannels(id: number): Promise<Channel[]> {
        return request<Channel[]>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_WORKSPACES}/get_public_channels`,
            apiToken: this.apiToken,
            payload: { id },
            customFetch: this.customFetch,
        }).then((response) => ChannelListSchema.parse(response.data))
    }
}
