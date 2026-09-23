import { z } from 'zod'

import { ENDPOINT_ATTACHMENTS, ENDPOINT_FILES } from '../consts/endpoints'
import { request } from '../transport/http-client'
import { type Attachment, AttachmentSchema } from '../types/entities'
import type { UploadAttachmentArgs } from '../types/requests'
import { uploadMultipartFile } from '../utils/multipart-upload'
import {
    isValidUuidV7Base58,
    resolveCreateId,
    resolveReferenceId,
    UuidV7Error,
} from '../utils/uuidv7'
import { BaseClient } from './base-client'

/**
 * Resolve the `attachment_id`: validate a caller-supplied value (throwing an
 * {@link UuidV7Error} that names `attachmentId` rather than the generic `id`) or
 * mint a fresh one. Wraps {@link resolveCreateId} so the error contract matches the
 * client's actual parameter.
 */
function resolveAttachmentId(attachmentId: string | undefined): string {
    if (attachmentId !== undefined && !isValidUuidV7Base58(attachmentId)) {
        throw new UuidV7Error(
            `invalid attachmentId ${JSON.stringify(attachmentId)} — use generateId() or omit \`attachmentId\` and let the SDK mint one.`,
        )
    }
    return resolveCreateId(attachmentId)
}

export const IMAGE_READ_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type ImageReadMimeType = (typeof IMAGE_READ_MIME_TYPES)[number]
export const ImageReadResultSchema = z.object({
    mimeType: z.enum(IMAGE_READ_MIME_TYPES),
    dataBase64: z.string().min(1).max(5_592_408).base64(),
    byteLength: z
        .number()
        .int()
        .positive()
        .max(4 * 1024 * 1024),
})
export type ImageReadResult = z.infer<typeof ImageReadResultSchema>

/**
 * Client for uploading attachments and reading thread images.
 *
 * Attachments are uploaded independently, then referenced by passing the returned
 * {@link Attachment} into the `attachments` array of `comments.createComment`,
 * `conversationMessages.createMessage`, and similar calls.
 */
export class AttachmentsClient extends BaseClient {
    /** Read one thread image under the caller's content scope. */
    async readImage(uploadId: string, threadId: string): Promise<ImageReadResult> {
        const id = resolveReferenceId(uploadId, 'uploadId')
        const checkedThreadId = resolveReferenceId(threadId, 'threadId')
        const response = await request<unknown>({
            httpMethod: 'GET',
            baseUri: this.getBaseUri(),
            relativePath: `${ENDPOINT_FILES}/image/${checkedThreadId}/${id}`,
            apiToken: this.apiToken,
            customFetch: this.customFetch,
        })
        return ImageReadResultSchema.parse(response.data)
    }

    /**
     * Uploads a file and returns the created {@link Attachment}.
     *
     * Mirrors the canonical multipart upload: `POST /attachments/upload` with the `file`
     * binary plus `file_name`, `file_size`, `attachment_id`, and `underlying_type` form
     * fields.
     *
     * @param args - The file to upload and optional metadata.
     * @returns The created attachment, ready to attach to a comment or message.
     *
     * @example
     * ```typescript
     * import { readFile } from 'node:fs/promises'
     *
     * const attachment = await api.attachments.upload({
     *   file: await readFile('./diagram.png'),
     *   fileName: 'diagram.png',
     * })
     *
     * await api.comments.createComment({
     *   threadId: '7YpL3oZ4kZ9vP7Q1tR2sX3z',
     *   content: 'See attached',
     *   attachments: [attachment],
     * })
     * ```
     */
    async upload(args: UploadAttachmentArgs): Promise<Attachment> {
        const data = await uploadMultipartFile<unknown>({
            baseUrl: this.getBaseUri(),
            authToken: this.apiToken,
            endpoint: `${ENDPOINT_ATTACHMENTS}/upload`,
            file: args.file,
            fileName: args.fileName,
            contentType: args.contentType,
            additionalFields: {
                attachment_id: resolveAttachmentId(args.attachmentId),
            },
            customFetch: this.customFetch,
        })

        return AttachmentSchema.parse(data)
    }
}
