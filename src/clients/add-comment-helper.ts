import { ENDPOINT_COMMENTS } from '../consts/endpoints'
import { request } from '../transport/http-client'
import { type Comment, CommentSchema } from '../types/entities'
import { NOTIFY_AUDIENCE_GROUP_IDS, NOTIFY_AUDIENCES, type NotifyAudience } from '../types/enums'
import type { CustomFetch } from '../types/http'
import type { CreateCommentArgs, ThreadAction } from '../types/requests'
import { resolveCreateId } from '../utils/uuidv7'

type ClientContext = {
    baseUri: string
    apiToken: string
    customFetch?: CustomFetch
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

function applyNotifyAudience(params: CreateCommentArgs): Omit<CreateCommentArgs, 'notifyAudience'> {
    const offenses = [
        collectMarkerOffenses('groups', params.groups ?? undefined),
        collectMarkerOffenses('directGroupMentions', params.directGroupMentions ?? undefined),
    ].filter((o): o is { field: string; offending: string[] } => o !== null)

    if (offenses.length > 0) {
        const details = offenses
            .map(({ field, offending }) => `\`${field}\` contains ${offending.join(', ')}`)
            .join('; ')
        throw new Error(
            `Reserved broadcast marker IDs found: ${details}. Pass these via \`notifyAudience\` on createComment / closeThread / reopenThread (e.g. \`notifyAudience: 'channel'\` for EVERYONE) instead of populating \`groups\` / \`directGroupMentions\` directly.`,
        )
    }

    if (params.notifyAudience == null) return params

    if (!isNotifyAudience(params.notifyAudience)) {
        throw new Error(
            `Invalid \`notifyAudience\` value "${String(params.notifyAudience)}". Expected one of: ${NOTIFY_AUDIENCES.join(', ')}.`,
        )
    }

    const sentinel = NOTIFY_AUDIENCE_GROUP_IDS[params.notifyAudience]
    const { notifyAudience: _stripped, groups, ...rest } = params
    return { ...rest, groups: [...(groups ?? []), sentinel] }
}

export function addCommentRequest(
    context: ClientContext,
    params: CreateCommentArgs,
    options?: { threadAction?: ThreadAction },
): Promise<Comment> {
    const normalized = applyNotifyAudience(params)
    const withId = { ...normalized, id: resolveCreateId(normalized.id) }
    const payload = options?.threadAction
        ? { ...withId, threadAction: options.threadAction }
        : withId

    return request<Comment>({
        httpMethod: 'POST',
        baseUri: context.baseUri,
        relativePath: `${ENDPOINT_COMMENTS}/add`,
        apiToken: context.apiToken,
        payload,
        customFetch: context.customFetch,
    }).then((response) => CommentSchema.parse(response.data))
}
