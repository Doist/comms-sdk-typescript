/**
 * Marker constants for the two "broadcast" group recipients. These appear
 * in group-bearing fields (`Thread.groups`, `Comment.groups`,
 * `Channel.defaultGroups`, `directGroupMentions`, etc.) in place of a
 * real group ID and tell the backend to notify "everyone in the channel"
 * or "everyone in the thread" respectively. Input and output are
 * symmetric. Defined here (and not in `./entities`) so that `enums`
 * stays leaf-level — `entities` imports from `enums`, never the reverse.
 */
export const EVERYONE = 'EVERYONE' as const
export const EVERYONE_IN_THREAD = 'EVERYONE_IN_THREAD' as const

/** Union of the two broadcast group markers. */
export const GROUP_ID_MARKERS = [EVERYONE, EVERYONE_IN_THREAD] as const
export type GroupIdMarker = (typeof GROUP_ID_MARKERS)[number]

/**
 * A group identifier on the wire — either an opaque group ID or one of
 * the {@link GROUP_ID_MARKERS} for a broadcast audience.
 */
export type GroupId = string

// User types for workspace users
export const USER_TYPES = ['USER', 'GUEST', 'ADMIN'] as const

/**
 * The type of user in a workspace.
 *
 * @remarks
 * Possible values:
 * - `'USER'` - Regular user
 * - `'GUEST'` - Guest user
 * - `'ADMIN'` - Administrator
 */
export type UserType = (typeof USER_TYPES)[number]

// Workspace plans. The known values today are `'free'`, `'unlimited'`,
// and `'business'`, but the backend can introduce new plan names without
// coordinating a SDK release — so the schema accepts any string and the
// const array stays as a hint for autocomplete only.
export const WORKSPACE_PLANS = ['free', 'unlimited', 'business'] as const

/**
 * The plan type for a workspace. Any string accepted; the listed values
 * are the ones the backend exposes today.
 */
export type WorkspacePlan = (typeof WORKSPACE_PLANS)[number] | (string & {})

// Audiences that comment-creating endpoints can target alongside (or instead
// of) individual `recipients` / custom `groups`.
export const NOTIFY_AUDIENCES = ['channel', 'thread'] as const

/**
 * The audience to notify when posting a comment, in addition to any
 * individual `recipients` or custom `groups`.
 *
 * @remarks
 * Possible values:
 * - `'channel'` - Notify everyone in the channel.
 * - `'thread'` - Notify everyone who has interacted with the thread.
 */
export type NotifyAudience = (typeof NOTIFY_AUDIENCES)[number]

/**
 * Internal mapping from {@link NotifyAudience} to the broadcast marker IDs
 * (`EVERYONE` / `EVERYONE_IN_THREAD`) that comment- and thread-creation
 * endpoints use on the wire. SDK consumers should use {@link NotifyAudience}
 * via `notifyAudience` on the request args rather than passing these IDs
 * directly.
 */
export const NOTIFY_AUDIENCE_GROUP_IDS: Readonly<Record<NotifyAudience, GroupId>> = {
    channel: EVERYONE,
    thread: EVERYONE_IN_THREAD,
}
