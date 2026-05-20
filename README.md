# Comms SDK (TypeScript)

The official TypeScript SDK for the Comms REST API.

## Installation

```bash
npm install @doist/comms-sdk
```

## Usage

```typescript
import { CommsApi } from '@doist/comms-sdk'

const api = new CommsApi('YOUR_API_TOKEN')

api.users
    .getSessionUser()
    .then((user) => console.log(user))
    .catch((error) => console.log(error))
```

By default the SDK targets production at `https://comms.todoist.com`.
Pass a `baseUrl` option to point at a different deployment — staging
lives at `https://comms.staging.todoist.com`:

```typescript
const api = new CommsApi('YOUR_API_TOKEN', {
    baseUrl: 'https://comms.staging.todoist.com',
})
```

### IDs are base58-encoded UUIDv7

As of the UUIDv7 migration, channel / thread / comment / conversation /
conversation-message / group IDs are **base58-encoded UUIDv7 strings**, not
integers. `workspaceId` and `userId` remain numeric.

Creation endpoints (`createChannel`, `createThread`, `createComment`,
`getOrCreateConversation`, `createMessage`, `createGroup`) require the
caller to supply an `id`. If you don't, the SDK auto-generates one with
`generateId()`:

```typescript
import { CommsApi, generateId } from '@doist/comms-sdk'

const api = new CommsApi('YOUR_API_TOKEN')

// Option 1: let the SDK mint an ID
const channel = await api.channels.createChannel({
    workspaceId: 1,
    name: 'Engineering',
})

// Option 2: mint the ID yourself (useful for optimistic UI — the local ID
// is the permanent ID; the brief unsynced window is the only difference)
const id = generateId()
const sameChannel = await api.channels.createChannel({
    workspaceId: 1,
    name: 'Engineering',
    id,
})
```

### Broadcast group markers

The legacy magic group IDs `1` (channel) and `2` (thread) are gone. Use the
string constants `EVERYONE` / `EVERYONE_IN_THREAD` when populating
`groups[]` / `directGroupMentions[]` directly, or use the `notifyAudience`
option on `createComment` / `closeThread` / `reopenThread` and let the SDK
encode it for you:

```typescript
await api.comments.createComment({
    threadId,
    content: 'Heads up everyone',
    notifyAudience: 'channel', // encoded as EVERYONE
})
```

### OAuth 2.0

```typescript
import { getAuthorizationUrl, getAuthToken, CommsApi } from '@doist/comms-sdk'

const authUrl = getAuthorizationUrl(
    'your-client-id',
    ['user:read', 'channels:read'],
    'state-parameter',
    'https://yourapp.com/callback',
)

const tokenResponse = await getAuthToken({
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    code: 'authorization-code',
    redirectUri: 'https://yourapp.com/callback',
})

const api = new CommsApi(tokenResponse.accessToken)
const user = await api.users.getSessionUser()
```

### Batch requests

Pass `{ batch: true }` to any API method to get a descriptor instead of
executing the request. Hand the descriptors to `api.batch(...)` to run them
in a single HTTP call:

```typescript
const results = await api.batch(
    api.channels.getChannels({ workspaceId: 1 }, { batch: true }),
    api.workspaceUsers.getUserById({ workspaceId: 1, userId: 42 }, { batch: true }),
)

if (results[0].code === 200) console.log(results[0].data.length, 'channels')
if (results[1].code === 200) console.log(results[1].data.fullName)
```

GET-only batches run in parallel on the server. Mixed GET/POST batches run
sequentially.

## What's gone vs. legacy Twist

Per `Comms_API_changes.md`, several user / auth surfaces have been dropped
because authentication now flows through Todoist-ID:

- `reset_password`, `register_with_google`, `connect_with_google`,
  `disconnect_google`, `is_connected_to_google`, all `*_with_apple`
  endpoints, all `email` management endpoints (`add_email`,
  `confirm_email`, `remove_email`, etc.), and `login_with_provider`.
- User-model fields removed: `snooze_until` / `snooze_dnd_*`, `away_mode`,
  `off_days`, `profession`, `contact_info`, `default_workspace`, `is_bot`,
  `feature_flags`, `original_avatar_id`, `email_mask`.
- User-model fields renamed: `name` → `fullName`, `avatar_id` → `imageId`.
- User-model retypes: `theme` → `number`, `setupPending` → `boolean`.
- Workspace lost `default_channel`, `welcome_channel`, `security` (and
  `color` is fixed at `1`).
- Thread `is_starred` → `is_saved` (and the matching `star` / `unstar`
  endpoints are now `save` / `unsave`).

## Development

- `npm install`
- `npm test` — Vitest
- `npm run type-check` — TypeScript
- `npm run check` — oxlint + oxfmt
- `npm run build` — emit CJS + ESM + d.ts

## Releases

The package follows semantic versioning; releases publish to npm via the
GitHub workflow.

## Feedback

Open issues at https://github.com/Doist/comms-sdk-typescript.
