import { ENDPOINT_WORKSPACES } from '../consts/endpoints'
import { request } from '../transport/http-client'
import type { BatchRequestDescriptor } from '../types/batch'
import { Channel, ChannelSchema, Workspace, WorkspaceSchema } from '../types/entities'
import { BaseClient } from './base-client'

/**
 * Client for `/api/v3/workspaces/`. Workspace IDs are integers (not
 * migrated to UUIDv7).
 *
 * Note: Comms' workspaces have lost their `color`, `default_channel`,
 * `welcome_channel`, and `security` fields per the Todoist-id migration
 * (`Comms_API_changes.md`). The backend currently rejects any `color` other
 * than `1` on add/update.
 */
export class WorkspacesClient extends BaseClient {
    /**
     * Gets all the user's workspaces.
     *
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns An array of all workspaces the user belongs to.
     *
     * @example
     * ```typescript
     * const workspaces = await api.workspaces.getWorkspaces()
     * workspaces.forEach(ws => console.log(ws.name))
     * ```
     */
    getWorkspaces(options: { batch: true }): BatchRequestDescriptor<Workspace[]>
    getWorkspaces(options?: { batch?: false }): Promise<Workspace[]>
    getWorkspaces(options?: {
        batch?: boolean
    }): Promise<Workspace[]> | BatchRequestDescriptor<Workspace[]> {
        const method = 'GET'
        const url = `${ENDPOINT_WORKSPACES}/get`

        if (options?.batch) {
            return { method, url }
        }

        return request<Workspace[]>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: undefined,
            customFetch: this.customFetch,
        }).then((response) => response.data.map((workspace) => WorkspaceSchema.parse(workspace)))
    }

    /**
     * Gets a single workspace object by id.
     *
     * @param id - The workspace ID.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns The workspace object.
     *
     * @example
     * ```typescript
     * const workspace = await api.workspaces.getWorkspace(123)
     * console.log(workspace.name)
     * ```
     */
    getWorkspace(id: number, options: { batch: true }): BatchRequestDescriptor<Workspace>
    getWorkspace(id: number, options?: { batch?: false }): Promise<Workspace>
    getWorkspace(
        id: number,
        options?: { batch?: boolean },
    ): Promise<Workspace> | BatchRequestDescriptor<Workspace> {
        const method = 'GET'
        const url = `${ENDPOINT_WORKSPACES}/getone`
        const params = { id }
        const schema = WorkspaceSchema

        if (options?.batch) {
            return { method, url, params, schema }
        }

        return request<Workspace>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }

    /**
     * Gets the user's default workspace.
     *
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns The default workspace object.
     *
     * @example
     * ```typescript
     * const workspace = await api.workspaces.getDefaultWorkspace()
     * console.log(workspace.name)
     * ```
     */
    getDefaultWorkspace(options: { batch: true }): BatchRequestDescriptor<Workspace>
    getDefaultWorkspace(options?: { batch?: false }): Promise<Workspace>
    getDefaultWorkspace(options?: {
        batch?: boolean
    }): Promise<Workspace> | BatchRequestDescriptor<Workspace> {
        const method = 'GET'
        const url = `${ENDPOINT_WORKSPACES}/get_default`
        const schema = WorkspaceSchema

        if (options?.batch) {
            return { method, url, schema }
        }

        return request<Workspace>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: undefined,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }

    /**
     * Creates a new workspace.
     *
     * @param name - The name of the new workspace.
     * @param tempId - Optional temporary ID for the workspace.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns The created workspace object.
     *
     * @example
     * ```typescript
     * const workspace = await api.workspaces.createWorkspace('My Team')
     * console.log('Created:', workspace.name)
     * ```
     */
    createWorkspace(name: string, options: { batch: true }): BatchRequestDescriptor<Workspace>
    createWorkspace(name: string, options?: { batch?: false }): Promise<Workspace>
    createWorkspace(
        name: string,
        options?: { batch?: boolean },
    ): Promise<Workspace> | BatchRequestDescriptor<Workspace> {
        const params: Record<string, unknown> = { name }
        const method = 'POST'
        const url = `${ENDPOINT_WORKSPACES}/add`
        const schema = WorkspaceSchema

        if (options?.batch) {
            return { method, url, params, schema }
        }

        return request<Workspace>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }

    /**
     * Updates an existing workspace.
     *
     * @param id - The workspace ID.
     * @param name - The new name for the workspace.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns The updated workspace object.
     *
     * @example
     * ```typescript
     * const workspace = await api.workspaces.updateWorkspace(123, 'New Team Name')
     * ```
     */
    updateWorkspace(
        id: number,
        name: string,
        options: { batch: true },
    ): BatchRequestDescriptor<Workspace>
    updateWorkspace(id: number, name: string, options?: { batch?: false }): Promise<Workspace>
    updateWorkspace(
        id: number,
        name: string,
        options?: { batch?: boolean },
    ): Promise<Workspace> | BatchRequestDescriptor<Workspace> {
        const method = 'POST'
        const url = `${ENDPOINT_WORKSPACES}/update`
        const params = { id, name }
        const schema = WorkspaceSchema

        if (options?.batch) {
            return { method, url, params, schema }
        }

        return request<Workspace>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => schema.parse(response.data))
    }

    /**
     * Removes a workspace and all its data (not recoverable).
     *
     * @param id - The workspace ID.
     * @param currentPassword - The user's current password for confirmation.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     *
     * @example
     * ```typescript
     * await api.workspaces.removeWorkspace(123)
     * ```
     */
    removeWorkspace(id: number, options: { batch: true }): BatchRequestDescriptor<void>
    removeWorkspace(id: number, options?: { batch?: false }): Promise<void>
    removeWorkspace(
        id: number,
        options?: { batch?: boolean },
    ): Promise<void> | BatchRequestDescriptor<void> {
        const method = 'POST'
        const url = `${ENDPOINT_WORKSPACES}/remove`
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
     * Gets the public channels of a workspace.
     *
     * @param id - The workspace ID.
     * @param options - Optional configuration. Set `batch: true` to return a descriptor for batch requests.
     * @returns An array of public channel objects.
     *
     * @example
     * ```typescript
     * const channels = await api.workspaces.getPublicChannels(123)
     * channels.forEach(ch => console.log(ch.name))
     * ```
     */
    getPublicChannels(id: number, options: { batch: true }): BatchRequestDescriptor<Channel[]>
    getPublicChannels(id: number, options?: { batch?: false }): Promise<Channel[]>
    getPublicChannels(
        id: number,
        options?: { batch?: boolean },
    ): Promise<Channel[]> | BatchRequestDescriptor<Channel[]> {
        const method = 'GET'
        const url = `${ENDPOINT_WORKSPACES}/get_public_channels`
        const params = { id }

        if (options?.batch) {
            return { method, url, params }
        }

        return request<Channel[]>({
            httpMethod: method,
            baseUri: this.getBaseUri(),
            relativePath: url,
            apiToken: this.apiToken,
            payload: params,
            customFetch: this.customFetch,
        }).then((response) => response.data.map((channel) => ChannelSchema.parse(channel)))
    }
}
