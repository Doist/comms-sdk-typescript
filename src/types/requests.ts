import { z } from 'zod'
import { type Attachment, AttachmentSchema } from './entities'
import { NOTIFY_AUDIENCES } from './enums'

/**
 * Create-side requests require an `id` on the wire. The SDK clients accept
 * `id` as optional and auto-generate one via
 * {@link import('../utils/uuidv7').generateId} when the caller doesn't pass
 * one — callers can still mint their own ID locally (e.g. for optimistic
 * UI) and have it stick.
 */

export const CreateChannelArgsSchema = z.object({
    workspaceId: z.number(),
    name: z.string(),
    id: z.string().optional(),
    userIds: z.array(z.number()).nullable().optional(),
    color: z.number().nullable().optional(),
    public: z.boolean().nullable().optional(),
    description: z.string().nullable().optional(),
    defaultGroups: z.array(z.string()).nullable().optional(),
    defaultRecipients: z.array(z.number()).nullable().optional(),
    isFavorited: z.boolean().nullable().optional(),
    icon: z.number().nullable().optional(),
})

export type CreateChannelArgs = z.infer<typeof CreateChannelArgsSchema>

export const UpdateChannelArgsSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.number().nullable().optional(),
    public: z.boolean().nullable().optional(),
    description: z.string().nullable().optional(),
    defaultGroups: z.array(z.string()).nullable().optional(),
    defaultRecipients: z.array(z.number()).nullable().optional(),
    isFavorited: z.boolean().nullable().optional(),
    icon: z.number().nullable().optional(),
})

export type UpdateChannelArgs = z.infer<typeof UpdateChannelArgsSchema>

export const CreateThreadArgsSchema = z.object({
    channelId: z.string(),
    content: z.string(),
    title: z.string().nullable().optional(),
    id: z.string().optional(),
    recipients: z.array(z.number()).nullable().optional(),
    groups: z.array(z.string()).nullable().optional(),
})

export type CreateThreadArgs = z.infer<typeof CreateThreadArgsSchema>

export const UpdateThreadArgsSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    content: z.string().nullable().optional(),
})

export type UpdateThreadArgs = z.infer<typeof UpdateThreadArgsSchema>

export const CreateCommentArgsSchema = z.object({
    threadId: z.string(),
    content: z.string(),
    id: z.string().optional(),
    attachments: z.array(AttachmentSchema).nullable().optional(),
    actions: z.unknown().nullable().optional(),
    recipients: z.array(z.number()).nullable().optional(),
    groups: z.array(z.string()).nullable().optional(),
    directMentions: z.array(z.number()).nullable().optional(),
    directGroupMentions: z.array(z.string()).nullable().optional(),
    notifyAudience: z.enum(NOTIFY_AUDIENCES).nullable().optional(),
})

export type CreateCommentArgs = z.infer<typeof CreateCommentArgsSchema>

export const UpdateCommentArgsSchema = z.object({
    id: z.string(),
    content: z.string(),
})

export type UpdateCommentArgs = z.infer<typeof UpdateCommentArgsSchema>

export const CreateConversationArgsSchema = z.object({
    workspaceId: z.number(),
    recipients: z.array(z.number()),
    id: z.string().optional(),
    title: z.string().nullable().optional(),
})

export type CreateConversationArgs = z.infer<typeof CreateConversationArgsSchema>

export const CreateMessageArgsSchema = z
    .object({
        conversationId: z.string().nullable().optional(),
        threadId: z.string().nullable().optional(),
        content: z.string(),
        id: z.string().optional(),
        attachments: z.array(AttachmentSchema).nullable().optional(),
    })
    .refine(
        (data) => {
            return (
                (data.conversationId && !data.threadId) || (!data.conversationId && data.threadId)
            )
        },
        {
            message: 'Exactly one of conversationId or threadId must be provided',
        },
    )

export type CreateMessageArgs = z.infer<typeof CreateMessageArgsSchema>

