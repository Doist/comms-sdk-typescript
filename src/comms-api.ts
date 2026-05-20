import { BatchBuilder } from './batch-builder'
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
import type { BatchRequestDescriptor, BatchResponseArray } from './types/batch'
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

    private authToken: string
    private baseUrl?: string
    private customFetch?: CustomFetch

    /**
     * Creates a new Comms API client.
     *
     * @param authToken - Your Comms API token.
     * @param options - Optional configuration options.
     */
    constructor(authToken: string, options?: CommsApiOptions) {
        this.authToken = authToken
        this.baseUrl = options?.baseUrl
        this.customFetch = options?.customFetch

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
     * Executes multiple API requests in a single HTTP call using the batch endpoint.
     *
     * @param requests - Batch request descriptors (obtained by passing `{ batch: true }` to API methods)
     * @returns Array of batch responses with processed data
     *
     * @example
     * ```typescript
     * const results = await api.batch(
     *   api.workspaceUsers.getUserById({ workspaceId: 123, userId: 456 }, { batch: true }),
     *   api.workspaceUsers.getUserById({ workspaceId: 123, userId: 789 }, { batch: true })
     * )
     * console.log(results[0].data.fullName, results[1].data.fullName)
     * ```
     */
    batch<T extends readonly BatchRequestDescriptor<unknown>[]>(
        ...requests: T
    ): Promise<BatchResponseArray<T>> {
        const builder = new BatchBuilder({
            apiToken: this.authToken,
            baseUrl: this.baseUrl,
            customFetch: this.customFetch,
        })
        return builder.execute(requests)
    }
}
