/**
 * Supported Comms API versions
 */
export const API_VERSIONS = ['v3', 'v4'] as const
export type ApiVersion = (typeof API_VERSIONS)[number]

export const DEFAULT_API_VERSION: ApiVersion = 'v3'
