const BASE_URI = 'https://comms.todoist.com'
const API_VERSION = 'v1'

/**
 * Gets the base URI for Comms API requests.
 *
 * @param domainBase - Custom domain base URL. Defaults to Comms' API domain.
 * @returns Complete base URI with trailing slash (e.g., 'https://comms.todoist.com/api/v1/')
 */
export function getCommsBaseUri(domainBase: string = BASE_URI): string {
    return new URL(`/api/${API_VERSION}/`, domainBase).toString()
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
