import type { ApiVersion } from '../types/api-version'
import { DEFAULT_API_VERSION } from '../types/api-version'

const BASE_URI = 'https://comms.todoist.com'

export const API_VERSION = DEFAULT_API_VERSION
/**
 * @deprecated Use getCommsBaseUri() instead. This constant is kept for backward compatibility.
 */
export const API_BASE_URI = `/api/${API_VERSION}/`

/**
 * Gets the base URI for Comms API requests.
 *
 * @param version - API version ('v3' or 'v4'). Defaults to 'v3'.
 * @param domainBase - Custom domain base URL. Defaults to Comms' API domain.
 * @returns Complete base URI with trailing slash (e.g., 'https://comms.todoist.com/api/v3/')
 */
export function getCommsBaseUri(
    version: ApiVersion = DEFAULT_API_VERSION,
    domainBase: string = BASE_URI,
): string {
    return new URL(`/api/${version}/`, domainBase).toString()
}

export const ENDPOINT_USERS = 'users'
export const ENDPOINT_WORKSPACES = 'workspaces'
export const ENDPOINT_CHANNELS = 'channels'
export const ENDPOINT_THREADS = 'threads'
export const ENDPOINT_GROUPS = 'groups'
export const ENDPOINT_CONVERSATIONS = 'conversations'
export const ENDPOINT_COMMENTS = 'comments'
export const ENDPOINT_NOTIFICATIONS = 'notifications'
export const ENDPOINT_INBOX = 'inbox'
export const ENDPOINT_REACTIONS = 'reactions'
export const ENDPOINT_SEARCH = 'search'
export const ENDPOINT_CONVERSATION_MESSAGES = 'conversation_messages'
