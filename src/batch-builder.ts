import { z } from 'zod'
import { BaseClient } from './clients/base-client'
import { fetchWithRetry } from './transport/fetch-with-retry'
import type {
    BatchApiResponse,
    BatchRequestDescriptor,
    BatchResponse,
    BatchResponseArray,
} from './types/batch'
import { camelCaseKeys, snakeCaseKeys } from './utils/case-conversion'
import { transformTimestamps } from './utils/timestamp-conversion'

/**
 * Executes multiple API requests in a single HTTP call.
 *
 * @example
 * ```typescript
 * const results = await api.batch(
 *   api.workspaceUsers.getUserById(123, 456, { batch: true }),
 *   api.workspaceUsers.getUserById(123, 789, { batch: true })
 * )
 * ```
 */
export class BatchBuilder extends BaseClient {
    private static readonly CHUNK_SIZE = 10

    /**
     * Splits an array of requests into chunks of the specified size.
     */
    private chunkRequests<T>(requests: T[], chunkSize: number): T[][] {
        if (requests.length === 0) {
            return []
        }

        const chunks: T[][] = []
        for (let i = 0; i < requests.length; i += chunkSize) {
            chunks.push(requests.slice(i, i + chunkSize))
        }
        return chunks
    }

    /**
     * Flattens chunked results back into a single array while preserving the original order.
     */
    private flattenChunkedResults<T>(chunkedResults: T[][]): T[] {
        return chunkedResults.flat()
    }

    /**
     * Executes a single chunk of batch requests (up to CHUNK_SIZE).
     * This is the core batch execution logic extracted from the original execute method.
     */
    private async executeSingleBatch<T extends readonly BatchRequestDescriptor<unknown>[]>(
        requests: T,
    ): Promise<BatchResponseArray<T>> {
        if (requests.length === 0) {
            return [] as BatchResponseArray<T>
        }

        // Build the batch requests array
        const batchRequests = requests.map((descriptor) => {
            // Convert params to snake_case
            const snakeCaseParams = descriptor.params
                ? (snakeCaseKeys(descriptor.params) as Record<string, unknown>)
                : undefined

            // Build the full URL with query params for GET requests
            let url = `${this.getBaseUri()}${descriptor.url}`
            if (descriptor.method === 'GET' && snakeCaseParams) {
                const searchParams = new URLSearchParams()
                Object.entries(snakeCaseParams).forEach(([key, value]) => {
                    if (value != null) {
                        if (Array.isArray(value)) {
                            searchParams.append(key, value.join(','))
                        } else {
                            searchParams.append(key, String(value))
                        }
                    }
                })
                const queryString = searchParams.toString()
                if (queryString) {
                    url += `?${queryString}`
                }
            }

            // Build the batch request object
            const batchRequest: { method: string; url: string; body?: string } = {
                method: descriptor.method,
                url,
            }

            // For non-GET requests, add body with URL-encoded params
            if (descriptor.method !== 'GET' && snakeCaseParams) {
                const bodyParams = new URLSearchParams()
                Object.entries(snakeCaseParams).forEach(([key, value]) => {
                    if (value != null) {
                        if (Array.isArray(value)) {
                            bodyParams.append(key, value.join(','))
                        } else {
                            bodyParams.append(key, String(value))
                        }
                    }
                })
                const bodyString = bodyParams.toString()
                if (bodyString) {
                    batchRequest.body = bodyString
                }
            }

            return batchRequest
        })

        // Check if all requests are GET (allows parallel execution)
        const allGets = batchRequests.every((req) => req.method === 'GET')

        // Build form-urlencoded body
        const formData = new URLSearchParams()
        formData.append('requests', JSON.stringify(batchRequests))
        if (allGets) {
            formData.append('parallel', 'true')
        }

        // Execute the batch request using fetchWithRetry for consistency and retry logic
        const url = `${this.getBaseUri()}batch`
        const options: RequestInit = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Bearer ${this.apiToken}`,
            },
            body: formData.toString(),
        }

        const response = await fetchWithRetry<BatchApiResponse[]>(url, options, 3, this.customFetch)

        const batchApiResponses = response.data

        // Process each response
        return batchApiResponses.map((apiResponse, index) => {
            const descriptor = requests[index]

            // Parse the body JSON
            let parsedBody: unknown
            try {
                parsedBody = apiResponse.body ? JSON.parse(apiResponse.body) : undefined
            } catch (_error) {
                parsedBody = apiResponse.body
            }

            // Apply transformations: camelCase -> timestamps
            const camelCased = camelCaseKeys(parsedBody)
            const transformed = transformTimestamps(camelCased)

            // Validate with schema if provided
            let finalData = transformed
            if (descriptor.schema && apiResponse.code >= 200 && apiResponse.code < 300) {
                finalData = descriptor.schema.parse(transformed)
            }

            // Parse headers string into object
            const headers: Record<string, string> = {}
            if (apiResponse.headers && typeof apiResponse.headers === 'string') {
                try {
                    const headerLines = apiResponse.headers.split('\n')
                    headerLines.forEach((line) => {
                        const separatorIndex = line.indexOf(':')
                        if (separatorIndex > 0) {
                            const key = line.substring(0, separatorIndex).trim()
                            const value = line.substring(separatorIndex + 1).trim()
                            headers[key] = value
                        }
                    })
                } catch (error) {
                    // If header parsing fails, just leave headers empty
                    console.error('Failed to parse batch response headers:', error)
                }
            }

            return {
                code: apiResponse.code,
                headers,
                data: finalData,
            }
        }) as BatchResponseArray<T>
    }

    /**
     * Executes multiple API requests with automatic chunking and parallel execution.
     * Transparently handles the 10-request API limitation by splitting large batches
     * into smaller chunks and executing them concurrently.
     *
     * @param requests - Array of batch request descriptors
     * @returns Array of BatchResponse objects with processed data in original order
     * @throws {CommsRequestError} If any batch chunk fails completely
     */
    async execute<T extends readonly BatchRequestDescriptor<unknown>[]>(
        requests: T,
    ): Promise<BatchResponseArray<T>> {
        if (requests.length === 0) {
            return [] as BatchResponseArray<T>
        }

        // If requests fit within a single chunk, use the original single-batch execution
        if (requests.length <= BatchBuilder.CHUNK_SIZE) {
            return this.executeSingleBatch(requests)
        }

        // Split requests into chunks
        const chunks = this.chunkRequests([...requests], BatchBuilder.CHUNK_SIZE)

        // Execute all chunks in parallel
        const chunkPromises = chunks.map((chunk) =>
            this.executeSingleBatch(chunk as readonly BatchRequestDescriptor<unknown>[]).catch(
                (error) => {
                    // Rethrow schema validation errors — they indicate a programming
                    // issue (wrong schema or unexpected API response shape) and should
                    // not be silently swallowed.
                    if (error instanceof z.ZodError) {
                        throw error
                    }
                    // Collect network/request errors but don't fail fast - allow other chunks to complete
                    console.error('Batch chunk failed:', error)
                    // Return error responses for all requests in this chunk
                    return chunk.map(
                        (): BatchResponse<unknown> => ({
                            code: 500,
                            headers: {},
                            data: null,
                        }),
                    )
                },
            ),
        )

        // Wait for all chunks to complete
        const chunkedResults = await Promise.all(chunkPromises)

        // Flatten results back to original order
        return this.flattenChunkedResults(
            chunkedResults as BatchResponse<unknown>[][],
        ) as BatchResponseArray<T>
    }
}
