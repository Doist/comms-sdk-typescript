import {
    AttachmentSchema,
    createChannelSchema,
    createInboxThreadSchema,
    RequestAttachmentSchema,
} from './entities'

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

describe('RequestAttachmentSchema', () => {
    it('strips unknown keys so caller typos are not forwarded on the wire', () => {
        const result = RequestAttachmentSchema.parse({
            attachmentId: 'abc',
            urlType: 'file',
            // Off-spec / typo'd field a caller might pass by mistake
            fileNam: 'oops.pdf',
        }) as Record<string, unknown>
        expect(result).not.toHaveProperty('fileNam')
    })

    it('still requires attachmentId and urlType', () => {
        expect(() => RequestAttachmentSchema.parse({ urlType: 'file' })).toThrow()
        expect(() => RequestAttachmentSchema.parse({ attachmentId: 'x' })).toThrow()
    })
})

describe('entity url factories', () => {
    const base = 'https://comms.example.com'
    const channelId = '7YpL3oZ4kZ9vP7Q1tR2sX44'
    const threadId = '7YpL3oZ4kZ9vP7Q1tR2sX3z'
    const commentThreadId = '7YpL3oZ4kZ9vP7Q1tR2sX55'
    const commentId = '7YpL3oZ4kZ9vP7Q1tR2sX41'

    it('threads the link base into the generated url', () => {
        const channel = {
            id: channelId,
            name: 'Engineering',
            creator: 1,
            public: true,
            workspaceId: 1,
            archived: false,
            created: new Date(),
            version: 1,
        }
        expect(createChannelSchema(base).parse(channel).url).toBe(`${base}/1/ch/${channelId}/`)
    })

    it('normalizes a trailing slash on the link base', () => {
        const channel = {
            id: channelId,
            name: 'Engineering',
            creator: 1,
            public: true,
            workspaceId: 1,
            archived: false,
            created: new Date(),
            version: 1,
        }
        expect(createChannelSchema(`${base}/`).parse(channel).url).toBe(
            `${base}/1/ch/${channelId}/`,
        )
    })

    it('falls back to the default web app when no base is given', () => {
        const channel = {
            id: channelId,
            name: 'Engineering',
            creator: 1,
            public: true,
            workspaceId: 1,
            archived: false,
            created: new Date(),
            version: 1,
        }
        expect(createChannelSchema().parse(channel).url).toBe(
            `https://comms.todoist.com/1/ch/${channelId}/`,
        )
    })

    it('propagates the base to a nested lastComment on an inbox thread', () => {
        const parsed = createInboxThreadSchema(base).parse({
            id: threadId,
            title: 't',
            content: 'c',
            creator: 1,
            channelId,
            workspaceId: 1,
            commentCount: 0,
            lastUpdated: new Date(),
            posted: new Date(),
            snippet: 's',
            snippetCreator: 1,
            isArchived: false,
            inInbox: true,
            closed: false,
            lastComment: {
                id: commentId,
                content: 'hi',
                creator: 1,
                threadId: commentThreadId,
                channelId,
                workspaceId: 1,
                posted: new Date(),
            },
        })
        expect(parsed.url).toBe(`${base}/1/ch/${channelId}/t/${threadId}/`)
        expect(parsed.lastComment?.url).toBe(
            `${base}/1/ch/${channelId}/t/${commentThreadId}/c/${commentId}`,
        )
    })
})
