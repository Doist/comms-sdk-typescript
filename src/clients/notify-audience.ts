import { NOTIFY_AUDIENCE_GROUP_IDS, NOTIFY_AUDIENCES, type NotifyAudience } from '../types/enums'

/**
 * Params bearing the group-targeting fields that can carry a `notifyAudience`.
 * Shared by the comment-creating endpoints and thread creation.
 */
type NotifyAudienceParams = {
    groups?: string[] | null
    directGroupMentions?: string[] | null
    notifyAudience?: NotifyAudience | null
}

const SENTINEL_GROUP_IDS: ReadonlySet<string> = new Set(Object.values(NOTIFY_AUDIENCE_GROUP_IDS))

function isNotifyAudience(value: unknown): value is NotifyAudience {
    return typeof value === 'string' && (NOTIFY_AUDIENCES as readonly string[]).includes(value)
}

function collectMarkerOffenses(
    field: 'groups' | 'directGroupMentions',
    values: readonly string[] | undefined,
): { field: string; offending: string[] } | null {
    if (!values) return null
    const offending = values.filter((id) => SENTINEL_GROUP_IDS.has(id))
    return offending.length > 0 ? { field, offending } : null
}

/**
 * Normalizes a `notifyAudience` flag into a sentinel `groups` entry
 * (`EVERYONE` / `EVERYONE_IN_THREAD`) and rejects callers who put those
 * reserved markers directly into `groups` / `directGroupMentions`.
 *
 * When `notifyAudience` is set it is stripped and its sentinel is appended to
 * `groups`; the backend only understands the marker in `groups`. When it is
 * unset the params are returned unchanged, preserving any explicit
 * `groups` / `directGroupMentions` (including a `null`) on the wire.
 */
export function applyNotifyAudience<T extends NotifyAudienceParams>(
    params: T,
): Omit<T, 'notifyAudience'> {
    const offenses = [
        collectMarkerOffenses('groups', params.groups ?? undefined),
        collectMarkerOffenses('directGroupMentions', params.directGroupMentions ?? undefined),
    ].filter((o): o is { field: string; offending: string[] } => o !== null)

    if (offenses.length > 0) {
        const details = offenses
            .map(({ field, offending }) => `\`${field}\` contains ${offending.join(', ')}`)
            .join('; ')
        throw new Error(
            `Reserved broadcast marker IDs found: ${details}. Pass these via \`notifyAudience\` (e.g. \`notifyAudience: 'channel'\` for EVERYONE) instead of populating \`groups\` / \`directGroupMentions\` directly.`,
        )
    }

    if (params.notifyAudience == null) {
        return params as Omit<T, 'notifyAudience'>
    }

    if (!isNotifyAudience(params.notifyAudience)) {
        throw new Error(
            `Invalid \`notifyAudience\` value "${String(params.notifyAudience)}". Expected one of: ${NOTIFY_AUDIENCES.join(', ')}.`,
        )
    }

    const sentinel = NOTIFY_AUDIENCE_GROUP_IDS[params.notifyAudience]
    const { notifyAudience: _stripped, groups, ...rest } = params
    return { ...rest, groups: [...(groups ?? []), sentinel] } as Omit<T, 'notifyAudience'>
}
