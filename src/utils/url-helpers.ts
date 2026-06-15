/**
 * Helper functions for creating Comms permalinks (`https://comms.todoist.com/...`).
 */

export type CommsURLParams = {
    workspaceId: number
    channelId?: string
    conversationId?: string
    threadId?: string
    commentId?: string
    messageId?: string
    userId?: number
}

const COMMS_BASE_URL = 'https://comms.todoist.com'

/**
 * Builds a relative Comms URL based on the provided parameters
 * @param params - URL parameters including workspace, channel, conversation, thread, etc.
 * @returns A relative URL path
 * @example
 * getCommsURL({ workspaceId: 1, channelId: '7Yp...', threadId: '7Yq...' })
 * // returns '/1/ch/7Yp.../t/7Yq.../'
 */
export function getCommsURL(params: CommsURLParams): string {
    const { workspaceId, channelId, conversationId, threadId, commentId, messageId, userId } =
        params
    let url = `/${workspaceId}/`

    if (channelId) {
        url += `ch/${channelId}/`

        if (threadId) {
            url += `t/${threadId}/`
            if (commentId) {
                url += `c/${commentId}`
            }
        }
    } else if (threadId) {
        url += `inbox/t/${threadId}/`
        if (commentId) {
            url += `c/${commentId}`
        }
    } else if (conversationId) {
        url += `msg/${conversationId}/`
        if (messageId) {
            url += `m/${messageId}`
        }
    } else if (userId) {
        url += `people/u/${userId}`
    }

    return url
}

/**
 * Builds a full Comms URL (with protocol and hostname) based on the provided parameters
 * @param params - URL parameters including workspace, channel, conversation, thread, etc.
 * @param baseUrl - Optional base URL (defaults to 'https://comms.todoist.com')
 */
export function getFullCommsURL(params: CommsURLParams, baseUrl = COMMS_BASE_URL): string {
    // Strip a trailing slash so links don't double up — `getCommsURL` paths start with '/'.
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    return `${normalizedBase}${getCommsURL(params)}`
}

/** Returns the URL for a thread in a channel. */
export function getThreadURL(params: {
    workspaceId: number
    channelId: string
    threadId: string
}): string {
    return getCommsURL(params)
}

/** Returns the URL for a channel. */
export function getChannelURL(params: { workspaceId: number; channelId: string }): string {
    return getCommsURL(params)
}

/** Returns the URL for a conversation. */
export function getConversationURL(params: {
    workspaceId: number
    conversationId: string
}): string {
    return getCommsURL(params)
}

/** Returns the URL for a specific message in a conversation. */
export function getMessageURL(params: {
    workspaceId: number
    conversationId: string
    messageId: string
}): string {
    return getCommsURL(params)
}

/** Returns the URL for a comment in a thread. */
export function getCommentURL(params: {
    workspaceId: number
    channelId: string
    threadId: string
    commentId: string
}): string {
    return getCommsURL(params)
}

/** Returns the URL for the threads root (channels view). */
export function getThreadsRootURL(workspaceId: number): string {
    return `/${workspaceId}/ch`
}

/** Returns the URL for the inbox. */
export function getInboxURL(workspaceId: number, tab?: 'done' | 'mentions'): string {
    const tabParam = tab ? `/${tab}` : ''
    return `/${workspaceId}/inbox${tabParam}`
}

/** Returns the URL for the messages/conversations root. */
export function getMessagesRootURL(workspaceId: number): string {
    return `/${workspaceId}/msg`
}

/** Returns the URL for a user profile. */
export function getUserProfileURL(params: { workspaceId: number; userId: number }): string {
    return `/${params.workspaceId}/people/u/${params.userId}`
}

/** Returns the URL for the saved threads view. */
export function getSavedThreadsRootURL(workspaceId: number): string {
    return `/${workspaceId}/saved`
}

/** Returns the URL for a saved thread. */
export function getSavedThreadURL(params: { workspaceId: number; threadId: string }): string {
    return `/${params.workspaceId}/saved/t/${params.threadId}`
}

/** Returns the URL for the search root. */
export function getSearchRootURL(workspaceId: number): string {
    return `/${workspaceId}/search`
}

/** Returns the URL for a search with a query. */
export function getSearchQueryURL(params: { workspaceId: number; query: string }): string {
    return `/${params.workspaceId}/search?q=${decodeURIComponent(params.query)}`
}

/** Returns the URL for settings. */
export function getSettingsURL(params: { workspaceId: number; initialLocation?: string }): string {
    return params.initialLocation
        ? `/${params.workspaceId}/settings/${params.initialLocation}`
        : `/${params.workspaceId}/settings`
}

/** Returns the URL for the team members root. */
export function getTeamMembersRootURL(workspaceId: number): string {
    return `/${workspaceId}/people/u`
}
