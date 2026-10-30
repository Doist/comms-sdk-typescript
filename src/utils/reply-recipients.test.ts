import { getDefaultReplyRecipients as getSharedDefaultReplyRecipients } from '@doist/sdk-kmp/shared-comms-clients'
import { http, HttpResponse } from 'msw'
import { applyNotifyAudience } from '../clients/notify-audience'
import { CommsApi } from '../comms-api'
import { server } from '../testUtils/msw-setup'
import { TEST_API_BASE_URL, TEST_API_TOKEN, TEST_THREAD_ID } from '../testUtils/test-defaults'
import { EVERYONE, EVERYONE_IN_THREAD } from '../types/enums'
import { getDefaultReplyRecipients } from './reply-recipients'

// Calls through, so a test can check how the SDK describes each comment to the
// library, which the result can't always show.
vi.mock('@doist/sdk-kmp/shared-comms-clients', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@doist/sdk-kmp/shared-comms-clients')>()
    return { ...actual, getDefaultReplyRecipients: vi.fn(actual.getDefaultReplyRecipients) }
})

type Args = Parameters<typeof getDefaultReplyRecipients>[0]
type TestComment = Args['comments'][number]

// You're Bob. Alice started the thread, and Carol, Dan and Ivan are in the channel.
const YOU = 1
const ALICE = 2
const CAROL = 3
const DAN = 4
const IVAN = 5
const DESIGN = 'CeR6rveXgA9TFtZGys1Tw'
const RELEASES = 'CeR6rveXgA9TFwTBAzLJ5'

const THREAD: Args['thread'] = {
    creator: ALICE,
    recipients: [CAROL, DAN],
    groups: [DESIGN],
    closed: false,
}

function comment(
    creator: number,
    recipients: number[] = [],
    groups: string[] = [],
    extra: Partial<TestComment> = {},
): TestComment {
    return { creator, recipients, groups, deleted: false, systemMessage: null, ...extra }
}

// Comments are listed oldest first, as `getComments` returns them.
function recipients(comments: TestComment[], args: Partial<Args> = {}) {
    return getDefaultReplyRecipients({ thread: THREAD, comments, currentUserId: YOU, ...args })
}

describe('getDefaultReplyRecipients', () => {
    test("defaults to the newest comment's author and the people and groups it notified", () => {
        expect(
            recipients([comment(CAROL, [ALICE], [DESIGN]), comment(DAN, [CAROL], [RELEASES])]),
        ).toStrictEqual({ recipients: [DAN, CAROL], groups: [RELEASES], notifyAudience: null })
    })

    test('skips deleted comments, system messages and masked posts', () => {
        expect(
            recipients([
                comment(CAROL, [ALICE]),
                comment(DAN, [CAROL], [], { systemMessage: { type: 'THREAD_CLOSED' } }),
                comment(DAN, [CAROL], [], { systemMessage: { type: 'THREAD_REOPENED' } }),
                comment(DAN, [CAROL], [], { deleted: true }),
                comment(DAN, [CAROL], [], { systemMessage: 'Moved this thread' }),
                // An integration's post, under the person who installed it.
                comment(IVAN, [], [RELEASES], { systemMessage: { type: 'USER_MASK' } }),
            ]),
        ).toStrictEqual({ recipients: [CAROL, ALICE], groups: [], notifyAudience: null })
    })

    test('tells the library which comments are system messages and which are masked', () => {
        recipients([
            comment(CAROL),
            comment(DAN, [], [], { systemMessage: { type: 'THREAD_CLOSED' } }),
            comment(DAN, [], [], { systemMessage: 'Moved this thread' }),
            comment(IVAN, [], [], { systemMessage: { type: 'USER_MASK' } }),
        ])
        const thread = vi.mocked(getSharedDefaultReplyRecipients).mock.lastCall?.[0]
        // Newest first: the masked post, the moved notice, the closing comment, then Carol's.
        const newestFirst = [0, 1, 2, 3]
        expect(newestFirst.map((index) => thread?.isCommentMasked(index))).toEqual([
            true,
            false,
            false,
            false,
        ])
        expect(newestFirst.map((index) => thread?.isCommentSystemMessage(index))).toEqual([
            false,
            true,
            true,
            false,
        ])
        expect(newestFirst.map((index) => thread?.isCommentDraft(index))).toEqual([
            false,
            false,
            false,
            false,
        ])
    })

    test('falls back to the thread when no comment counts', () => {
        const fromThread = {
            recipients: [ALICE, CAROL, DAN],
            groups: [DESIGN],
            notifyAudience: null,
        }
        expect(recipients([])).toStrictEqual(fromThread)
        expect(recipients([comment(DAN, [CAROL], [], { deleted: true })])).toStrictEqual(fromThread)
    })

    test('notifies everyone who interacted, and nobody else, in three cases', () => {
        const everyoneWhoInteracted = { recipients: [], groups: [], notifyAudience: 'thread' }
        // A thread to everyone in the channel, with no comment that counts.
        expect(recipients([], { thread: { ...THREAD, groups: [DESIGN, EVERYONE] } })).toStrictEqual(
            everyoneWhoInteracted,
        )
        // A closed thread.
        expect(
            recipients([comment(CAROL, [ALICE], [DESIGN])], {
                thread: { ...THREAD, closed: true },
            }),
        ).toStrictEqual(everyoneWhoInteracted)
        // A reply that closes the thread.
        expect(
            recipients([comment(CAROL, [ALICE], [DESIGN])], { isClosingThread: true }),
        ).toStrictEqual(everyoneWhoInteracted)
    })

    test('never includes you', () => {
        expect(recipients([comment(CAROL, [YOU, DAN])]).recipients).toEqual([CAROL, DAN])
        // When you wrote the newest comment, the people you notified are the default.
        expect(recipients([comment(YOU, [CAROL])]).recipients).toEqual([CAROL])
        expect(recipients([], { thread: { ...THREAD, creator: YOU } }).recipients).toEqual([
            CAROL,
            DAN,
        ])
    })

    test('handles missing and null lists', () => {
        const bare = { creator: ALICE, recipients: null, groups: null, closed: null }
        expect(recipients([], { thread: bare })).toStrictEqual({
            recipients: [ALICE],
            groups: [],
            notifyAudience: null,
        })
        expect(
            recipients(
                [
                    { creator: CAROL, recipients: null, groups: null, deleted: null },
                    { creator: DAN },
                ],
                { thread: bare },
            ),
        ).toStrictEqual({ recipients: [DAN], groups: [], notifyAudience: null })
    })

    test('gives the special groups as notifyAudience, with the channel winning', () => {
        expect(recipients([comment(CAROL, [], [DESIGN, EVERYONE])])).toStrictEqual({
            recipients: [CAROL],
            groups: [DESIGN],
            notifyAudience: 'channel',
        })
        expect(recipients([comment(CAROL, [], [EVERYONE_IN_THREAD, DESIGN])])).toStrictEqual({
            recipients: [CAROL],
            groups: [DESIGN],
            notifyAudience: 'thread',
        })
        expect(recipients([comment(CAROL, [], [EVERYONE_IN_THREAD, EVERYONE])])).toStrictEqual({
            recipients: [CAROL],
            groups: [],
            notifyAudience: 'channel',
        })
    })

    test('gives empty lists rather than leaving them out', () => {
        const yourQuietThread = { creator: YOU, recipients: [], groups: [], closed: false }
        expect(recipients([], { thread: yourQuietThread })).toStrictEqual({
            recipients: [],
            groups: [],
            notifyAudience: null,
        })
    })
})

