import { z } from 'zod'
import { getFullCommsURL } from '../utils/url-helpers'
import { USER_TYPES, WORKSPACE_PLANS } from './enums'

/**
 * Marker constants for the two "broadcast" group recipients. These appear in
 * group-bearing fields (`Thread.groups`, `Comment.groups`,
 * `Channel.defaultGroups`, `directGroupMentions`, etc.) in place of a real
 * group ID and tell the backend to notify "everyone in the channel" or
 * "everyone in the thread" respectively. Input and output are symmetric.
 */
export const EVERYONE = 'EVERYONE' as const
export const EVERYONE_IN_THREAD = 'EVERYONE_IN_THREAD' as const

/** Union of the two broadcast group markers. */
export const GROUP_ID_MARKERS = [EVERYONE, EVERYONE_IN_THREAD] as const
export type GroupIdMarker = (typeof GROUP_ID_MARKERS)[number]

/**
 * A group identifier on the wire — either an opaque group ID or one of the
 * {@link GROUP_ID_MARKERS} for a broadcast audience.
 */
export type GroupId = string

// Reusable schema for system messages that can be either a string or an
// object. Nullable — the backend returns `null` when there is no system
// message.
export const SystemMessageSchema = z.union([z.string(), z.unknown()]).nullable().optional()

/**
 * Shared `{ status: "ok" }` response shape. Most write endpoints that
 * don't return an entity use this — archive / unarchive / mark-read /
 * mark-all-read / mute / clear-unread / etc.
 */
export const StatusOkSchema = z.object({ status: z.string() })
export type StatusOk = z.infer<typeof StatusOkSchema>

// Attachment entity from API. Mirrors the canonical backend shape produced
// by `unify_attachments` / `validate_file_attachment_json`. Only
// `attachmentId` and `urlType` are guaranteed; everything else depends on
// the attachment kind (file vs image vs link preview vs unfurled GIF).
// Loose: unknown keys from the backend pass through rather than being
// stripped, so newly-added or off-spec fields stay accessible to callers.
export const AttachmentSchema = z
    .object({
        attachmentId: z.string(),
        urlType: z.string(),
        title: z.string().nullable().optional(),
        url: z.string().nullable().optional(),
        fileName: z.string().nullable().optional(),
        fileSize: z.number().int().nonnegative().nullable().optional(),
        underlyingType: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        image: z.string().nullable().optional(),
        imageWidth: z.number().int().nonnegative().nullable().optional(),
        imageHeight: z.number().int().nonnegative().nullable().optional(),
        duration: z.string().nullable().optional(),
        uploadState: z.string().nullable().optional(),
        video: z.string().nullable().optional(),
        videoType: z.string().nullable().optional(),
        videoAutoPlay: z.boolean().nullable().optional(),
    })
    .loose()

export type Attachment = z.infer<typeof AttachmentSchema>

// Fields shared by `User` and `WorkspaceUser`. Profile fields
// (`fullName`, `imageId`, avatar URLs) are sourced from Todoist-ID.
export const BaseUserSchema = z.object({
    id: z.number(),
    fullName: z.string(),
    shortName: z.string(),
    firstName: z.string().nullable().optional(),
    timezone: z.string(),
    removed: z.boolean(),
    imageId: z.string().nullable().optional(),
    avatarUrls: z
        .object({
            s35: z.string(),
            s60: z.string(),
            s195: z.string(),
            s640: z.string(),
        })
        .nullable()
        .optional(),
    restricted: z.boolean().nullable().optional(),
    setupPending: z.boolean().nullable().optional(),
})

// User entity from API.
export const UserSchema = BaseUserSchema.extend({
    email: z.email(),
    clientId: z.string().nullable().optional(),
    cometChannel: z.string().nullable().optional(),
    lang: z.string(),
    cometServer: z.string().nullable().optional(),
    token: z.string().nullable().optional(),
    scheduledBanners: z.array(z.string()).nullable().optional(),
})

export type User = z.infer<typeof UserSchema>

export const WorkspaceSchema = z.object({
    id: z.number(),
    name: z.string(),
    defaultConversation: z.number().nullable().optional(),
    creator: z.number(),
    created: z.date(),
    imageId: z.string().nullable().optional(),
    avatarUrls: z
        .object({
            s35: z.string(),
            s60: z.string(),
            s195: z.string(),
            s640: z.string(),
        })
        .nullable()
        .optional(),
    plan: z.enum(WORKSPACE_PLANS).nullable().optional(),
})

