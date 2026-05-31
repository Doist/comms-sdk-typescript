import { fetchWithRetry } from '../transport/fetch-with-retry'
import type { CustomFetch } from '../types/http'

/**
 * File content accepted by the upload helpers.
 *
 * - `Blob`/`File` — browser, or any runtime with a global `Blob` (Node 18+).
 * - `Uint8Array` — raw bytes (requires `fileName`). A Node `Buffer` is a `Uint8Array`,
 *   so reading a file with `fs` and passing the result works without conversion.
 *
 * Both are universal types, so the published `.d.ts` stays free of Node-only globals
 * (`Buffer`, `NodeJS.*`) and the helper pulls in no Node built-ins — keeping the browser
 * bundle clean.
 */
export type UploadFile = Blob | Uint8Array

type UploadMultipartFileArgs = {
    /** Base API URI with trailing slash, e.g. `https://comms.todoist.com/api/v1/`. */
    baseUrl: string
    /** API token used for `Authorization: Bearer`. */
    authToken: string
    /** Relative endpoint path, e.g. `attachments/upload`. */
    endpoint: string
    /** File content to upload. */
    file: UploadFile
    /** File name. Required for raw `Uint8Array` bytes; inferred from a `File`. */
    fileName?: string
    /** MIME type. Defaults to the `Blob`'s type or one inferred from the file extension. */
    contentType?: string
    /** Extra multipart fields to send alongside the file metadata fields. */
    additionalFields?: Record<string, string | number | boolean | undefined | null>
    /**
     * Network-error retry count. Defaults to `0` — unlike JSON requests, a retry here
     * resends the entire file body, so large uploads aren't retried automatically.
     */
    maxRetries?: number
    /** Optional request ID for tracing. */
    requestId?: string
    /** Optional custom fetch implementation. */
    customFetch?: CustomFetch
}

/**
 * Determine a content-type from a filename extension. Falls back to
 * `application/octet-stream` for unknown extensions.
 */
export function getContentTypeFromFileName(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop()
    return extension ? (MIME_BY_EXTENSION[extension] ?? DEFAULT_MIME_TYPE) : DEFAULT_MIME_TYPE
}

const DEFAULT_MIME_TYPE = 'application/octet-stream'

/**
 * Extension → MIME map covering the formats commonly attached to messages.
 * Anything not listed falls back to {@link DEFAULT_MIME_TYPE}; callers can
 * always override via the `contentType` argument.
 */
const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    heic: 'image/heic',
    heif: 'image/heif',
    avif: 'image/avif',
    // Documents / text
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html',
    htm: 'text/html',
    rtf: 'application/rtf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archives
    zip: 'application/zip',
    gz: 'application/gzip',
    tar: 'application/x-tar',
    '7z': 'application/x-7z-compressed',
    rar: 'application/vnd.rar',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
    aac: 'audio/aac',
    // Video
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
}

/**
 * Normalise a supported {@link UploadFile} into a `Blob` plus a resolved file name and
 * content type, so uploads use the cross-platform global `FormData`/`Blob` body that
 * `undici` and browsers both accept natively.
 */
function toBlob(
    file: UploadFile,
    fileName: string | undefined,
    contentType: string | undefined,
): { blob: Blob; fileName: string; contentType: string } {
    if (file instanceof Blob) {
        // Duck-type the name rather than `instanceof File`: `File` isn't a global in
        // Node 18, so a `node:buffer` `File` (which carries a real `name`) would
        // otherwise fall back to `'upload'` and lose its inferred file name.
        const blobName = (file as { name?: unknown }).name
        const name = fileName || (typeof blobName === 'string' ? blobName : undefined) || 'upload'
        const type = contentType || file.type || getContentTypeFromFileName(name)
        // Re-wrap only when stamping a type the Blob doesn't already carry.
        const blob = file.type === type ? file : new Blob([file], { type })
        return { blob, fileName: name, contentType: type }
    }

    if (file instanceof Uint8Array) {
        if (!fileName) {
            throw new Error('fileName is required when uploading raw bytes')
        }
        const type = contentType || getContentTypeFromFileName(fileName)
        // `Blob` accepts any `ArrayBufferView`; the cast satisfies the stricter lib
        // `BlobPart` type (which pins the backing buffer to `ArrayBuffer`).
        return { blob: new Blob([file as BlobPart], { type }), fileName, contentType: type }
    }

    throw new Error('Unsupported file type for upload: expected a Blob or Uint8Array')
}

/**
 * Upload a file using `multipart/form-data`.
 *
 * Builds the request body with the global `FormData`/`Blob` so it works unchanged in the
 * browser and in Node.js (via `undici`). The `file` part is sent alongside `file_name`,
 * `file_size`, and `underlying_type` fields (the canonical Comms upload shape); any
 * `additionalFields` are merged in and override the derived values. Authentication uses
 * `Authorization: Bearer`, matching every other Comms SDK client, and `Content-Type` is
 * intentionally left unset so the runtime adds the correct multipart boundary.
 *
 * The response is JSON-parsed and camel-cased by {@link fetchWithRetry}; callers validate
 * the returned shape with the appropriate schema.
 */
export async function uploadMultipartFile<T>(args: UploadMultipartFileArgs): Promise<T> {
    const {
        baseUrl,
        authToken,
        endpoint,
        file,
        fileName,
        contentType,
        additionalFields,
        maxRetries = 0,
        requestId,
        customFetch,
    } = args

    const {
        blob,
        fileName: resolvedFileName,
        contentType: resolvedType,
    } = toBlob(file, fileName, contentType)

    const fields: Record<string, string | number | boolean | undefined | null> = {
        file_name: resolvedFileName,
        file_size: blob.size,
        underlying_type: resolvedType,
        ...additionalFields,
    }

    const form = new FormData()
    form.append('file', blob, resolvedFileName)
    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null) {
            form.append(key, String(value))
        }
    }

    const headers: Record<string, string> = {
        Authorization: `Bearer ${authToken}`,
    }
    if (requestId) {
        headers['X-Request-Id'] = requestId
    }

    const url = new URL(endpoint, baseUrl).toString()

    const response = await fetchWithRetry<T>(
        url,
        {
            method: 'POST',
            headers,
            body: form,
            // Don't set Content-Type — the runtime adds the multipart boundary.
            timeout: 30000,
        },
        maxRetries,
        customFetch,
    )

    return response.data
}
