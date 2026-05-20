import { EVERYONE, EVERYONE_IN_THREAD, type GroupId } from './entities'

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

// Workspace plans
export const WORKSPACE_PLANS = ['free', 'unlimited'] as const

/**
 * The plan type for a workspace.
 *
 * @remarks
 * Possible values:
 * - `'free'` - Free plan
 * - `'unlimited'` - Unlimited plan
 */
export type WorkspacePlan = (typeof WORKSPACE_PLANS)[number]

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
 * Internal mapping from {@link NotifyAudience} to the backend marker IDs
 * that comment / thread creation endpoints use on the wire (`EVERYONE` and
 * `EVERYONE_IN_THREAD`). Exposed here so the audience constants and their
 * encoding stay in a single source of truth; SDK consumers should use
 * {@link NotifyAudience} via `notifyAudience` on the request args rather
 * than passing these IDs directly.
 *
 * Per `Comms_API_changes.md`, the prior numeric IDs `1` / `2` were replaced
 * with string constants on the wire.
 */
export const NOTIFY_AUDIENCE_GROUP_IDS: Readonly<Record<NotifyAudience, GroupId>> = {
    channel: EVERYONE,
    thread: EVERYONE_IN_THREAD,
}
