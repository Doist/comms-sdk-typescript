import { getCommsBaseUri } from '../consts/endpoints'
import type {
    Channel,
    Comment,
    Conversation,
    Group,
    Thread,
    User,
    Workspace,
    WorkspaceUser,
} from '../types/entities'

export const TEST_API_TOKEN = 'test-api-token'
export const TEST_API_BASE_URL = getCommsBaseUri().replace(/\/$/, '')

// Stable test IDs. TEST_THREAD_ID is base58 UUIDv7-shaped because
// add-comment paths validate it SDK-side.
export const TEST_CHANNEL_ID = '7YpL3oZ4kZ9vP7Q1tR2sX3y'
export const TEST_THREAD_ID = 'CQ7yksHFbYFrSPVTaHVCt'
export const TEST_COMMENT_ID = '7YpL3oZ4kZ9vP7Q1tR2sX41'
export const TEST_CONVERSATION_ID = '7YpL3oZ4kZ9vP7Q1tR2sX42'
export const TEST_MESSAGE_ID = '7YpL3oZ4kZ9vP7Q1tR2sX43'
export const TEST_GROUP_ID = '7YpL3oZ4kZ9vP7Q1tR2sX44'

export const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    fullName: 'Test User',
    shortName: 'TU',
    timezone: 'America/New_York',
    removed: false,
    lang: 'en',
}

export const mockWorkspace: Workspace = {
    id: 1,
    name: 'Test Workspace',
    creator: 1,
    created: new Date('2021-01-01T00:00:00Z'),
}

export const mockChannel: Channel = {
    id: TEST_CHANNEL_ID,
    name: 'general',
    creator: 1,
    public: true,
    workspaceId: 1,
    archived: false,
    created: new Date('2021-01-01T00:00:00Z'),
    version: 0,
    url: `https://comms.todoist.com/1/ch/${TEST_CHANNEL_ID}/`,
}

export const mockThread: Thread = {
    id: TEST_THREAD_ID,
    title: 'Test Thread',
    content: 'This is a test thread',
    creator: 1,
    channelId: TEST_CHANNEL_ID,
    workspaceId: 1,
    commentCount: 0,
    lastUpdated: new Date('2021-01-01T00:00:00Z'),
    pinned: false,
    posted: new Date('2021-01-01T00:00:00Z'),
    snippet: 'This is a test thread',
    snippetCreator: 1,
    isArchived: false,
    url: `https://comms.todoist.com/1/ch/${TEST_CHANNEL_ID}/t/${TEST_THREAD_ID}/`,
}

export const mockGroup: Group = {
    id: TEST_GROUP_ID,
    name: 'Test Group',
    workspaceId: 1,
    userIds: [1, 2, 3],
    version: 0,
}

export const mockConversation: Conversation = {
    id: TEST_CONVERSATION_ID,
    workspaceId: 1,
    userIds: [1, 2],
    messageCount: 1,
    lastObjIndex: 0,
    snippet: 'Hello there',
    snippetCreators: [1],
    lastActive: new Date('2021-01-01T00:00:00Z'),
    archived: false,
    created: new Date('2021-01-01T00:00:00Z'),
    creator: 1,
    url: `https://comms.todoist.com/1/msg/${TEST_CONVERSATION_ID}/`,
}

export const mockComment: Comment = {
    id: TEST_COMMENT_ID,
    content: 'This is a comment',
    creator: 1,
    threadId: TEST_THREAD_ID,
    workspaceId: 1,
    channelId: TEST_CHANNEL_ID,
    posted: new Date('2021-01-01T00:00:00Z'),
    url: `https://comms.todoist.com/1/ch/${TEST_CHANNEL_ID}/t/${TEST_THREAD_ID}/c/${TEST_COMMENT_ID}`,
}

export const mockWorkspaceUser: WorkspaceUser = {
    id: 1,
    fullName: 'Test User',
    email: 'test@example.com',
    userType: 'USER',
    shortName: 'TU',
    firstName: 'Test',
    imageId: null,
    avatarUrls: null,
    dateFormat: null,
    removed: false,
    restricted: null,
    setupPending: null,
    theme: null,
    timeFormat: null,
    timezone: 'America/New_York',
    version: 1,
}
