import { getCommsBaseUri } from '../consts/endpoints'
import type { CustomFetch } from '../types/http'

export type ClientConfig = {
    /** API token for authentication */
    apiToken: string
    /** Optional custom base URL. If not provided, uses the default Comms API URL */
    baseUrl?: string
    /** Optional custom fetch implementation for cross-platform compatibility */
    customFetch?: CustomFetch
}

/**
 * Base class for every Comms API client. Centralizes URL handling and
 * config so individual clients stay focused on their endpoints.
 */
export class BaseClient {
    protected readonly apiToken: string
    protected readonly baseUrl?: string
    protected readonly customFetch?: CustomFetch

    constructor(config: ClientConfig) {
        this.apiToken = config.apiToken
        this.baseUrl = config.baseUrl
        this.customFetch = config.customFetch
    }

    /**
     * Returns the base URI for an API request, with a guaranteed trailing
     * slash so relative paths resolve cleanly through `URL`.
     */
    protected getBaseUri(): string {
        if (this.baseUrl) {
            const normalizedBaseUrl = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`
            return `${normalizedBaseUrl}api/v1/`
        }
        return getCommsBaseUri()
    }
}
