import { AttachmentSchema } from './entities'

describe('AttachmentSchema', () => {
    it('parses a minimal payload (only required fields)', () => {
        const result = AttachmentSchema.parse({
            attachmentId: 'abc123',
            urlType: 'file',
        })
        expect(result.attachmentId).toBe('abc123')
        expect(result.urlType).toBe('file')
    })

    it('parses a full file attachment', () => {
        const result = AttachmentSchema.parse({
            attachmentId: 'abc123',
            urlType: 'file',
            title: 'spec.pdf',
            url: 'https://files.comms.todoist.com/abc/spec.pdf',
            fileName: 'spec.pdf',
            fileSize: 12345,
            underlyingType: 'application/pdf',
            uploadState: 'uploaded',
        })
        expect(result.fileSize).toBe(12345)
        expect(result.underlyingType).toBe('application/pdf')
        expect(result.uploadState).toBe('uploaded')
    })

    it('parses an image attachment with dimensions', () => {
        const result = AttachmentSchema.parse({
            attachmentId: 'img1',
            urlType: 'image',
            image: 'https://files.comms.todoist.com/abc/photo.png',
            imageWidth: 1920,
            imageHeight: 1080,
            underlyingType: 'image/png',
        })
        expect(result.imageWidth).toBe(1920)
        expect(result.imageHeight).toBe(1080)
    })

    it('parses an unfurled GIF with video fields', () => {
        const result = AttachmentSchema.parse({
            attachmentId: 'gif1',
            urlType: 'image',
            image: 'https://media.giphy.com/abc/giphy.gif',
            video: 'https://media.giphy.com/abc/giphy.mp4',
            videoType: 'video/mp4',
            videoAutoPlay: true,
        })
        expect(result.video).toBe('https://media.giphy.com/abc/giphy.mp4')
        expect(result.videoAutoPlay).toBe(true)
    })

    it('parses a link preview (url_type: website)', () => {
        const result = AttachmentSchema.parse({
            attachmentId: 'link1',
            urlType: 'website',
            url: 'https://example.com',
            title: 'Example',
            description: 'A useful page',
        })
        expect(result.urlType).toBe('website')
        expect(result.description).toBe('A useful page')
    })

    it('preserves unknown fields (loose schema)', () => {
        const result = AttachmentSchema.parse({
            attachmentId: 'abc',
            urlType: 'file',
            // Hypothetical future backend field the SDK does not know about yet
            futureField: 'preserved',
        }) as Record<string, unknown>
        expect(result.futureField).toBe('preserved')
    })

    it('rejects payloads missing attachmentId', () => {
        expect(() => AttachmentSchema.parse({ urlType: 'file' })).toThrow()
    })

    it('rejects payloads missing urlType', () => {
        expect(() => AttachmentSchema.parse({ attachmentId: 'x' })).toThrow()
    })

    it('rejects a negative fileSize', () => {
        expect(() =>
            AttachmentSchema.parse({
                attachmentId: 'x',
                urlType: 'file',
                fileSize: -1,
            }),
        ).toThrow()
    })
})