export type Workspace = z.infer<typeof WorkspaceSchema>

export const ChannelSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        creator: z.number(),
        userIds: z.array(z.number()).nullable().optional(),
        color: z.number().nullable().optional(),
        public: z.boolean(),
        workspaceId: z.number(),
        archived: z.boolean(),
        created: z.date(),
        useDefaultRecipients: z.boolean().nullable().optional(),
        defaultGroups: z.array(z.string()).nullable().optional(),
        defaultRecipients: z.array(z.number()).nullable().optional(),
        isFavorited: z.boolean().nullable().optional(),
        icon: z.number().nullable().optional(),
        version: z.number(),
        filters: z.record(z.string(), z.string()).nullable().optional(),
    })
    .transform((data) => ({
        ...data,
        url: getFullCommsURL({ workspaceId: data.workspaceId, channelId: data.id }),
    }))

export type Channel = z.infer<typeof ChannelSchema>

// Thread entity from API. `pinned` (boolean) and `pinnedTs` (epoch ms or
// null) are both surfaced — `pinned` is kept for Zapier/webhook clients.
export const ThreadSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        creator: z.number(),
        creatorName: z.string().nullable().optional(),
        channelId: z.string(),
        workspaceId: z.number(),
        actions: z.array(z.unknown()).nullable().optional(),
        attachments: z.array(AttachmentSchema).nullable().optional(),
        commentCount: z.number(),
        closed: z.boolean().nullable().optional(),
        directGroupMentions: z.array(z.string()).nullable().optional(),
        directMentions: z.array(z.number()).nullable().optional(),
        groups: z.array(z.string()).nullable().optional(),
        lastEdited: z.date().nullable().optional(),
        lastObjIndex: z.number().nullable().optional(),
        lastUpdated: z.date(),
        mutedUntil: z.date().nullable().optional(),
        participants: z.array(z.number()).nullable().optional(),
        pinned: z.boolean(),
        pinnedTs: z.number().int().nullable().optional(),
        posted: z.date(),
        reactions: z.record(z.string(), z.unknown()).nullable().optional(),
        recipients: z.array(z.number()).nullable().optional(),
        responders: z.array(z.number()).nullable().optional(),
        snippet: z.string(),
        snippetCreator: z.number(),
        snippetMaskAvatarUrl: z.string().nullable().optional(),
        snippetMaskPoster: z.string().nullable().optional(),
        systemMessage: SystemMessageSchema,
        toEmails: z.array(z.string()).nullable().optional(),
        isArchived: z.boolean(),
        isSaved: z.boolean().nullable().optional(),
        inInbox: z.boolean().nullable().optional(),
        lastComment: z
            .object({
                id: z.string(),
                content: z.string(),
                creator: z.number(),
                creatorName: z.string(),
                threadId: z.string(),
                channelId: z.string(),
                posted: z.date(),
                systemMessage: SystemMessageSchema,
                attachments: z.array(AttachmentSchema).nullable().optional(),
                reactions: z.record(z.string(), z.array(z.number())).nullable().optional(),
                actions: z.array(z.unknown()).nullable().optional(),
                objIndex: z.number(),
                lastEdited: z.date().nullable().optional(),
                deleted: z.boolean(),
                deletedBy: z.number().nullable().optional(),
                directGroupMentions: z.array(z.string()).nullable().optional(),
                directMentions: z.array(z.number()).nullable().optional(),
                groups: z.array(z.string()).nullable().optional(),
                recipients: z.array(z.number()).nullable().optional(),
                toEmails: z.array(z.string()).nullable().optional(),
                version: z.number(),
                workspaceId: z.number(),
            })
            .nullable()
            .optional(),
    })
    .transform((data) => ({
        ...data,
        url: getFullCommsURL({
            workspaceId: data.workspaceId,
            channelId: data.channelId,
            threadId: data.id,
        }),
    }))

export type Thread = z.infer<typeof ThreadSchema>

// Group entity from API. The broadcast markers `EVERYONE` and
// `EVERYONE_IN_THREAD` can appear in place of a real `id` in group-bearing
// fields on threads/comments/channels.
export const GroupSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    workspaceId: z.number(),
    userIds: z.array(z.number()),
    version: z.number(),
})

