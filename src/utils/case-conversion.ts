import camelcase from 'camelcase'

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isArray(value: unknown): value is unknown[] {
    return Array.isArray(value)
}

function toSnakeCase(str: string): string {
    return str
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
}

/**
 * @internal
 */
export function camelCaseKeys(obj: unknown): unknown {
    if (isArray(obj)) {
        return obj.map(camelCaseKeys)
    }

    if (isObject(obj)) {
        const result: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(obj)) {
            const camelKey = camelcase(key)
            result[camelKey] = camelCaseKeys(value)
        }
        return result
    }

    return obj
}

/**
 * @internal
 */
export function snakeCaseKeys(obj: unknown): unknown {
    if (isArray(obj)) {
        return obj.map(snakeCaseKeys)
    }

    if (isObject(obj)) {
        const result: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(obj)) {
            const snakeKey = toSnakeCase(key)
            result[snakeKey] = snakeCaseKeys(value)
        }
        return result
    }

    return obj
}
