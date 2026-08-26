/**
 * Helper functions for creating Comms permalinks (`https://comms.todoist.com/...`).
 *
 * Paths come from `@doist/sdk-kmp`, the shared implementation of Comms link
 * routes, so they stay in step with the other Comms clients. The path builders
 * are used rather than the URL builders so that `getFullCommsURL` can keep
 * serving an arbitrary base URL.
 */

import {
    commsChannelPath,
    commsConversationPath,
    commsInboxThreadCommentPath,
    commsInboxThreadPath,
    commsMessagePath,
    commsSavedThreadCommentPath,
    commsSavedThreadPath,
    commsThreadCommentPath,
    commsThreadPath,
    parseCommsLink,
} from '@doist/sdk-kmp/comms'

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
 * Builds a path, falling back to a locally built path when the link builder
 * rejects one of the given ids. These helpers run while parsing API responses,
 * so building a path must never fail the parse.
 *
 * Every error is caught, not just id rejection. The link builders expose no
 * error type to narrow on, and a path is never important enough to fail a
 * parse over, so any failure degrades to the locally built path.
 *
 * @param build Builds the path.
 * @param fallback Builds the path without the shared link builder.
 * @returns The built path, or the locally built path if an id was rejected.
 */
function buildPath(build: () => string, fallback: () => string): string {
    try {
        return build()
    } catch {
        return fallback()
    }
}

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
    const workspace = String(workspaceId)

    if (channelId) {
        if (threadId && commentId) {
            return buildPath(
                () => commsThreadCommentPath(workspace, channelId, threadId, commentId),
                () => `/${workspace}/ch/${channelId}/t/${threadId}/c/${commentId}`,
            )
        }
        if (threadId) {
            return buildPath(
                () => commsThreadPath(workspace, channelId, threadId),
                () => `/${workspace}/ch/${channelId}/t/${threadId}/`,
            )
        }
        return buildPath(
            () => commsChannelPath(workspace, channelId),
            () => `/${workspace}/ch/${channelId}/`,
        )
    }

    if (threadId) {
        if (commentId) {
            return buildPath(
                () => commsInboxThreadCommentPath(workspace, threadId, commentId),
                () => `/${workspace}/inbox/t/${threadId}/c/${commentId}`,
            )
        }
        return buildPath(
            () => commsInboxThreadPath(workspace, threadId),
            () => `/${workspace}/inbox/t/${threadId}/`,
        )
    }

    if (conversationId) {
        if (messageId) {
            return buildPath(
                () => commsMessagePath(workspace, conversationId, messageId),
                () => `/${workspace}/msg/${conversationId}/m/${messageId}`,
            )
        }
        return buildPath(
            () => commsConversationPath(workspace, conversationId),
            () => `/${workspace}/msg/${conversationId}/`,
        )
    }

    // The people view and the bare workspace root have no shared route.
    if (userId) {
        return `/${workspace}/people/u/${userId}`
    }

    return `/${workspace}/`
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
    const workspace = String(params.workspaceId)
    return buildPath(
        () => commsSavedThreadPath(workspace, params.threadId),
        () => `/${workspace}/saved/t/${params.threadId}`,
    )
}

/** Returns the URL for a comment on a saved thread. */
export function getSavedThreadCommentURL(params: {
    workspaceId: number
    threadId: string
    commentId: string
}): string {
    const workspace = String(params.workspaceId)
    return buildPath(
        () => commsSavedThreadCommentPath(workspace, params.threadId, params.commentId),
        () => `/${workspace}/saved/t/${params.threadId}/c/${params.commentId}`,
    )
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

/** The kinds of Comms entity a URL can point at. */
export const COMMS_LINK_TYPES = [
    'channel',
    'thread',
    'thread_comment',
    'inbox_thread',
    'inbox_thread_comment',
    'saved_thread',
    'saved_thread_comment',
    'conversation',
    'message',
] as const

/** The kind of Comms entity a URL points at. */
export type CommsLinkType = (typeof COMMS_LINK_TYPES)[number]

/** The entity a Comms URL points at. */
export type CommsURLInfo = {
    /** The kind of entity the URL points at. */
    type: CommsLinkType
    /** The ID of the workspace the entity belongs to. */
    workspaceId: string
    /** The ID of the channel, when the URL names one. */
    channelId: string | null
    /** The ID of the thread, when the URL names one. */
    threadId: string | null
    /** The ID of the comment, when the URL names one. */
    commentId: string | null
    /** The ID of the conversation, when the URL names one. */
    conversationId: string | null
    /** The ID of the message, when the URL names one. */
    messageId: string | null
    /** Whether the URL points at a quoted reference rather than the entity itself. */
    isQuoteReference: boolean
}

/**
 * Maps the link parser's type names onto the types this SDK exposes. A name
 * that is missing here is one this SDK does not know about, and is treated as
 * an unrecognised URL rather than surfaced as a value outside the union.
 */
const LINK_TYPE_BY_PARSED_NAME: Record<string, CommsLinkType> = {
    Channel: 'channel',
    Thread: 'thread',
    ThreadComment: 'thread_comment',
    InboxThread: 'inbox_thread',
    InboxThreadComment: 'inbox_thread_comment',
    SavedThread: 'saved_thread',
    SavedThreadComment: 'saved_thread_comment',
    Conversation: 'conversation',
    Message: 'message',
}

/**
 * Parse a Comms URL into the entity it points at.
 *
 * @param url The URL to parse.
 * @returns The entity the URL points at, or `null` if it is not a Comms URL.
 */
export function parseCommsURL(url: string): CommsURLInfo | null {
    const link = parseCommsLink(url)
    if (!link) {
        return null
    }

    const type = LINK_TYPE_BY_PARSED_NAME[link.type.name]
    if (!type) {
        return null
    }

    return {
        type,
        workspaceId: link.workspaceId,
        channelId: link.channelId ?? null,
        threadId: link.threadId ?? null,
        commentId: link.commentId ?? null,
        conversationId: link.conversationId ?? null,
        messageId: link.messageId ?? null,
        isQuoteReference: link.isQuoteReference,
    }
}
