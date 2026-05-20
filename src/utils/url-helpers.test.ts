import {
    getChannelURL,
    getCommentURL,
    getCommsURL,
    getConversationURL,
    getFullCommsURL,
    getInboxURL,
    getMessagesRootURL,
    getMessageURL,
    getSavedThreadsRootURL,
    getSavedThreadURL,
    getSearchQueryURL,
    getSearchRootURL,
    getSettingsURL,
    getTeamMembersRootURL,
    getThreadsRootURL,
    getThreadURL,
    getUserProfileURL,
} from './url-helpers'

// Real-shaped IDs (base58-encoded UUIDv7) so assertions read like prod URLs.
const CH = '7YpL3oZ4kZ9vP7Q1tR2sX3y'
const TH = '7YpL3oZ4kZ9vP7Q1tR2sX3z'
const CO = '7YpL3oZ4kZ9vP7Q1tR2sX41'
const CN = '7YpL3oZ4kZ9vP7Q1tR2sX42'
const MS = '7YpL3oZ4kZ9vP7Q1tR2sX43'

describe('URL helpers', () => {
    describe('getCommsURL', () => {
        test('workspace only', () => {
            expect(getCommsURL({ workspaceId: 1 })).toBe('/a/1/')
        })

        test('workspace + channel', () => {
            expect(getCommsURL({ workspaceId: 1, channelId: CH })).toBe(`/a/1/ch/${CH}/`)
        })

        test('workspace + channel + thread', () => {
            expect(getCommsURL({ workspaceId: 1, channelId: CH, threadId: TH })).toBe(
                `/a/1/ch/${CH}/t/${TH}/`,
            )
        })

        test('workspace + channel + thread + comment', () => {
            expect(
                getCommsURL({ workspaceId: 1, channelId: CH, threadId: TH, commentId: CO }),
            ).toBe(`/a/1/ch/${CH}/t/${TH}/c/${CO}`)
        })

        test('inbox thread', () => {
            expect(getCommsURL({ workspaceId: 1, threadId: TH })).toBe(`/a/1/inbox/t/${TH}/`)
        })

        test('inbox thread + comment', () => {
            expect(getCommsURL({ workspaceId: 1, threadId: TH, commentId: CO })).toBe(
                `/a/1/inbox/t/${TH}/c/${CO}`,
            )
        })

        test('conversation', () => {
            expect(getCommsURL({ workspaceId: 1, conversationId: CN })).toBe(`/a/1/msg/${CN}/`)
        })

        test('conversation + message', () => {
            expect(getCommsURL({ workspaceId: 1, conversationId: CN, messageId: MS })).toBe(
                `/a/1/msg/${CN}/m/${MS}`,
            )
        })

        test('user', () => {
            expect(getCommsURL({ workspaceId: 1, userId: 1001 })).toBe('/a/1/people/u/1001')
        })
    })

    describe('getFullCommsURL', () => {
        test('default base', () => {
            expect(getFullCommsURL({ workspaceId: 1, channelId: CH })).toBe(
                `https://comms.todoist.com/a/1/ch/${CH}/`,
            )
        })

        test('custom base', () => {
            expect(
                getFullCommsURL(
                    { workspaceId: 1, channelId: CH },
                    'https://staging.comms.todoist.com',
                ),
            ).toBe(`https://staging.comms.todoist.com/a/1/ch/${CH}/`)
        })
    })

    test('getThreadURL', () => {
        expect(getThreadURL({ workspaceId: 1, channelId: CH, threadId: TH })).toBe(
            `/a/1/ch/${CH}/t/${TH}/`,
        )
    })

    test('getChannelURL', () => {
        expect(getChannelURL({ workspaceId: 1, channelId: CH })).toBe(`/a/1/ch/${CH}/`)
    })

    test('getConversationURL', () => {
        expect(getConversationURL({ workspaceId: 1, conversationId: CN })).toBe(`/a/1/msg/${CN}/`)
    })

    test('getMessageURL', () => {
        expect(getMessageURL({ workspaceId: 1, conversationId: CN, messageId: MS })).toBe(
            `/a/1/msg/${CN}/m/${MS}`,
        )
    })

    test('getCommentURL', () => {
        expect(getCommentURL({ workspaceId: 1, channelId: CH, threadId: TH, commentId: CO })).toBe(
            `/a/1/ch/${CH}/t/${TH}/c/${CO}`,
        )
    })

    test('getThreadsRootURL', () => {
        expect(getThreadsRootURL(1)).toBe('/a/1/ch')
    })

    describe('getInboxURL', () => {
        test('no tab', () => {
            expect(getInboxURL(1)).toBe('/a/1/inbox')
        })

        test('done tab', () => {
            expect(getInboxURL(1, 'done')).toBe('/a/1/inbox/done')
        })

        test('mentions tab', () => {
            expect(getInboxURL(1, 'mentions')).toBe('/a/1/inbox/mentions')
        })
    })

    test('getMessagesRootURL', () => {
        expect(getMessagesRootURL(1)).toBe('/a/1/msg')
    })

    test('getUserProfileURL', () => {
        expect(getUserProfileURL({ workspaceId: 1, userId: 1001 })).toBe('/a/1/people/u/1001')
    })

    test('getSavedThreadsRootURL', () => {
        expect(getSavedThreadsRootURL(1)).toBe('/a/1/saved')
    })

    test('getSavedThreadURL', () => {
        expect(getSavedThreadURL({ workspaceId: 1, threadId: TH })).toBe(`/a/1/saved/t/${TH}`)
    })

    test('getSearchRootURL', () => {
        expect(getSearchRootURL(1)).toBe('/a/1/search')
    })

    test('getSearchQueryURL', () => {
        expect(getSearchQueryURL({ workspaceId: 1, query: 'test query' })).toBe(
            '/a/1/search?q=test query',
        )
    })

    describe('getSettingsURL', () => {
        test('no location', () => {
            expect(getSettingsURL({ workspaceId: 1 })).toBe('/a/1/settings')
        })

        test('with location', () => {
            expect(getSettingsURL({ workspaceId: 1, initialLocation: 'general' })).toBe(
                '/a/1/settings/general',
            )
        })
    })

    test('getTeamMembersRootURL', () => {
        expect(getTeamMembersRootURL(1)).toBe('/a/1/people/u')
    })
})
