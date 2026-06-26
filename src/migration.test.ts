import { HttpResponse, http } from 'msw'
import { fetchNewCommsUrl, fetchNewCommsUrls } from './migration'
import { server } from './testUtils/msw-setup'
import { CommsRequestError } from './types/errors'

const MIGRATION_URL = 'https://twist.com/api/comms_migration/fetch_new_url'
const OLD_URL = 'https://twist.com/a/123/ch/456/t/789'
const NEW_URL = 'https://comms.todoist.com/api/v1/channels/456/threads/789'
const TWIST_TOKEN = 'twist-token-abc'

describe('migration', () => {
    describe('fetchNewCommsUrl', () => {
        it('should translate a Twist URL to its Comms equivalent', async () => {
            server.use(
                http.post(MIGRATION_URL, async ({ request }) => {
                    expect(request.headers.get('Authorization')).toBe(`Bearer ${TWIST_TOKEN}`)
                    const body = await request.json()
                    expect(body).toEqual({ old_url: OLD_URL })
                    return HttpResponse.json({ new_url: NEW_URL })
                }),
            )

            const result = await fetchNewCommsUrl({ oldUrl: OLD_URL, twistToken: TWIST_TOKEN })

            expect(result).toBe(NEW_URL)
        })

        it('should throw when the response is missing new_url', async () => {
            server.use(http.post(MIGRATION_URL, async () => HttpResponse.json({})))

            await expect(
                fetchNewCommsUrl({ oldUrl: OLD_URL, twistToken: TWIST_TOKEN }),
            ).rejects.toThrow('Migration response did not contain a new URL.')
        })

        it('should throw CommsRequestError for an invalid URL (400)', async () => {
            server.use(
                http.post(MIGRATION_URL, async () =>
                    HttpResponse.json({ error: { code: 'invalid_url' } }, { status: 400 }),
                ),
            )

            await expect(
                fetchNewCommsUrl({ oldUrl: 'https://twist.com/bad', twistToken: TWIST_TOKEN }),
            ).rejects.toMatchObject({
                httpStatusCode: 400,
                responseData: { error: { code: 'invalid_url' } },
            })
        })

        it('should throw CommsRequestError for a not-imported URL (404)', async () => {
            server.use(
                http.post(MIGRATION_URL, async () =>
                    HttpResponse.json({ error: { code: 'not_imported' } }, { status: 404 }),
                ),
            )

            await expect(
                fetchNewCommsUrl({ oldUrl: OLD_URL, twistToken: TWIST_TOKEN }),
            ).rejects.toMatchObject({
                httpStatusCode: 404,
                responseData: { error: { code: 'not_imported' } },
            })
        })

        it('should throw CommsRequestError on server error (500)', async () => {
            server.use(
                http.post(MIGRATION_URL, async () =>
                    HttpResponse.json({ error: 'boom' }, { status: 500 }),
                ),
            )

            await expect(
                fetchNewCommsUrl({ oldUrl: OLD_URL, twistToken: TWIST_TOKEN }),
            ).rejects.toBeInstanceOf(CommsRequestError)
        })

        it('should respect a custom base URL', async () => {
            server.use(
                http.post('https://staging.twist.com/api/comms_migration/fetch_new_url', async () =>
                    HttpResponse.json({ new_url: NEW_URL }),
                ),
            )

            const result = await fetchNewCommsUrl(
                { oldUrl: OLD_URL, twistToken: TWIST_TOKEN },
                { baseUrl: 'https://staging.twist.com' },
            )

            expect(result).toBe(NEW_URL)
        })
    })

    describe('fetchNewCommsUrls', () => {
        it('should resolve mixed success/failure in input order without aborting', async () => {
            const goodUrl = 'https://twist.com/a/1/ch/2/t/3'
            const badUrl = 'https://twist.com/bad'
            const mappedUrl = 'https://comms.todoist.com/api/v1/channels/2/threads/3'

            server.use(
                http.post(MIGRATION_URL, async ({ request }) => {
                    const body = (await request.json()) as { old_url: string }
                    if (body.old_url === badUrl) {
                        return HttpResponse.json(
                            { error: { code: 'invalid_url' } },
                            { status: 400 },
                        )
                    }
                    return HttpResponse.json({ new_url: mappedUrl })
                }),
            )

            const results = await fetchNewCommsUrls({
                oldUrls: [goodUrl, badUrl],
                twistToken: TWIST_TOKEN,
            })

            expect(results).toHaveLength(2)
            expect(results[0]).toEqual({ oldUrl: goodUrl, newUrl: mappedUrl })
            expect(results[1].oldUrl).toBe(badUrl)
            expect(results[1].newUrl).toBeUndefined()
            expect(results[1].error).toBeInstanceOf(CommsRequestError)
            expect(results[1].error?.httpStatusCode).toBe(400)
        })

        it('should return an empty array for no input URLs', async () => {
            const results = await fetchNewCommsUrls({ oldUrls: [], twistToken: TWIST_TOKEN })

            expect(results).toEqual([])
        })
    })
})
