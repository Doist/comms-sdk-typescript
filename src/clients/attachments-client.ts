import { ENDPOINT_ATTACHMENTS } from '../consts/endpoints'
import { type Attachment, AttachmentSchema } from '../types/entities'
import type { UploadAttachmentArgs } from '../types/requests'
import { uploadMultipartFile } from '../utils/multipart-upload'
import { isValidUuidV7Base58, resolveCreateId, UuidV7Error } from '../utils/uuidv7'
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

/**
 * Client for uploading file attachments to Comms.
 *
 * Attachments are uploaded independently, then referenced by passing the returned
 * {@link Attachment} into the `attachments` array of `comments.createComment`,
 * `conversationMessages.createMessage`, and similar calls.
 */
export class AttachmentsClient extends BaseClient {
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
