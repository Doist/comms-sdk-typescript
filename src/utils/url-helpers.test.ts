import {
    COMMS_LINK_TYPES,
    getChannelURL,
    getCommentURL,
    getCommsURL,
    getConversationURL,
    getFullCommsURL,
    getInboxURL,
    getMessagesRootURL,
    getMessageURL,
    getSavedThreadCommentURL,
    getSavedThreadsRootURL,
    getSavedThreadURL,
    getSearchQueryURL,
    getSearchRootURL,
    getSettingsURL,
    getTeamMembersRootURL,
    getThreadsRootURL,
    getThreadURL,
    getUserProfileURL,
    parseCommsURL,
} from './url-helpers'

// Real base58-encoded UUIDv7 IDs. The shared link builders reject anything
// else, so placeholder IDs would silently exercise the fallback path instead.
const CH = 'CeR6rveXgA9TFtZGys1Tw'
const TH = 'CeR6rveXgA9TFwTBAzLJ5'
const CO = 'CeR6rveXgA9TFz3xX9jBn'
const CN = 'CeR6rveXgA9TFzUJU4J86'
const MS = 'CeR6rven5Z9D8r2JeGBmu'

describe('URL helpers', () => {
    describe('getCommsURL', () => {
        test('workspace only', () => {
            expect(getCommsURL({ workspaceId: 1 })).toBe('/1/')
        })

        test('workspace + channel', () => {
            expect(getCommsURL({ workspaceId: 1, channelId: CH })).toBe(`/1/ch/${CH}/`)
        })

        test('workspace + channel + thread', () => {
            expect(getCommsURL({ workspaceId: 1, channelId: CH, threadId: TH })).toBe(
                `/1/ch/${CH}/t/${TH}/`,
            )
        })

        test('workspace + channel + thread + comment', () => {
            expect(
                getCommsURL({ workspaceId: 1, channelId: CH, threadId: TH, commentId: CO }),
            ).toBe(`/1/ch/${CH}/t/${TH}/c/${CO}`)
        })

        test('inbox thread', () => {
            expect(getCommsURL({ workspaceId: 1, threadId: TH })).toBe(`/1/inbox/t/${TH}/`)
        })

        test('inbox thread + comment', () => {
            expect(getCommsURL({ workspaceId: 1, threadId: TH, commentId: CO })).toBe(
                `/1/inbox/t/${TH}/c/${CO}`,
            )
        })

        test('conversation', () => {
            expect(getCommsURL({ workspaceId: 1, conversationId: CN })).toBe(`/1/msg/${CN}/`)
        })

        test('conversation + message', () => {
            expect(getCommsURL({ workspaceId: 1, conversationId: CN, messageId: MS })).toBe(
                `/1/msg/${CN}/m/${MS}`,
            )
        })

        test('user', () => {
            expect(getCommsURL({ workspaceId: 1, userId: 1001 })).toBe('/1/people/u/1001')
        })
    })

    describe('getFullCommsURL', () => {
        test('default base', () => {
            expect(getFullCommsURL({ workspaceId: 1, channelId: CH })).toBe(
                `https://comms.todoist.com/1/ch/${CH}/`,
            )
        })

        test('custom base', () => {
            expect(
                getFullCommsURL(
                    { workspaceId: 1, channelId: CH },
                    'https://staging.comms.todoist.com',
                ),
            ).toBe(`https://staging.comms.todoist.com/1/ch/${CH}/`)
        })
    })

    test('getThreadURL', () => {
        expect(getThreadURL({ workspaceId: 1, channelId: CH, threadId: TH })).toBe(
            `/1/ch/${CH}/t/${TH}/`,
        )
    })

    test('getChannelURL', () => {
        expect(getChannelURL({ workspaceId: 1, channelId: CH })).toBe(`/1/ch/${CH}/`)
    })

    test('getConversationURL', () => {
        expect(getConversationURL({ workspaceId: 1, conversationId: CN })).toBe(`/1/msg/${CN}/`)
    })

    test('getMessageURL', () => {
        expect(getMessageURL({ workspaceId: 1, conversationId: CN, messageId: MS })).toBe(
            `/1/msg/${CN}/m/${MS}`,
        )
    })

    test('getCommentURL', () => {
        expect(getCommentURL({ workspaceId: 1, channelId: CH, threadId: TH, commentId: CO })).toBe(
            `/1/ch/${CH}/t/${TH}/c/${CO}`,
        )
    })

    test('getThreadsRootURL', () => {
        expect(getThreadsRootURL(1)).toBe('/1/ch')
    })

    describe('getInboxURL', () => {
        test('no tab', () => {
            expect(getInboxURL(1)).toBe('/1/inbox')
        })

        test('done tab', () => {
            expect(getInboxURL(1, 'done')).toBe('/1/inbox/done')
        })

        test('mentions tab', () => {
            expect(getInboxURL(1, 'mentions')).toBe('/1/inbox/mentions')
        })
    })

    test('getMessagesRootURL', () => {
        expect(getMessagesRootURL(1)).toBe('/1/msg')
    })

    test('getUserProfileURL', () => {
        expect(getUserProfileURL({ workspaceId: 1, userId: 1001 })).toBe('/1/people/u/1001')
    })

    test('getSavedThreadsRootURL', () => {
        expect(getSavedThreadsRootURL(1)).toBe('/1/saved')
    })

    test('getSavedThreadURL', () => {
        expect(getSavedThreadURL({ workspaceId: 1, threadId: TH })).toBe(`/1/saved/t/${TH}`)
    })

    test('getSearchRootURL', () => {
        expect(getSearchRootURL(1)).toBe('/1/search')
    })

    test('getSearchQueryURL', () => {
        expect(getSearchQueryURL({ workspaceId: 1, query: 'test query' })).toBe(
            '/1/search?q=test query',
        )
    })

    describe('getSettingsURL', () => {
        test('no location', () => {
            expect(getSettingsURL({ workspaceId: 1 })).toBe('/1/settings')
        })

        test('with location', () => {
            expect(getSettingsURL({ workspaceId: 1, initialLocation: 'general' })).toBe(
                '/1/settings/general',
            )
        })
    })

    test('getTeamMembersRootURL', () => {
        expect(getTeamMembersRootURL(1)).toBe('/1/people/u')
    })
})

