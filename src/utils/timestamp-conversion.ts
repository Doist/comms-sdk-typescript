/**
 * Converts a Unix timestamp (in seconds) to a Date object.
 * @param timestamp - Unix timestamp in seconds
 * @returns Date object
 */
export function timestampToDate(timestamp: number): Date {
    return new Date(timestamp * 1000)
}

const timestampFieldTargetOverrides = new Map([['pinnedTs', 'pinnedDate']])

/**
 * Recursively transforms timestamp fields (ending in 'Ts') in an object to Date objects.
 * Also renames converted fields by removing the 'Ts' suffix.
 * @param obj - The object to transform
 * @returns The transformed object with Date fields
 */
export function transformTimestamps<T>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => transformTimestamps(item)) as T
    }

    if (typeof obj === 'object') {
        const result: Record<string, unknown> = {}

        for (const [key, value] of Object.entries(obj)) {
            // Check if the key ends with 'Ts'
            if (key.endsWith('Ts')) {
                const overriddenTargetKey = timestampFieldTargetOverrides.get(key)

                if (typeof value === 'number') {
                    // Remove 'Ts' suffix and convert to Date
                    const newKey = key.slice(0, -2)
                    // If the base key already exists in the original object, use *Date suffix
                    // to avoid overwriting it (e.g. posted + postedTs → posted + postedDate)
                    const targetKey =
                        overriddenTargetKey ??
                        (newKey in (obj as Record<string, unknown>) ? `${newKey}Date` : newKey)
                    result[targetKey] = timestampToDate(value)
                    continue
                }

                if (overriddenTargetKey) {
                    result[overriddenTargetKey] = value
                    continue
                }
            }

            if (typeof value === 'object' && value !== null) {
                // Recursively transform nested objects
                result[key] = transformTimestamps(value)
                continue
            }

            result[key] = value
        }

        return result as T
    }

    return obj
}