export type Group = z.infer<typeof GroupSchema>

// Conversation entity from API.
export const ConversationSchema = z
    .object({
        id: z.string(),
        workspaceId: z.number(),
        userIds: z.array(z.number()),
        messageCount: z.number().nullable().optional(),
        lastObjIndex: z.number(),
        snippet: z.string(),
        snippetCreators: z.array(z.number()),
        lastActive: z.date(),
        mutedUntil: z.date().nullable().optional(),
        archived: z.boolean(),
        created: z.date(),
        creator: z.number(),
        title: z.string().nullable().optional(),
        private: z.boolean().nullable().optional(),
        lastMessage: z
            .object({
                // `id` may be string or number depending on the endpoint; coerced.
                id: z.union([z.string(), z.number()]).transform(String),
                content: z.string(),
                creator: z.number(),
                conversationId: z.string(),
                posted: z.date(),
                systemMessage: SystemMessageSchema,
                attachments: z.array(AttachmentSchema).nullable().optional(),
                reactions: z.record(z.string(), z.array(z.number())).nullable().optional(),
                actions: z.array(z.unknown()).nullable().optional(),
                objIndex: z.number().nullable().optional(),
                lastEdited: z.date().nullable().optional(),
                deleted: z.boolean().nullable().optional(),
                directGroupMentions: z.array(z.string()).nullable().optional(),
                directMentions: z.array(z.number()).nullable().optional(),
                version: z.number().nullable().optional(),
                workspaceId: z.number().nullable().optional(),
            })
            .nullable()
            .optional(),
    })
    .transform((data) => ({
        ...data,
        url: getFullCommsURL({ workspaceId: data.workspaceId, conversationId: data.id }),
    }))

export type Conversation = z.infer<typeof ConversationSchema>

export const CommentSchema = z
    .object({
        id: z.string(),
        content: z.string(),
        creator: z.number(),
        threadId: z.string(),
        workspaceId: z.number(),
        conversationId: z.string().nullable().optional(),
        posted: z.date(),
        lastEdited: z.date().nullable().optional(),
        directMentions: z.array(z.number()).nullable().optional(),
        directGroupMentions: z.array(z.string()).nullable().optional(),
        systemMessage: SystemMessageSchema,
        attachments: z.array(AttachmentSchema).nullable().optional(),
        reactions: z.record(z.string(), z.unknown()).nullable().optional(),
        objIndex: z.number().nullable().optional(),
        creatorName: z.string().nullable().optional(),
        channelId: z.string(),
        recipients: z.array(z.number()).nullable().optional(),
        groups: z.array(z.string()).nullable().optional(),
        toEmails: z.array(z.string()).nullable().optional(),
        deleted: z.boolean().nullable().optional(),
        deletedBy: z.number().nullable().optional(),
        version: z.number().nullable().optional(),
        actions: z.array(z.unknown()).nullable().optional(),
    })
    .transform((data) => ({
        ...data,
        url: getFullCommsURL({
            workspaceId: data.workspaceId,
            channelId: data.channelId,
            threadId: data.threadId,
            commentId: data.id,
        }),
    }))

export type Comment = z.infer<typeof CommentSchema>

export const WorkspaceUserSchema = BaseUserSchema.extend({
    email: z.string().nullable().optional(),
    userType: z.enum(USER_TYPES),
    dateFormat: z.string().nullable().optional(),
    theme: z.number().int().nullable().optional(),
    timeFormat: z.string().nullable().optional(),
    version: z.number(),
})

export type WorkspaceUser = z.infer<typeof WorkspaceUserSchema>

// ConversationMessage entity from API. `id` is widened to `string | number`
// (coerced to a string post-parse) because the backend currently emits
// either shape depending on the endpoint; the URL/reaction helpers accept
// both.
export const ConversationMessageSchema = z
    .object({
        id: z.union([z.string(), z.number()]).transform(String),
        content: z.string(),
        creator: z.number(),
        conversationId: z.string(),
        posted: z.date(),
        systemMessage: SystemMessageSchema,
        attachments: z.array(AttachmentSchema).nullable().optional(),
        reactions: z.record(z.string(), z.array(z.number())).nullable().optional(),
        actions: z.array(z.unknown()).nullable().optional(),
        objIndex: z.number().nullable().optional(),
        lastEdited: z.date().nullable().optional(),
        isDeleted: z.boolean().nullable().optional(),
        directGroupMentions: z.array(z.string()).nullable().optional(),
        directMentions: z.array(z.number()).nullable().optional(),
        version: z.number().nullable().optional(),
        workspaceId: z.number(),
    })
    .transform((data) => ({
        ...data,
        url: getFullCommsURL({
            workspaceId: data.workspaceId,
            conversationId: data.conversationId,
            messageId: data.id,
        }),
    }))

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>

