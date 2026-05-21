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
    /** Gets all the user's workspaces. */
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

    /** Gets a single workspace object by id. */
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

    /** Gets the user's default workspace. */
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

    /** Creates a new workspace. */
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

    /** Updates an existing workspace. */
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

    /** Removes a workspace and all its data (not recoverable). */
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

    /** Gets the public channels of a workspace. */
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
