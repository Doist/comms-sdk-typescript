import { getCommsBaseUri } from '../consts/endpoints'
import type { ApiVersion } from '../types/api-version'
import { DEFAULT_API_VERSION } from '../types/api-version'
import type { CustomFetch } from '../types/http'

export type ClientConfig = {
    /** API token for authentication */
    apiToken: string
    /** Optional custom base URL. If not provided, uses the default Comms API URL */
    baseUrl?: string
    /** Optional API version. Defaults to 'v1' */
    version?: ApiVersion
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
    protected readonly defaultVersion: ApiVersion
    protected readonly customFetch?: CustomFetch

    constructor(config: ClientConfig) {
        this.apiToken = config.apiToken
        this.baseUrl = config.baseUrl
        this.defaultVersion = config.version || DEFAULT_API_VERSION
        this.customFetch = config.customFetch
    }

    /**
     * Returns the base URI for an API request, with a guaranteed trailing
     * slash so relative paths resolve cleanly through `URL`.
     */
    protected getBaseUri(): string {
        if (this.baseUrl) {
            const normalizedBaseUrl = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`
            return `${normalizedBaseUrl}api/${this.defaultVersion}/`
        }
        return getCommsBaseUri(this.defaultVersion)
    }
}
