import { v4 as uuid } from 'uuid'
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
 * content type, ready to be encoded into the multipart body.
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
 * Escapes a value for use inside a quoted `Content-Disposition` parameter, where a raw
 * quote would end the value early and a raw CR or LF would end the header. A lone CR
 * needs escaping too, not just CRLF pairs.
 *
 * This is the same escaping the platform's own `FormData` encoder applies, so servers
 * see exactly what they would from any browser.
 */
function escapeDispositionValue(value: string): string {
    return value.replace(/"/g, '%22').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
}

/**
 * Rejects a media type that could not be safely written into a part header.
 *
 * `contentType` is public caller input and reaches the header verbatim. A value
 * carrying a CR or LF would end the header early and let the caller forge one
 * of its own — `Blob` normalises the `type` it stores, but the supplied value
 * is what gets interpolated. Reject rather than silently rewrite, so a caller
 * passing something unusable finds out instead of having it altered.
 */
function assertHeaderSafeContentType(contentType: string): void {
    if (!/^[\x20-\x7e]*$/.test(contentType)) {
        throw new Error(
            'contentType must contain only printable ASCII characters, without CR or LF',
        )
    }
}

/**
 * Encodes a `multipart/form-data` body as a `Blob`, together with the `Content-Type`
 * that describes it.
 *
 * Deliberately avoids `FormData`. A `FormData` body is only encoded by the `fetch` that
 * owns that `FormData` class — undici brands its own and checks it with a plain
 * `instanceof` — and the SDK dispatches through undici's own `fetch` to keep the request
 * client on the same undici as the dispatcher. A global `FormData` handed to it is
 * stringified to the literal `"[object FormData]"`, so the upload silently carries no
 * file. `Blob` has no such brand and works with whichever `fetch` sends the request,
 * including a caller-supplied `customFetch`.
 */
function buildMultipartBody(args: {
    blob: Blob
    fileName: string
    contentType: string
    fields: Record<string, string | number | boolean | undefined | null>
}): { body: Blob; contentType: string } {
    const { blob, fileName, contentType, fields } = args
    assertHeaderSafeContentType(contentType)
    const boundary = `----comms-sdk-${uuid()}`
    const parts: BlobPart[] = [
        `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="file"; filename="${escapeDispositionValue(fileName)}"\r\n` +
            `Content-Type: ${contentType}\r\n\r\n`,
        blob,
        '\r\n',
    ]

    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null) {
            parts.push(
                `--${boundary}\r\n` +
                    `Content-Disposition: form-data; name="${escapeDispositionValue(key)}"\r\n\r\n` +
                    `${String(value)}\r\n`,
            )
        }
    }

    parts.push(`--${boundary}--\r\n`)

    return { body: new Blob(parts), contentType: `multipart/form-data; boundary=${boundary}` }
}

/**
 * Upload a file using `multipart/form-data`.
 *
 * Encodes the request body as a `Blob` so it works unchanged in the browser and in
 * Node.js, whichever `fetch` ends up sending it. The `file` part is sent alongside `file_name`,
 * `file_size`, and `underlying_type` fields (the canonical Comms upload shape); any
 * `additionalFields` are merged in and override the derived values. Authentication uses
 * `Authorization: Bearer`, matching every other Comms SDK client.
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

    const multipart = buildMultipartBody({
        blob,
        fileName: resolvedFileName,
        contentType: resolvedType,
        fields,
    })

    const headers: Record<string, string> = {
        Authorization: `Bearer ${authToken}`,
        // The boundary is ours, so this has to be declared explicitly — `fetch`
        // only fills it in for a `FormData` body.
        'Content-Type': multipart.contentType,
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
            body: multipart.body,
            timeout: 30000,
        },
        maxRetries,
        customFetch,
    )

    return response.data
}
