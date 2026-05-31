import { HttpResponse, http } from 'msw'
import { apiUrl } from '../testUtils/msw-handlers'
import { server } from '../testUtils/msw-setup'
import { TEST_API_TOKEN } from '../testUtils/test-defaults'
import { generateId, isValidUuidV7Base58 } from '../utils/uuidv7'
import { AttachmentsClient } from './attachments-client'

const UPLOAD_URL = apiUrl('api/v1/attachments/upload')

const mockAttachmentResponse = {
    attachment_id: 'abc-123',
    url_type: 'file',
    file_name: 'diagram.png',
    file_size: 11,
    underlying_type: 'image/png',
    url: 'https://comms.todoist.com/attachments/abc-123/diagram.png',
    upload_state: 'uploaded',
}

describe('AttachmentsClient', () => {
    let client: AttachmentsClient

    beforeEach(() => {
        client = new AttachmentsClient({ apiToken: TEST_API_TOKEN })
    })

    describe('upload', () => {
        it('uploads a Buffer with the canonical multipart fields', async () => {
            let capturedForm: FormData | undefined
            let capturedAuth: string | null = null
            let capturedContentType: string | null = null

            server.use(
                http.post(UPLOAD_URL, async ({ request }) => {
                    capturedAuth = request.headers.get('Authorization')
                    capturedContentType = request.headers.get('Content-Type')
                    capturedForm = await request.formData()
                    return HttpResponse.json(mockAttachmentResponse)
                }),
            )

            const result = await client.upload({
                file: Buffer.from('hello world'),
                fileName: 'diagram.png',
            })

            expect(capturedAuth).toBe(`Bearer ${TEST_API_TOKEN}`)
            // multipart boundary content-type, never application/json
            expect(capturedContentType).toContain('multipart/form-data')

            const file = capturedForm?.get('file')
            expect(file).toBeInstanceOf(Blob)
            expect(capturedForm?.get('file_name')).toBe('diagram.png')
            expect(capturedForm?.get('file_size')).toBe('11')
            expect(capturedForm?.get('underlying_type')).toBe('image/png')
            // A valid ID is generated when none is supplied.
            const attachmentId = capturedForm?.get('attachment_id')
            expect(isValidUuidV7Base58(attachmentId)).toBe(true)

            // Response is camel-cased and validated.
            expect(result.attachmentId).toBe('abc-123')
            expect(result.fileName).toBe('diagram.png')
            expect(result.url).toBe('https://comms.todoist.com/attachments/abc-123/diagram.png')
        })

        it('uses a caller-supplied attachmentId', async () => {
            let capturedForm: FormData | undefined
            const callerId = generateId()

            server.use(
                http.post(UPLOAD_URL, async ({ request }) => {
                    capturedForm = await request.formData()
                    return HttpResponse.json({
                        ...mockAttachmentResponse,
                        attachment_id: callerId,
                    })
                }),
            )

            const result = await client.upload({
                file: Buffer.from('data'),
                fileName: 'notes.txt',
                attachmentId: callerId,
            })

            expect(capturedForm?.get('attachment_id')).toBe(callerId)
            expect(result.attachmentId).toBe(callerId)
        })

        it('uploads a File and infers the file name and type', async () => {
            let capturedForm: FormData | undefined

            server.use(
                http.post(UPLOAD_URL, async ({ request }) => {
                    capturedForm = await request.formData()
                    return HttpResponse.json(mockAttachmentResponse)
                }),
            )

            const blob = new File([new Uint8Array([1, 2, 3, 4])], 'photo.jpg', {
                type: 'image/jpeg',
            })

            await client.upload({ file: blob })

            expect(capturedForm?.get('file_name')).toBe('photo.jpg')
            expect(capturedForm?.get('file_size')).toBe('4')
            expect(capturedForm?.get('underlying_type')).toBe('image/jpeg')
        })

        it('uploads a plain Blob (non-File) and falls back to a default name', async () => {
            let capturedForm: FormData | undefined

            server.use(
                http.post(UPLOAD_URL, async ({ request }) => {
                    capturedForm = await request.formData()
                    return HttpResponse.json(mockAttachmentResponse)
                }),
            )

            // A bare Blob has no `name`, so the helper falls back to `upload` and
            // infers the type from the Blob's own `type`.
            const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })

            await client.upload({ file: blob })

            expect(capturedForm?.get('file')).toBeInstanceOf(Blob)
            expect(capturedForm?.get('file_name')).toBe('upload')
            expect(capturedForm?.get('underlying_type')).toBe('image/png')
        })

        it('honors an explicit contentType override', async () => {
            let capturedForm: FormData | undefined

            server.use(
                http.post(UPLOAD_URL, async ({ request }) => {
                    capturedForm = await request.formData()
                    return HttpResponse.json(mockAttachmentResponse)
                }),
            )

            // `data.bin` would infer application/octet-stream; the override wins.
            await client.upload({
                file: new Uint8Array([1, 2, 3]),
                fileName: 'data.bin',
                contentType: 'text/csv',
            })

            expect(capturedForm?.get('underlying_type')).toBe('text/csv')
        })

        it('uploads a Uint8Array', async () => {
            let capturedForm: FormData | undefined

            server.use(
                http.post(UPLOAD_URL, async ({ request }) => {
                    capturedForm = await request.formData()
                    return HttpResponse.json(mockAttachmentResponse)
                }),
            )

            await client.upload({ file: new Uint8Array([1, 2, 3]), fileName: 'bytes.bin' })

            expect(capturedForm?.get('file')).toBeInstanceOf(Blob)
            expect(capturedForm?.get('file_name')).toBe('bytes.bin')
            expect(capturedForm?.get('file_size')).toBe('3')
            expect(capturedForm?.get('underlying_type')).toBe('application/octet-stream')
        })

        it('throws when uploading raw bytes without a fileName', async () => {
            await expect(
                // @ts-expect-error — the discriminated union requires `fileName` for raw
                // bytes at compile time; this asserts the runtime guard still fires.
                client.upload({ file: Buffer.from('x') }),
            ).rejects.toThrow('fileName is required when uploading raw bytes')
        })

        it('rejects an invalid attachmentId before sending the request', async () => {
            let handlerCalled = false

            server.use(
                http.post(UPLOAD_URL, () => {
                    handlerCalled = true
                    return HttpResponse.json(mockAttachmentResponse)
                }),
            )

            await expect(
                client.upload({
                    file: Buffer.from('x'),
                    fileName: 'notes.txt',
                    attachmentId: 'not-a-valid-id',
                }),
            ).rejects.toThrow(/invalid attachmentId/)

            expect(handlerCalled).toBe(false)
        })
    })
})
