/**
 * Who a new reply in a thread notifies by default.
 *
 * The rule comes from `@doist/sdk-kmp`, the shared implementation of Comms
 * logic, so replies default to the same people as in the other Comms clients.
 */

import {
    getDefaultReplyRecipients as getSharedDefaultReplyRecipients,
    ReplyRecipientsProvidable,
} from '@doist/sdk-kmp/shared-comms-clients'
import type { Comment, Thread } from '../types/entities'
import { EVERYONE, EVERYONE_IN_THREAD, GROUP_ID_MARKERS, type NotifyAudience } from '../types/enums'

/** The people, groups and audience a new reply notifies by default. */
export type DefaultReplyRecipients = {
    /** The IDs of the people to notify. Never includes the current user. */
    recipients: number[]
    /** The IDs of the groups to notify, without `EVERYONE` or `EVERYONE_IN_THREAD`. */
    groups: string[]
    /** Everyone in the channel or everyone who interacted with the thread, when notified. */
    notifyAudience: NotifyAudience | null
}

/**
 * Whether a system message marks a masked post: an integration's post, or an
 * imported comment, shown under someone else's name.
 */
function isMasked(systemMessage: unknown): boolean {
    return (
        typeof systemMessage === 'object' &&
        systemMessage !== null &&
        'type' in systemMessage &&
        systemMessage.type === 'USER_MASK'
    )
}

function recipientsOf(post: { recipients?: number[] | null }): number[] {
    return post.recipients ?? []
}

function groupsOf(post: { groups?: string[] | null }): string[] {
    return post.groups ?? []
}

/**
 * Returns the audience the special groups stand for. A comment that notified
 * both reached the whole channel, so the channel wins.
 */
function getNotifyAudience(groupIds: readonly string[]): NotifyAudience | null {
    if (groupIds.includes(EVERYONE)) {
        return 'channel'
    }
    if (groupIds.includes(EVERYONE_IN_THREAD)) {
        return 'thread'
    }
    return null
}

function isSpecialGroup(groupId: string): boolean {
    return (GROUP_ID_MARKERS as readonly string[]).includes(groupId)
}

/**
 * Works out who a new reply in a thread notifies by default, as the current
 * user writes it.
 *
 * - The newest comment that counts sets the default: its author, and the
 *   people and groups it notified. Deleted comments, system messages (such as
 *   closing, reopening or moving the thread) and masked posts from
 *   integrations or imports don't count. A comment that notified one person
 *   does.
 * - With no comment that counts, the thread sets it the same way, except that
 *   a thread to everyone in the channel defaults to everyone who interacted.
 * - Closing a thread, or replying in a closed one, defaults to everyone who
 *   interacted, and nobody else.
 * - The current user is never one of the people.
 *
 * Everyone in the channel and everyone who interacted come back as
 * `notifyAudience` rather than in `groups`. If a comment notified both, the
 * channel wins. The lists are always there, empty or not, so the result can be
 * spread straight into `createComment` or `closeThread`.
 *
 * @param args - The arguments for working out the recipients.
 * @param args.thread - The thread's `creator`, `recipients`, `groups` and `closed` flag.
 * @param args.comments - The thread's comments, oldest first, as `getComments` returns them.
 * @param args.currentUserId - The ID of the user writing the reply.
 * @param args.isClosingThread - Whether the reply closes the thread. Defaults to `false`.
 * @returns A new object on every call.
 *
 * @example
 * ```typescript
 * const comments = await api.comments.getComments({ threadId: thread.id })
 * await api.comments.createComment({
 *   threadId: thread.id,
 *   content: 'On it',
 *   ...getDefaultReplyRecipients({ thread, comments, currentUserId: me.id }),
 * })
 * ```
 */
export function getDefaultReplyRecipients(args: {
    thread: Pick<Thread, 'creator' | 'recipients' | 'groups' | 'closed'>
    comments: ReadonlyArray<
        Pick<Comment, 'creator' | 'recipients' | 'groups' | 'deleted' | 'systemMessage'>
    >
    currentUserId: number
    isClosingThread?: boolean
}): DefaultReplyRecipients {
    const { thread, comments, currentUserId, isClosingThread = false } = args
    // The shared rule reads comments newest first.
    const comment = (index: number) => comments[comments.length - 1 - index]

    // The library takes IDs as strings, and these come back as numbers below.
    const result = getSharedDefaultReplyRecipients(
        {
            [ReplyRecipientsProvidable.Symbol]: true,
            getThreadAuthorId: () => String(thread.creator),
            getThreadRecipientCount: () => recipientsOf(thread).length,
            getThreadRecipientId: (index) => String(recipientsOf(thread)[index]),
            getThreadGroupCount: () => groupsOf(thread).length,
            getThreadGroupId: (index) => groupsOf(thread)[index],
            isThreadClosed: () => thread.closed === true,
            getCommentCount: () => comments.length,
            getCommentAuthorId: (index) => String(comment(index).creator),
            getCommentRecipientCount: (index) => recipientsOf(comment(index)).length,
            getCommentRecipientId: (index, recipientIndex) =>
                String(recipientsOf(comment(index))[recipientIndex]),
            getCommentGroupCount: (index) => groupsOf(comment(index)).length,
            getCommentGroupId: (index, groupIndex) => groupsOf(comment(index))[groupIndex],
            isCommentDeleted: (index) => comment(index).deleted === true,
            // Comments from the API have all been posted.
            isCommentDraft: () => false,
            isCommentSystemMessage: (index) => {
                const { systemMessage } = comment(index)
                return systemMessage != null && !isMasked(systemMessage)
            },
            isCommentMasked: (index) => isMasked(comment(index).systemMessage),
        },
        String(currentUserId),
        isClosingThread,
    )

    return {
        recipients: result.recipientIds.map(Number),
        groups: result.groupIds.filter((groupId) => !isSpecialGroup(groupId)),
        notifyAudience: getNotifyAudience(result.groupIds),
    }
}