export const GetChannelsArgsSchema = z.object({
    workspaceId: z.number(),
    archived: z.boolean().nullable().optional(),
})

export type GetChannelsArgs = z.infer<typeof GetChannelsArgsSchema>

export const GetThreadsArgsSchema = z.object({
    workspaceId: z.number(),
    channelId: z.string().nullable().optional(),
    archived: z.boolean().nullable().optional(),
    newerThan: z.date().nullable().optional(),
    olderThan: z.date().nullable().optional(),
    limit: z.number().nullable().optional(),
})

export type GetThreadsArgs = Omit<
    z.infer<typeof GetThreadsArgsSchema>,
    'newerThan' | 'olderThan'
> & {
    newerThan?: Date | null
    olderThan?: Date | null
    /** @deprecated Use `newerThan` instead. */
    newer_than_ts?: number | null
    /** @deprecated Use `olderThan` instead. */
    older_than_ts?: number | null
}

export const GetCommentsArgsSchema = z.object({
    threadId: z.string(),
    from: z.date().nullable().optional(),
    newerThan: z.date().nullable().optional(),
    olderThan: z.date().nullable().optional(),
    limit: z.number().nullable().optional(),
})

export type GetCommentsArgs = Omit<z.infer<typeof GetCommentsArgsSchema>, 'from'> & {
    /** @deprecated Use `newerThan` instead. */
    from?: Date | null
}

export const GetConversationsArgsSchema = z.object({
    workspaceId: z.number(),
    archived: z.boolean().nullable().optional(),
})

export type GetConversationsArgs = z.infer<typeof GetConversationsArgsSchema>

export const GetOrCreateConversationArgsSchema = z.object({
    workspaceId: z.number(),
    userIds: z.array(z.number()),
    id: z.string().optional(),
})

export type GetOrCreateConversationArgs = z.infer<typeof GetOrCreateConversationArgsSchema>

// Users. `password`/`current_password` are wired through Todoist-ID;
// profile fields (full_name, image, etc.) round-trip through
// `/users/update` here.
export type UpdateUserArgs = {
    name?: string
    password?: string
    timezone?: string
    lang?: string
    dateFormat?: string
    timeFormat?: string
    /** Theme ID (0-12). String aliases like `'dark'` are also accepted. */
    theme?: number | string
}

// Search
type SearchArgsCommon = {
    workspaceId: number
    channelIds?: string[]
    authorIds?: number[]
    dateFrom?: string
    dateTo?: string
    limit?: number
    cursor?: string
}

export type SearchArgs =
    | (SearchArgsCommon & { query: string; mentionSelf?: boolean })
    | (SearchArgsCommon & { query?: string; mentionSelf: true })

export type SearchThreadArgs = {
    query: string
    threadId: string
    limit?: number
    cursor?: string
}

export type SearchConversationArgs = {
    query: string
    conversationId: string
    limit?: number
    cursor?: string
}

// Conversation Messages
export type GetConversationMessagesArgs = {
    conversationId: string
    newerThan?: Date
    olderThan?: Date
    limit?: number
    cursor?: string
}

export type CreateConversationMessageArgs = {
    conversationId: string
    content: string
    /** Caller-supplied ID. Auto-generated if omitted. */
    id?: string
    attachments?: Attachment[]
    actions?: unknown[]
    directMentions?: number[]
    directGroupMentions?: string[]
    notify?: boolean
}

export type UpdateConversationMessageArgs = {
    id: string
    content: string
    attachments?: Attachment[]
    actions?: unknown[]
    directMentions?: number[]
    directGroupMentions?: string[]
}

// Inbox
export const ARCHIVE_FILTER_VALUES = ['active', 'archived', 'all'] as const
export type ArchiveFilter = (typeof ARCHIVE_FILTER_VALUES)[number]