// InboxThread entity from API - returns full Thread objects with additional inbox metadata.
export const InboxThreadSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        creator: z.number(),
        creatorName: z.string().nullable().optional(),
        channelId: z.string(),
        workspaceId: z.number(),
        actions: z.array(z.unknown()).nullable().optional(),
        attachments: z.array(AttachmentSchema).nullable().optional(),
        commentCount: z.number(),
        directGroupMentions: z.array(z.string()).nullable().optional(),
        directMentions: z.array(z.number()).nullable().optional(),
        groups: z.array(z.string()).nullable().optional(),
        lastEdited: z.date().nullable().optional(),
        lastObjIndex: z.number().nullable().optional(),
        lastUpdated: z.date(),
        mutedUntil: z.date().nullable().optional(),
        participants: z.array(z.number()).nullable().optional(),
        pinned: z.boolean(),
        pinnedTs: z.number().int().nullable().optional(),
        posted: z.date(),
        reactions: z.record(z.string(), z.array(z.number())).nullable().optional(),
        recipients: z.array(z.number()).nullable().optional(),
        snippet: z.string(),
        snippetCreator: z.number(),
        snippetMaskAvatarUrl: z.string().nullable().optional(),
        snippetMaskPoster: z.string().nullable().optional(),
        systemMessage: SystemMessageSchema,
        isArchived: z.boolean(),
        inInbox: z.boolean(),
        isSaved: z.boolean().nullable().optional(),
        closed: z.boolean(),
        responders: z.array(z.number()).nullable().optional(),
        lastComment: CommentSchema.nullable().optional(),
        toEmails: z.array(z.string()).nullable().optional(),
        version: z.number().nullable().optional(),
    })
    .transform((data) => ({
        ...data,
        url: getFullCommsURL({
            workspaceId: data.workspaceId,
            channelId: data.channelId,
            threadId: data.id,
        }),
    }))

export type InboxThread = z.infer<typeof InboxThreadSchema>

// UnreadThread entity from API - simplified thread reference.
export const UnreadThreadSchema = z.object({
    threadId: z.string(),
    channelId: z.string(),
    objIndex: z.number(),
    directMention: z.boolean(),
})

export type UnreadThread = z.infer<typeof UnreadThreadSchema>

// UnreadConversation entity from API - simplified conversation reference.
export const UnreadConversationSchema = z.object({
    conversationId: z.string(),
    objIndex: z.number(),
    directMention: z.boolean(),
})

export type UnreadConversation = z.infer<typeof UnreadConversationSchema>

// SearchResult entity from API.
export const SEARCH_RESULT_TYPES = ['thread', 'comment', 'message', 'conversation'] as const
export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number]

export const SearchResultSchema = z.object({
    id: z.string(),
    type: z.enum(SEARCH_RESULT_TYPES),
    snippet: z.string(),
    snippetCreatorId: z.number(),
    snippetLastUpdated: z.date(),
    threadId: z.string().nullable().optional(),
    conversationId: z.string().nullable().optional(),
    commentId: z.string().nullable().optional(),
    channelId: z.string().nullable().optional(),
    channelName: z.string().nullable().optional(),
    channelColor: z.number().nullable().optional(),
    title: z.string().nullable().optional(),
    closed: z.boolean().nullable().optional(),
})

export type SearchResult = z.infer<typeof SearchResultSchema>

// Search response shapes.
export type SearchResponse = {
    items: SearchResult[]
    nextCursorMark?: string
    hasMore: boolean
    isPlanRestricted: boolean
}

export type SearchThreadResponse = {
    commentIds: string[]
}

export type SearchConversationResponse = {
    messageIds: number[]
}

// Reactions.
export type ReactionObject = Record<string, number[]> | null
