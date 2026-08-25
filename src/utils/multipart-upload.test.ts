import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { uploadMultipartFile } from './multipart-upload'

// Drive the real transport — undici's own `fetch` paired with the dispatcher —
// against a real local server, rather than the suite-wide seam that forces
// everything onto the global `fetch`.
//
// That distinction is the whole point of this file. The global `fetch` encodes
// a global `FormData` perfectly well, so a test running under the seam cannot
// tell an encoded multipart body from a `FormData` one. Only undici's `fetch`
// rejects a global `FormData`, stringifying it to "[object FormData]" and
// sending an upload with no file in it.
vi.unmock('../transport/http-dispatcher')

let httpServer: Server
let baseUrl: string
let received: { contentType: string; body: string } | undefined

beforeAll(async () => {
    httpServer = await new Promise<Server>((resolve) => {
        const s = createServer((request, response) => {
            const chunks: Buffer[] = []
            request.on('data', (chunk: Buffer) => chunks.push(chunk))
            request.on('end', () => {
                received = {
                    contentType: request.headers['content-type'] ?? '',
                    body: Buffer.concat(chunks).toString('latin1'),
                }
                response.writeHead(200, { 'content-type': 'application/json' })
                response.end(JSON.stringify({ id: 'attachment-1' }))
            })
        })
        s.listen(0, '127.0.0.1', () => resolve(s))
    })

    baseUrl = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}/`
})

afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
})

beforeEach(() => {
    received = undefined
})

async function upload(args: Partial<Parameters<typeof uploadMultipartFile>[0]> = {}) {
    return uploadMultipartFile<{ id: string }>({
        baseUrl,
        authToken: 'test-token',
        endpoint: 'attachments/upload',
        file: new Blob([Buffer.from('real-file-bytes')], { type: 'image/png' }),
        fileName: 'diagram.png',
        ...args,
    })
}

function boundary() {
    return /boundary=(.+)$/.exec(received?.contentType ?? '')?.[1]
}

describe('uploadMultipartFile over the real transport', () => {
    test('encodes a Blob into a body undici’s fetch can send', async () => {
        const result = await upload()

        expect(result).toEqual({ id: 'attachment-1' })
        expect(received?.contentType).toMatch(/^multipart\/form-data; boundary=----comms-sdk-/)

        const body = received?.body ?? ''
        // The failure this guards: undici's `fetch` does not recognise a global
        // `FormData`, so a regression sends the class name and no file at all.
        expect(body).not.toContain('[object FormData]')
        expect(body).toContain(`--${boundary()}`)
        expect(body).toContain('name="file"; filename="diagram.png"')
        expect(body).toContain('Content-Type: image/png')
        expect(body).toContain('real-file-bytes')
        expect(body).toContain(`--${boundary()}--`)
    })

    test('sends the canonical metadata fields', async () => {
        await upload()

        const body = received?.body ?? ''
        expect(body).toContain('name="file_name"')
        expect(body).toContain('name="file_size"')
        expect(body).toContain('name="underlying_type"')
    })

    test('merges additional fields and lets them override derived values', async () => {
        await upload({ additionalFields: { attachment_id: 'abc', file_name: 'override.png' } })

        const body = received?.body ?? ''
        expect(body).toContain('name="attachment_id"')
        expect(body).toContain('override.png')
    })

    test('omits additional fields that are null or undefined', async () => {
        await upload({ additionalFields: { keep: 'yes', drop: null, alsoDrop: undefined } })

        const body = received?.body ?? ''
        expect(body).toContain('name="keep"')
        expect(body).not.toContain('name="drop"')
        expect(body).not.toContain('name="alsoDrop"')
    })

    test('encodes raw bytes with an explicit file name', async () => {
        await upload({ file: new Uint8Array(Buffer.from('raw-byte-content')), fileName: 'a.png' })

        expect(received?.body).toContain('raw-byte-content')
        expect(received?.body).toContain('Content-Type: image/png')
    })

    test('percent-encodes quotes and line breaks in the file name', async () => {
        // A raw CR or LF would end the header early and let a crafted file name
        // forge one of its own; a raw quote would end the parameter early.
        await upload({ fileName: 'we"ird\r\nname.png' })

        const body = received?.body ?? ''
        expect(body).toContain('filename="we%22ird%0D%0Aname.png"')
        expect(body.match(/Content-Disposition: form-data; name="file"/g)).toHaveLength(1)
    })

    test('rejects a content type that would forge a part header', async () => {
        // `contentType` is caller input and lands in the part header verbatim,
        // so a CR or LF in it could end the header and start another.
        await expect(upload({ contentType: 'image/png\r\nX-Injected: forged' })).rejects.toThrow(
            'contentType must contain only printable ASCII',
        )

        expect(received).toBeUndefined()
    })

    test('accepts a content type carrying ordinary parameters', async () => {
        await upload({ contentType: 'text/plain; charset=utf-8' })

        expect(received?.body).toContain('Content-Type: text/plain; charset=utf-8')
    })

    test('requires a file name for raw bytes', async () => {
        await expect(
            upload({ file: new Uint8Array([1, 2, 3]), fileName: undefined }),
        ).rejects.toThrow('fileName is required when uploading raw bytes')
    })
})
