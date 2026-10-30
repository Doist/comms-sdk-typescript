import {
    ConversationKind,
    getConversationTitle as getSharedConversationTitle,
    ConversationTitleType as SharedConversationTitleType,
} from '@doist/sdk-kmp/shared-comms-all'
import { CONVERSATION_TITLE_TYPES, getConversationTitle } from './conversation-title'

// Calls through, so the tests can check the kind the SDK passes in, which the
// library's titles can't always show.
vi.mock('@doist/sdk-kmp/shared-comms-all', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@doist/sdk-kmp/shared-comms-all')>()
    return { ...actual, getConversationTitle: vi.fn(actual.getConversationTitle) }
})

// You're Ana. Rita was removed from the workspace, so the API sends only her first name.
const YOU = 1
const BOB = 2
const CARA = 3
const DAN = 4
const EVE = 5
const FAY = 6
const RITA = 7
// Someone who isn't in `USERS`, as when their profile hasn't loaded.
const UNKNOWN = 99

const USERS = [
    { id: YOU, fullName: 'Ana Silva', shortName: 'Ana S.', removed: false },
    { id: BOB, fullName: 'Bob Jones', shortName: 'Bob J.', removed: false },
    { id: CARA, fullName: 'Cara Smith', shortName: 'Cara S.', removed: false },
    { id: DAN, fullName: 'Dan Brown', shortName: 'Dan B.', removed: false },
    { id: EVE, fullName: 'Eve Adams', shortName: 'Eve A.', removed: false },
    { id: FAY, fullName: 'Fay Green', shortName: 'Fay G.', removed: false },
    { id: RITA, fullName: 'Rita', shortName: 'Rita', removed: true },
]

const PRIVATE = { private: true }
const GROUP = { private: false }

function title(
    userIds: number[],
    conversation: { title?: string | null; private?: boolean | null },
    maxNames?: number,
) {
    return getConversationTitle({
        conversation: { userIds, ...conversation },
        users: USERS,
        currentUserId: YOU,
        maxNames,
    })
}

describe('getConversationTitle', () => {
    test('shows a custom title, but not one that is only whitespace', () => {
        expect(title([YOU, BOB, CARA], { ...GROUP, title: 'Launch plan' })).toEqual({
            type: 'custom',
            names: ['Launch plan'],
            othersCount: 0,
            includesYou: false,
        })
        expect(title([YOU, BOB, CARA], { ...GROUP, title: '   ' })).toMatchObject({
            type: 'group',
            names: ['Bob J.', 'Cara S.'],
        })
    })

    test("shows the other person's full name in a 1:1", () => {
        expect(title([YOU, BOB], PRIVATE)).toEqual({
            type: 'one_to_one',
            names: ['Bob Jones'],
            othersCount: 0,
            includesYou: false,
        })
    })

    test("lists the others' short names in alphabetical order, up to the cap", () => {
        expect(title([FAY, YOU, EVE, DAN, CARA, BOB], GROUP)).toEqual({
            type: 'group',
            names: ['Bob J.', 'Cara S.', 'Dan B.'],
            othersCount: 2,
            includesYou: false,
        })
        expect(title([FAY, YOU, EVE, DAN, CARA, BOB], GROUP, 2)).toMatchObject({
            names: ['Bob J.', 'Cara S.'],
            othersCount: 3,
        })
    })

    test('names a single person over the cap rather than counting them', () => {
        expect(title([YOU, EVE, DAN, CARA, BOB], GROUP)).toMatchObject({
            names: ['Bob J.', 'Cara S.', 'Dan B.', 'Eve A.'],
            othersCount: 0,
        })
    })

    test('leaves people removed from the workspace out of a group, but not out of a 1:1', () => {
        expect(title([YOU, BOB, RITA, CARA], GROUP)).toMatchObject({
            type: 'group',
            names: ['Bob J.', 'Cara S.'],
            othersCount: 0,
        })
        expect(title([YOU, RITA], PRIVATE)).toMatchObject({
            type: 'one_to_one',
            names: ['Rita'],
        })
    })

    test('adds you to a group down to one other person', () => {
        expect(title([YOU, BOB], GROUP)).toEqual({
            type: 'group',
            names: ['Bob J.'],
            othersCount: 0,
            includesYou: true,
        })
    })

    test('shows your name when only you are left', () => {
        expect(title([YOU], GROUP)).toEqual({
            type: 'yourself',
            names: ['Ana Silva'],
            othersCount: 0,
            includesYou: false,
        })
        expect(title([YOU, RITA], GROUP)).toMatchObject({ type: 'yourself', names: ['Ana Silva'] })
    })

    test("counts someone who isn't in users rather than naming them", () => {
        expect(title([YOU, BOB, UNKNOWN, CARA], GROUP)).toMatchObject({
            type: 'group',
            names: ['Bob J.', 'Cara S.'],
            othersCount: 1,
        })
        expect(title([YOU, UNKNOWN], PRIVATE)).toEqual({
            type: 'untitled',
            names: [],
            othersCount: 0,
            includesYou: false,
        })
    })

    test('treats a private chat of three as a group', () => {
        expect(title([YOU, BOB, CARA], PRIVATE)).toMatchObject({
            type: 'group',
            names: ['Bob J.', 'Cara S.'],
            includesYou: false,
        })
    })

    test('reads two people without a private flag as a 1:1', () => {
        // A search result has no private flag.
        expect(title([YOU, BOB], {})).toMatchObject({ type: 'one_to_one', names: ['Bob Jones'] })
        expect(title([YOU, BOB, CARA], {})).toMatchObject({
            type: 'group',
            names: ['Bob J.', 'Cara S.'],
        })
    })

    test.each([
        { isPrivate: true, kind: ConversationKind.Private },
        { isPrivate: false, kind: ConversationKind.Group },
        { isPrivate: null, kind: ConversationKind.Unknown },
        { isPrivate: undefined, kind: ConversationKind.Unknown },
    ])('passes private: $isPrivate to the library as $kind.name', ({ isPrivate, kind }) => {
        title([YOU, BOB], { private: isPrivate })
        expect(vi.mocked(getSharedConversationTitle).mock.lastCall?.[1]).toBe(kind)
    })

    test('maps every title type', () => {
        const types = [
            title([YOU, BOB], { ...PRIVATE, title: 'Launch plan' }),
            title([YOU], PRIVATE),
            title([YOU, BOB], PRIVATE),
            title([YOU, BOB, CARA], GROUP),
            title([YOU, UNKNOWN], PRIVATE),
        ].map(({ type }) => type)
        expect(types).toEqual(CONVERSATION_TITLE_TYPES)
        expect(SharedConversationTitleType.values()).toHaveLength(CONVERSATION_TITLE_TYPES.length)
    })

    test('returns a new plain object every time', () => {
        const first = title([YOU, BOB, CARA], GROUP)
        first.names.push('Zed Z.')
        const second = title([YOU, BOB, CARA], GROUP)
        expect(second.names).toEqual(['Bob J.', 'Cara S.'])
        expect(Object.getPrototypeOf(second)).toBe(Object.prototype)
        expect(JSON.parse(JSON.stringify(second))).toEqual(second)
        // Sorted so the assertion catches leaked internals without pinning field order.
        expect(Object.keys(second).sort()).toEqual(
            ['type', 'names', 'othersCount', 'includesYou'].sort(),
        )
    })
})
