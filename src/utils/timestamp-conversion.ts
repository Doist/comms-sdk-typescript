/**
 * Converts a Unix timestamp (in seconds) to a Date object.
 * @param timestamp - Unix timestamp in seconds
 * @returns Date object
 */
export function timestampToDate(timestamp: number): Date {
    return new Date(timestamp * 1000)
}

/**
 * Recursively transforms all timestamp fields (ending in 'Ts') in an object to Date objects.
 * Also renames the fields by removing the 'Ts' suffix.
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
            // Check if the key ends with 'Ts' and the value is a number
            if (key.endsWith('Ts') && typeof value === 'number') {
                // Remove 'Ts' suffix and convert to Date
                const newKey = key.slice(0, -2)
                // If the base key already exists in the original object, use *Date suffix
                // to avoid overwriting it (e.g. pinned + pinnedTs → pinned + pinnedDate)
                const targetKey =
                    newKey in (obj as Record<string, unknown>) ? `${newKey}Date` : newKey
                result[targetKey] = timestampToDate(value)
            } else if (typeof value === 'object' && value !== null) {
                // Recursively transform nested objects
                result[key] = transformTimestamps(value)
            } else {
                result[key] = value
            }
        }

        return result as T
    }

    return obj
}
