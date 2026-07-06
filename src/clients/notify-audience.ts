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
 * Returns the params with `notifyAudience` stripped and, when it was set, its
 * sentinel appended to `groups`. `notifyAudience` is a client-only convenience
 * — it is never sent on the wire; the backend only understands the marker in
 * `groups`.
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

    const { notifyAudience, groups, ...rest } = params

    if (notifyAudience == null) {
        return { ...rest, ...(groups == null ? {} : { groups }) } as Omit<T, 'notifyAudience'>
    }

    if (!isNotifyAudience(notifyAudience)) {
        throw new Error(
            `Invalid \`notifyAudience\` value "${String(notifyAudience)}". Expected one of: ${NOTIFY_AUDIENCES.join(', ')}.`,
        )
    }

    const sentinel = NOTIFY_AUDIENCE_GROUP_IDS[notifyAudience]
    return { ...rest, groups: [...(groups ?? []), sentinel] } as Omit<T, 'notifyAudience'>
}