describe('getSavedThreadCommentURL', () => {
    test('builds the path for a comment on a saved thread', () => {
        expect(getSavedThreadCommentURL({ workspaceId: 1, threadId: TH, commentId: CO })).toBe(
            `/1/saved/t/${TH}/c/${CO}`,
        )
    })
})

describe('IDs the link builder rejects', () => {
    // Paths are built while parsing API responses, so this must never throw.
    const BAD = 'not-a-base58-uuidv7'

    test.each([
        ['channel', () => getChannelURL({ workspaceId: 1, channelId: BAD }), `/1/ch/${BAD}/`],
        [
            'thread',
            () => getThreadURL({ workspaceId: 1, channelId: BAD, threadId: TH }),
            `/1/ch/${BAD}/t/${TH}/`,
        ],
        [
            'inbox thread',
            () => getCommsURL({ workspaceId: 1, threadId: BAD }),
            `/1/inbox/t/${BAD}/`,
        ],
        [
            'conversation',
            () => getConversationURL({ workspaceId: 1, conversationId: BAD }),
            `/1/msg/${BAD}/`,
        ],
        [
            'saved thread',
            () => getSavedThreadURL({ workspaceId: 1, threadId: BAD }),
            `/1/saved/t/${BAD}`,
        ],
    ])('falls back to a locally built path for a rejected %s ID', (_name, build, expected) => {
        expect(build).not.toThrow()
        expect(build()).toBe(expected)
    })

    test('a rejected ID still produces a usable full URL', () => {
        expect(getFullCommsURL({ workspaceId: 1, channelId: BAD })).toBe(
            `https://comms.todoist.com/1/ch/${BAD}/`,
        )
    })
})

describe('parseCommsURL', () => {
    const url = (path: string) => `https://comms.todoist.com${path}`

    test('parses a channel URL', () => {
        expect(parseCommsURL(url(getChannelURL({ workspaceId: 1, channelId: CH })))).toMatchObject({
            type: 'channel',
            workspaceId: '1',
            channelId: CH,
        })
    })

    test('parses a thread URL', () => {
        expect(
            parseCommsURL(url(getThreadURL({ workspaceId: 1, channelId: CH, threadId: TH }))),
        ).toMatchObject({ type: 'thread', channelId: CH, threadId: TH })
    })

    test('parses a thread comment URL', () => {
        expect(
            parseCommsURL(
                url(getCommentURL({ workspaceId: 1, channelId: CH, threadId: TH, commentId: CO })),
            ),
        ).toMatchObject({ type: 'thread_comment', threadId: TH, commentId: CO })
    })

    test('parses an inbox thread URL', () => {
        expect(parseCommsURL(url(getCommsURL({ workspaceId: 1, threadId: TH })))).toMatchObject({
            type: 'inbox_thread',
            threadId: TH,
        })
    })

    test('parses a saved thread URL', () => {
        expect(
            parseCommsURL(url(getSavedThreadURL({ workspaceId: 1, threadId: TH }))),
        ).toMatchObject({ type: 'saved_thread', threadId: TH })
    })

    test('parses a conversation URL', () => {
        expect(
            parseCommsURL(url(getConversationURL({ workspaceId: 1, conversationId: CN }))),
        ).toMatchObject({ type: 'conversation', conversationId: CN })
    })

    test('parses a message URL', () => {
        expect(
            parseCommsURL(
                url(getMessageURL({ workspaceId: 1, conversationId: CN, messageId: MS })),
            ),
        ).toMatchObject({ type: 'message', conversationId: CN, messageId: MS })
    })

    test('returns a plain serialisable object', () => {
        const parsed = parseCommsURL(url(getChannelURL({ workspaceId: 1, channelId: CH })))
        expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed)
        expect(parsed && Object.keys(parsed)).toEqual([
            'type',
            'workspaceId',
            'channelId',
            'threadId',
            'commentId',
            'conversationId',
            'messageId',
            'isQuoteReference',
        ])
    })

    test('only ever returns a declared link type', () => {
        const parsed = parseCommsURL(url(getChannelURL({ workspaceId: 1, channelId: CH })))
        expect(COMMS_LINK_TYPES).toContain(parsed?.type)
    })

    test.each([
        ['a people URL, which has no shared route', '/1/people/u/42'],
        ['a search URL, which has no shared route', '/1/search'],
    ])('returns null for %s', (_name, path) => {
        expect(parseCommsURL(url(path))).toBeNull()
    })

    test('returns null for a non-Comms URL', () => {
        expect(parseCommsURL('https://example.com/foo')).toBeNull()
    })
})
