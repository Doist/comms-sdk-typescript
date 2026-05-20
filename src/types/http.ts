export const HTTP_METHODS = ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'] as const
export type HttpMethod = (typeof HTTP_METHODS)[number]

export type HttpResponse<T = unknown> = {
    data: T
    status: number
    headers: Record<string, string>
}

export type RequestConfig = {
    baseURL?: string
    headers?: Record<string, string>
    timeout?: number
}

/**
 * Custom fetch response interface for cross-platform HTTP clients.
 * This minimal interface allows custom HTTP implementations (e.g., Obsidian's requestUrl,
 * Electron's net module, React Native's networking) to work with the SDK.
 */
export type CustomFetchResponse = {
    ok: boolean
    status: number
    statusText: string
    headers: Record<string, string>
    text(): Promise<string>
    json(): Promise<unknown>
}

/**
 * Custom fetch function type for providing alternative HTTP implementations.
 * This enables the SDK to work in restrictive environments like Obsidian plugins,
 * browser extensions, Electron apps, React Native, and enterprise environments
 * with specific networking requirements.
 *
 * @param url - The URL to fetch
 * @param options - Standard RequestInit options plus optional timeout
 * @returns A promise that resolves to a CustomFetchResponse
 *
 * @example
 * ```typescript
 * // Obsidian plugin example
 * const obsidianFetch: CustomFetch = async (url, options) => {
 *   const response = await requestUrl({ url, method: options?.method, body: options?.body })
 *   return {
 *     ok: response.status >= 200 && response.status < 300,
 *     status: response.status,
 *     statusText: '',
 *     headers: response.headers,
 *     text: async () => response.text,
 *     json: async () => response.json,
 *   }
 * }
 * ```
 */
export type CustomFetch = (
    url: string,
    options?: RequestInit & { timeout?: number },
) => Promise<CustomFetchResponse>
