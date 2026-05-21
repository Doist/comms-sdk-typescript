import { ChannelsClient } from './clients/channels-client'
import { CommentsClient } from './clients/comments-client'
import { ConversationMessagesClient } from './clients/conversation-messages-client'
import { ConversationsClient } from './clients/conversations-client'
import { GroupsClient } from './clients/groups-client'
import { InboxClient } from './clients/inbox-client'
import { ReactionsClient } from './clients/reactions-client'
import { SearchClient } from './clients/search-client'
import { ThreadsClient } from './clients/threads-client'
import { UsersClient } from './clients/users-client'
import { WorkspaceUsersClient } from './clients/workspace-users-client'
import { WorkspacesClient } from './clients/workspaces-client'
import { closeDefaultDispatcher } from './transport/http-dispatcher'
import type { CustomFetch } from './types/http'

export type CommsApiOptions = {
    /** Optional custom API base URL. If not provided, defaults to Comms' standard API endpoint. */
    baseUrl?: string
    /** Optional custom fetch implementation for cross-platform compatibility (e.g., Obsidian, React Native, Electron). */
    customFetch?: CustomFetch
}

/**
 * The main API client for interacting with the Comms REST API.
 *
 * @example
 * ```typescript
 * import { CommsApi } from '@doist/comms-sdk'
 *
 * const api = new CommsApi('your-api-token')
 * const user = await api.users.getSessionUser()
 * ```
 */
export class CommsApi {
    public users: UsersClient
    public workspaces: WorkspacesClient
    public workspaceUsers: WorkspaceUsersClient
    public channels: ChannelsClient
    public threads: ThreadsClient
    public groups: GroupsClient
    public conversations: ConversationsClient
    public comments: CommentsClient
    public conversationMessages: ConversationMessagesClient
    public inbox: InboxClient
    public reactions: ReactionsClient
    public search: SearchClient

    /**
     * Creates a new Comms API client.
     *
     * @param authToken - Your Comms API token.
     * @param options - Optional configuration options.
     */
    constructor(authToken: string, options?: CommsApiOptions) {
        const clientConfig = {
            apiToken: authToken,
            baseUrl: options?.baseUrl,
            customFetch: options?.customFetch,
        }

        this.users = new UsersClient(clientConfig)
        this.workspaces = new WorkspacesClient(clientConfig)
        this.workspaceUsers = new WorkspaceUsersClient(clientConfig)
        this.channels = new ChannelsClient(clientConfig)
        this.threads = new ThreadsClient(clientConfig)
        this.groups = new GroupsClient(clientConfig)
        this.conversations = new ConversationsClient(clientConfig)
        this.comments = new CommentsClient(clientConfig)
        this.conversationMessages = new ConversationMessagesClient(clientConfig)
        this.inbox = new InboxClient(clientConfig)
        this.reactions = new ReactionsClient(clientConfig)
        this.search = new SearchClient(clientConfig)
    }

    /**
     * Drains the SDK's process-global connection pool. CLIs and scripts
     * should `await api.close()` before exit so Node's event loop empties
     * immediately instead of waiting ~4s on keep-alive. Affects every
     * `CommsApi` and OAuth helper in the same process — it's a
     * process-shutdown gesture, not an instance teardown. Browser-safe.
     */
    async close(): Promise<void> {
        await closeDefaultDispatcher()
    }
}
