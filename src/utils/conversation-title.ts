/**
 * The title a conversation shows when nobody has named it.
 *
 * The rules come from `@doist/sdk-kmp`, the shared implementation of Comms
 * logic, so titles match the other Comms clients. The wording stays with each
 * caller, which joins the names in the user's language.
 */

import {
    ConversationKind,
    ConversationMemberProvidable,
    type ConversationTitleType as SharedConversationTitleType,
    getConversationTitle as getSharedConversationTitle,
} from '@doist/sdk-kmp/shared-comms-all'
import type { Conversation, WorkspaceUser } from '../types/entities'

/** The ways a conversation's title can be shown. */
export const CONVERSATION_TITLE_TYPES = [
    'custom',
    'yourself',
    'one_to_one',
    'group',
    'untitled',
] as const

/**
 * How to show a {@link ConversationTitle}.
 *
 * @remarks
 * Possible values:
 * - `'custom'` - The conversation's own title, as the only name.
 * - `'yourself'` - Only you are left: your name, as the only name.
 * - `'one_to_one'` - A 1:1: the other person's full name, as the only name.
 * - `'group'` - The names, then "N more" for `othersCount`, then "you" if `includesYou`.
 * - `'untitled'` - There's no name to show, so show your own placeholder.
 */
export type ConversationTitleType = (typeof CONVERSATION_TITLE_TYPES)[number]

/** A conversation's title, ready for the caller to word in the user's language. */
export type ConversationTitle = {
    /** How to show the title. */
    type: ConversationTitleType
    /** The names to show, in order. */
    names: string[]
    /** For a group, how many more people there are than `names`. */
    othersCount: number
    /**
     * For a group down to you and one other person, whether to add "you", as in
     * "Bob J. and you", so it doesn't read like your 1:1 with them.
     */
    includesYou: boolean
}

/**
 * Maps the shared title types onto the types this SDK exposes. It's keyed by
 * every name the library can return, so a type the library adds fails the
 * type check until it's mapped here.
 */
const TITLE_TYPE_BY_SHARED_NAME: Record<
    SharedConversationTitleType['name'],
    ConversationTitleType
> = {
    Custom: 'custom',
    Yourself: 'yourself',
    OneToOne: 'one_to_one',
    Group: 'group',
    Untitled: 'untitled',
}

/**
 * Returns the shared conversation kind for the API's `private` flag. Callers
 * never pass one in, since Kotlin compares enum entries by identity.
 */
function getConversationKind(isPrivate: boolean | null | undefined): ConversationKind {
    if (isPrivate == null) {
        return ConversationKind.Unknown
    }
    return isPrivate ? ConversationKind.Private : ConversationKind.Group
}

/**
 * Works out the title a conversation shows, as the current user sees it.
 *
 * - A `title` with something visible in it wins: `custom`.
 * - A 1:1 shows the other person's full name: `one_to_one`.
 * - A group shows the others' short names in alphabetical order, ignoring case
 *   and accents: `group`. Past `maxNames`, it counts the rest in `othersCount`,
 *   though a single person over is named instead.
 * - People removed from the workspace drop out of a group but stay in a 1:1.
 * - A group down to you and one other person sets `includesYou`. Down to you
 *   alone, it shows your full name: `yourself`.
 * - With no name to show, the type is `untitled`.
 *
 * `private` only tells a 1:1 from a group of two. Without it, as on a search
 * result, two people read as a 1:1. Past two people the count decides, since
 * chats imported from Twist can be private with three people in them.
 *
 * Someone in `userIds` who isn't in `users` reads as a name that hasn't loaded,
 * so a group counts them rather than naming them.
 *
 * The wording stays with the caller: join `names`, "N more" for `othersCount`
 * and "you" for `includesYou` with a list formatter in the user's language.
 *
 * @param args - The arguments for working out the title.
 * @param args.conversation - The conversation's `title`, `userIds` and `private` flag.
 * @param args.users - The users to take names from. Include people removed from the
 *   workspace, so a group can leave them out rather than count them.
 * @param args.currentUserId - The ID of the user viewing the conversation.
 * @param args.maxNames - How many names a group shows before it counts the rest.
 *   Defaults to 3, as the Comms apps show. Anything below 1 counts as 1.
 * @returns A new title on every call.
 *
 * @example
 * ```typescript
 * const users = await api.workspaceUsers.getWorkspaceUsers({
 *   workspaceId: 123,
 *   includeRemoved: true,
 * })
 * const title = getConversationTitle({ conversation, users, currentUserId: me.id })
 * // { type: 'group', names: ['Bob J.', 'Cara S.', 'Dan B.'], othersCount: 2, includesYou: false }
 * ```
 */
export function getConversationTitle(args: {
    conversation: Pick<Conversation, 'title' | 'userIds' | 'private'>
    users: ReadonlyArray<Pick<WorkspaceUser, 'id' | 'fullName' | 'shortName' | 'removed'>>
    currentUserId: number
    maxNames?: number
}): ConversationTitle {
    const { conversation, users, currentUserId, maxNames = 3 } = args
    const usersById = new Map(users.map((user) => [user.id, user]))
    const members = conversation.userIds.map((id) => {
        // Someone missing from `users` reads as blank, which the shared rules
        // count as a name that hasn't loaded.
        const user = usersById.get(id)
        return {
            fullName: user?.fullName ?? '',
            shortName: user?.shortName ?? '',
            isYou: id === currentUserId,
            isRemoved: user?.removed ?? false,
        }
    })

    const title = getSharedConversationTitle(
        {
            [ConversationMemberProvidable.Symbol]: true,
            getMemberCount: () => members.length,
            getMemberFullName: (index) => members[index].fullName,
            getMemberShortName: (index) => members[index].shortName,
            isMemberYou: (index) => members[index].isYou,
            isMemberRemoved: (index) => members[index].isRemoved,
        },
        getConversationKind(conversation.private),
        conversation.title,
        maxNames,
    )

    return {
        type: TITLE_TYPE_BY_SHARED_NAME[title.type.name],
        // The library asks for its array to be treated as read-only, so callers get a copy.
        names: [...title.names],
        othersCount: title.othersCount,
        includesYou: title.includesYou,
    }
}
