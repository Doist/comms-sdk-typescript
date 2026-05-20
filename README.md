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

### Creating entities

Channel / thread / comment / conversation / message / group IDs are
opaque strings; `workspaceId` and `userId` are numeric.

Creation endpoints (`createChannel`, `createThread`, `createComment`,
`getOrCreateConversation`, `createMessage`, `createGroup`) accept an
optional `id`. Pass your own to keep an optimistic-UI ID stable through
the round-trip, or let the SDK mint one with `generateId()`:

```typescript
import { CommsApi, generateId } from '@doist/comms-sdk'

const api = new CommsApi('YOUR_API_TOKEN')

// Option 1: let the SDK mint an ID
const channel = await api.channels.createChannel({
    workspaceId: 1,
    name: 'Engineering',
})

// Option 2: mint the ID yourself
const id = generateId()
const sameChannel = await api.channels.createChannel({
    workspaceId: 1,
    name: 'Engineering',
    id,
})
```

### Broadcast group markers

Use the string constants `EVERYONE` / `EVERYONE_IN_THREAD` when
populating `groups[]` / `directGroupMentions[]` directly, or pass
`notifyAudience` to `createComment` / `closeThread` / `reopenThread`
and let the SDK encode it for you:

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