export type GetInboxArgs = {
    workspaceId: number
    newerThan?: Date
    olderThan?: Date
    /** @deprecated Use `newerThan` instead. */
    since?: Date
    /** @deprecated Use `olderThan` instead. */
    until?: Date
    limit?: number
    cursor?: string
    archiveFilter?: ArchiveFilter
}

export type ArchiveAllArgs = {
    workspaceId: number
    channelIds?: string[]
    olderThan?: Date
    /** @deprecated Use `olderThan` instead. */
    until?: Date
    /** @deprecated Not supported by the archive_all endpoint — this value is ignored. */
    since?: Date
}

// Reactions.
export type AddReactionArgs = {
    threadId?: string
    commentId?: string
    messageId?: string
    reaction: string
}

export type RemoveReactionArgs = {
    threadId?: string
    commentId?: string
    messageId?: string
    reaction: string
}

export type GetReactionsArgs = {
    threadId?: string
    commentId?: string
    messageId?: string
}

// Channels
export type AddChannelUserArgs = {
    id: string
    userId: number
}

export type AddChannelUsersArgs = {
    id: string
    userIds: number[]
}

export type RemoveChannelUserArgs = {
    id: string
    userId: number
}

export type RemoveChannelUsersArgs = {
    id: string
    userIds: number[]
}

// Threads
export const THREAD_ACTIONS = ['close', 'reopen'] as const
export type ThreadAction = (typeof THREAD_ACTIONS)[number]

/**
 * Shared shape for endpoints that post a comment as part of a thread action
 * (close, reopen). Identical to {@link CreateCommentArgs} except the target
 * is identified by `id` (the thread ID) instead of `threadId`.
 */
type ThreadActionCommentArgs = Omit<CreateCommentArgs, 'threadId'> & { id: string }

export type CloseThreadArgs = ThreadActionCommentArgs

export type ReopenThreadArgs = ThreadActionCommentArgs

export type MoveThreadToChannelArgs = {
    id: string
    toChannel: string
}

export type MarkThreadReadArgs = {
    id: string
    objIndex: number
}

export type MarkThreadUnreadArgs = {
    id: string
    objIndex: number
}

export type MarkThreadUnreadForOthersArgs = {
    id: string
    objIndex: number
}

export type MuteThreadArgs = {
    id: string
    minutes: number
}

// Comments
export type MarkCommentPositionArgs = {
    threadId: string
    commentId: string
}

// Conversations
export type UpdateConversationArgs = {
    id: string
    title: string
    archived?: boolean
}

export type AddConversationUserArgs = {
    id: string
    userId: number
}

export type AddConversationUsersArgs = {
    id: string
    userIds: number[]
}

export type RemoveConversationUserArgs = {
    id: string
    userId: number
}

export type RemoveConversationUsersArgs = {
    id: string
    userIds: number[]
}

export type MuteConversationArgs = {
    id: string
    minutes: number
}

// Groups. The broadcast markers `EVERYONE` / `EVERYONE_IN_THREAD` are not
// addressable through these endpoints — they only appear in group-bearing
// fields on threads/comments/channels.
export type AddGroupUserArgs = {
    id: string
    workspaceId: number
    userId: number
}

export type AddGroupUsersArgs = {
    id: string
    workspaceId: number
    userIds: number[]
}

export type RemoveGroupUserArgs = {
    id: string
    workspaceId: number
    userId: number
}

export type RemoveGroupUsersArgs = {
    id: string
    workspaceId: number
    userIds: number[]
}

// Workspace Users
export type GetWorkspaceUsersArgs = {
    workspaceId: number
    archived?: boolean
}

export type GetUserByIdArgs = {
    workspaceId: number
    userId: number
}

export type GetUserByEmailArgs = {
    workspaceId: number
    email: string
}

export type GetUserInfoArgs = {
    workspaceId: number
    userId: number
}

export type GetUserLocalTimeArgs = {
    workspaceId: number
    userId: number
}
