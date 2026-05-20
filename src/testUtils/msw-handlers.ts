import { HttpResponse, http } from 'msw'

const BASE_URL = 'https://comms.todoist.com'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/**
 * Creates a successful API response with the given data
 */
export function createSuccessResponse(data: JsonValue) {
    return HttpResponse.json(data, { status: 200 })
}

/**
 * Creates an error API response
 */
export function createErrorResponse(errorCode: string, errorMessage: string, status = 400) {
    return HttpResponse.json(
        {
            error_code: errorCode,
            error_string: errorMessage,
        },
        { status },
    )
}

/**
 * Helper to create API endpoint URL
 */
export function apiUrl(path: string): string {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    return `${BASE_URL}/${cleanPath}`
}

/**
 * Creates a handler for a GET endpoint
 */
export function createGetHandler(endpoint: string, responseData: JsonValue) {
    return http.get(apiUrl(endpoint), () => {
        return createSuccessResponse(responseData)
    })
}

/**
 * Creates a handler for a POST endpoint
 */
export function createPostHandler(endpoint: string, responseData: JsonValue) {
    return http.post(apiUrl(endpoint), () => {
        return createSuccessResponse(responseData)
    })
}

/**
 * Export http from msw for custom handlers
 */
export { http, HttpResponse }
