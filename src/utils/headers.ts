import type { CustomHeaders } from '../types/http'

/**
 * Merges header records left to right. HTTP header names are case-insensitive,
 * so a later record replaces any earlier header with the same name whatever
 * its case. Without this, a caller's `authorization` would sit alongside the
 * SDK's `Authorization` and `fetch` would join the two into one value.
 */
export function mergeHeaders(
    ...sources: (Record<string, string> | undefined)[]
): Record<string, string> {
    const merged: Record<string, string> = {}
    for (const source of sources) {
        if (!source) continue
        for (const [name, value] of Object.entries(source)) {
            const lowerName = name.toLowerCase()
            for (const existingName of Object.keys(merged)) {
                if (existingName.toLowerCase() === lowerName) delete merged[existingName]
            }
            merged[name] = value
        }
    }
    return merged
}

/**
 * Turns the `headers` option into the record to send with one request, calling
 * it when it is a function so per-request values are fresh.
 */
export function resolveCustomHeaders(
    headers: CustomHeaders | undefined,
): Record<string, string> | undefined {
    return typeof headers === 'function' ? headers() : headers
}
