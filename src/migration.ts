import { request } from './transport/http-client'
import { CommsRequestError } from './types/errors'
import type { CustomFetch } from './types/http'

/**
 * Default origin of the Twist migration backend.
 *
 * The `fetch_new_url` endpoint lives on Twist (`twist.com`) and authenticates
 * with a **Twist** token, not a Comms one. This is why the migration helpers are
 * standalone functions rather than methods on {@link CommsApi} (which is
 * constructed with a Comms token).
 */
const DEFAULT_TWIST_BASE_URL = 'https://twist.com'

function getTwistMigrationUrl(baseUrl?: string): string {
    const base = baseUrl ?? DEFAULT_TWIST_BASE_URL
    const trimmed = base.endsWith('/') ? base.slice(0, -1) : base
    return `${trimmed}/api/comms_migration/fetch_new_url`
}

export type MigrationOptions = {
    /** Optional custom base URL for the Twist migration endpoint (testing/self-host). */
    baseUrl?: string
    /** Optional custom fetch implementation for cross-platform compatibility. */
    customFetch?: CustomFetch
}

export type FetchNewCommsUrlArgs = {
    /** A `twist.com` URL to translate to its Comms equivalent. */
    oldUrl: string
    /** A Twist (not Comms) auth token. */
    twistToken: string
}

export type FetchNewCommsUrlsArgs = {
    /** The `twist.com` URLs to translate to their Comms equivalents. */
    oldUrls: string[]
    /** A Twist (not Comms) auth token. */
    twistToken: string
}

/**
 * Result of translating a single URL in a batch migration. Discriminated by the
 * presence of `newUrl` (success) or `error` (failure).
 */
export type MigrationResult =
    | { oldUrl: string; newUrl: string; error?: undefined }
    | { oldUrl: string; newUrl?: undefined; error: CommsRequestError }

/**
 * Translates a Twist URL to its equivalent Comms URL using Twist's
 * `comms_migration/fetch_new_url` endpoint.
 *
 * Authenticates with a **Twist** token (external to the Comms SDK), so this is a
 * standalone helper rather than a method on {@link CommsApi}.
 *
 * @example
 * ```typescript
 * const newUrl = await fetchNewCommsUrl({
 *   oldUrl: 'https://twist.com/a/123/ch/456/t/789',
 *   twistToken: process.env.TWIST_AUTH_TOKEN,
 * })
 * ```
 *
 * @returns The equivalent Comms URL.
 * @throws {@link CommsRequestError} If the request fails. URLs that cannot be
 * migrated surface as a thrown error too: `400` with `responseData.error.code`
 * of `'invalid_url'`, or `404` with `'not_imported'`.
 */
export async function fetchNewCommsUrl(
    args: FetchNewCommsUrlArgs,
    options?: MigrationOptions,
): Promise<string> {
    const response = await request<{ newUrl?: string }>({
        httpMethod: 'POST',
        baseUri: getTwistMigrationUrl(options?.baseUrl),
        relativePath: '',
        apiToken: args.twistToken,
        payload: { oldUrl: args.oldUrl },
        customFetch: options?.customFetch,
    })

    const newUrl = response.data?.newUrl
    if (!newUrl) {
        throw new CommsRequestError(
            'Migration response did not contain a new URL.',
            response.status,
            response.data,
        )
    }

    return newUrl
}

/**
 * Translates multiple Twist URLs to their equivalent Comms URLs.
 *
 * URLs are processed **sequentially** to stay friendly to the rate-sensitive
 * migration endpoint. A failure on one URL does not abort the run: each result
 * carries either a `newUrl` (success) or a `CommsRequestError` (failure), in the
 * same order as the input.
 *
 * @example
 * ```typescript
 * const results = await fetchNewCommsUrls({
 *   oldUrls: ['https://twist.com/a/1/ch/2/t/3', 'https://twist.com/bad'],
 *   twistToken: process.env.TWIST_AUTH_TOKEN,
 * })
 * for (const result of results) {
 *   if (result.newUrl) console.log(`${result.oldUrl} -> ${result.newUrl}`)
 *   else console.warn(`${result.oldUrl} failed`, result.error)
 * }
 * ```
 *
 * @returns One {@link MigrationResult} per input URL, in input order.
 * @throws Re-throws any error that is not a {@link CommsRequestError}.
 */
export async function fetchNewCommsUrls(
    args: FetchNewCommsUrlsArgs,
    options?: MigrationOptions,
): Promise<MigrationResult[]> {
    const results: MigrationResult[] = []

    for (const oldUrl of args.oldUrls) {
        try {
            const newUrl = await fetchNewCommsUrl({ oldUrl, twistToken: args.twistToken }, options)
            results.push({ oldUrl, newUrl })
        } catch (error) {
            if (error instanceof CommsRequestError) {
                results.push({ oldUrl, error })
            } else {
                throw error
            }
        }
    }

    return results
}