describe('spreading the default reply recipients', () => {
    const COMMENT_ADD = `${TEST_API_BASE_URL}/comments/add`
    const COMMENT_RESPONSE = {
        id: 'AAAAAAAAAAAAAAAAAAAAAA',
        thread_id: TEST_THREAD_ID,
        channel_id: 'BBBBBBBBBBBBBBBBBBBBBB',
        creator: YOU,
        content: 'On it',
        posted_ts: Math.floor(Date.now() / 1000),
        workspace_id: 1,
        system_message: null,
    }

    function captureCommentBody(): { body?: Record<string, unknown> } {
        const captured: { body?: Record<string, unknown> } = {}
        server.use(
            http.post(COMMENT_ADD, async ({ request }) => {
                captured.body = (await request.json()) as Record<string, unknown>
                return HttpResponse.json(COMMENT_RESPONSE)
            }),
        )
        return captured
    }

    test.each([
        {
            name: 'people and groups',
            result: recipients([comment(CAROL, [ALICE], [DESIGN])]),
            groups: [DESIGN],
        },
        {
            name: 'everyone in the channel',
            result: recipients([comment(CAROL, [], [DESIGN, EVERYONE])]),
            groups: [DESIGN, EVERYONE],
        },
        {
            name: 'everyone who interacted',
            result: recipients([], { isClosingThread: true }),
            groups: [EVERYONE_IN_THREAD],
        },
    ])('passes applyNotifyAudience for $name', ({ result, groups }) => {
        const params = { threadId: TEST_THREAD_ID, content: 'On it', ...result }
        expect(applyNotifyAudience(params)).toStrictEqual({
            threadId: TEST_THREAD_ID,
            content: 'On it',
            recipients: result.recipients,
            groups,
        })
    })

    test('createComment sends the people and groups without an empty audience', async () => {
        const captured = captureCommentBody()
        await new CommsApi(TEST_API_TOKEN).comments.createComment({
            threadId: TEST_THREAD_ID,
            content: 'On it',
            ...recipients([comment(CAROL, [ALICE], [DESIGN])]),
        })
        expect(captured.body).toMatchObject({ recipients: [CAROL, ALICE], groups: [DESIGN] })
        expect(captured.body).not.toHaveProperty('notify_audience')
    })

    test('closeThread notifies everyone who interacted', async () => {
        const captured = captureCommentBody()
        await new CommsApi(TEST_API_TOKEN).threads.closeThread({
            id: TEST_THREAD_ID,
            content: 'Done',
            ...recipients([comment(CAROL, [ALICE], [DESIGN])], { isClosingThread: true }),
        })
        expect(captured.body).toMatchObject({
            recipients: [],
            groups: [EVERYONE_IN_THREAD],
            thread_action: 'close',
        })
        expect(captured.body).not.toHaveProperty('notify_audience')
    })
})
