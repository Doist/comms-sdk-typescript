import { CustomError } from 'ts-custom-error'

export class CommsRequestError extends CustomError {
    public httpStatusCode?: number
    public responseData?: unknown

    constructor(
        message: string,
        httpStatusCode?: number,
        responseData?: unknown,
        options?: ErrorOptions,
    ) {
        super(message, options)
        this.httpStatusCode = httpStatusCode
        this.responseData = responseData
    }
}

function hasStatus(error: unknown, status: number): error is CommsRequestError {
    return error instanceof CommsRequestError && error.httpStatusCode === status
}

function getResponseField(error: unknown, field: string): unknown {
    if (!(error instanceof CommsRequestError)) return undefined
    const data = error.responseData
    if (typeof data !== 'object' || data === null || !(field in data)) return undefined
    return (data as Record<string, unknown>)[field]
}

/**
 * The numeric `error_code` the API sends in an error body, when there was one.
 *
 * @param error - The thrown value to inspect.
 * @returns The code, or `null` when the error is not a
 * {@link CommsRequestError} or carried no numeric `error_code`.
 */
export function getCommsErrorCode(error: unknown): number | null {
    const code = getResponseField(error, 'error_code')
    return typeof code === 'number' ? code : null
}

/**
 * The `error_string` the API sends alongside `error_code`, when there was one.
 * It is a server-authored message rather than a stable contract, so branch on
 * {@link getCommsErrorCode} and use this for display.
 *
 * @param error - The thrown value to inspect.
 * @returns The message, or `null` when the error is not a
 * {@link CommsRequestError} or carried no string `error_string`.
 */
export function getCommsErrorString(error: unknown): string | null {
    const message = getResponseField(error, 'error_string')
    return typeof message === 'string' ? message : null
}

/**
 * True when the request failed with a 404.
 *
 * @example
 * ```typescript
 * try {
 *     await api.threads.getThread(id)
 * } catch (error) {
 *     if (isNotFound(error)) return null
 *     throw error
 * }
 * ```
 */
export function isNotFound(error: unknown): boolean {
    return hasStatus(error, 404)
}

/**
 * True when the request failed with a 409. The API uses this both for genuine
 * conflicts and for a malformed id, so narrow with {@link isMalformedId}
 * before reporting one as the other.
 */
export function isConflict(error: unknown): boolean {
    return hasStatus(error, 409)
}

/**
 * True when the API rejected an id as malformed: a 409 carrying `error_code`
 * 217, which it sends both for a value that does not base58-decode to 16 bytes
 * and for one whose version nibble is not 7. That is a bad reference rather
 * than a conflict, so it usually deserves a different message from
 * {@link isConflict}.
 *
 * @example
 * ```typescript
 * if (isMalformedId(error)) throw new Error(`Not a valid Comms id: ${ref}`)
 * ```
 */
export function isMalformedId(error: unknown): boolean {
    return isConflict(error) && getCommsErrorCode(error) === 217
}
