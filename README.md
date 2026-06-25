# Comms SDK TypeScript

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
opaque base58-encoded UUIDv7 strings; `workspaceId` and `userId` are
numeric.

Creation endpoints (`createChannel`, `createThread`, `createComment`,
`getOrCreateConversation`, `createMessage`, `createGroup`) accept an
optional `id`. **A caller-supplied `id` must be a base58-encoded
UUIDv7** — anything else fails fast with a `UuidV7Error` before the
request leaves the SDK. Either mint your own with `generateId()` (handy
for optimistic UI — the ID survives the round-trip unchanged) or omit
`id` and let the SDK mint one:

```typescript
import { CommsApi, generateId } from '@doist/comms-sdk'

const api = new CommsApi('YOUR_API_TOKEN')

// Option 1: let the SDK mint an ID
const channel = await api.channels.createChannel({
    workspaceId: 1,
    name: 'Engineering',
})

// Option 2: mint the ID yourself (must be a base58 UUIDv7 from generateId)
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

Access tokens expire (see `tokenResponse.expiresIn`). When they do, use the
`refreshToken` from the original exchange to obtain a new one without sending
the user back through the authorization flow:

```typescript
import { refreshAuthToken } from '@doist/comms-sdk'

const refreshed = await refreshAuthToken({
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    refreshToken: tokenResponse.refreshToken,
})

// The server may rotate the refresh token — persist refreshed.refreshToken
// when present, otherwise keep using the previous one.
const api = new CommsApi(refreshed.accessToken)
```

### REST hooks

REST hooks require a Todoist OAuth access token with Todoist Comms audience. Subscribe
with an HTTPS target URL up to 150 characters and one of the exported
`HOOK_EVENTS`; the backend will POST webhook payloads to that URL when
matching events happen:

```typescript
import { CommsApi, HOOK_EVENTS } from '@doist/comms-sdk'

const api = new CommsApi('TODOIST_OAUTH_ACCESS_TOKEN')

const subscription = await api.hooks.subscribe({
    targetUrl: 'https://example.com/comms-hook',
    event: 'thread_added',
    workspaceId: 1,
})

console.log(subscription.id, HOOK_EVENTS)

await api.hooks.unsubscribe({
    targetUrl: 'https://example.com/comms-hook',
})
```

### Short-lived processes (CLIs, scripts)

On Node, the SDK keeps a connection pool alive across requests so HTTP/2
multiplexing and TLS reuse actually work. Long-running processes don't
need to think about it. **Short-lived processes should `await api.close()`
before exit**, otherwise Node's event loop waits ~4 seconds for idle
sockets to time out:

```typescript
const api = new CommsApi('YOUR_API_TOKEN')
try {
    await api.users.getSessionUser()
} finally {
    await api.close()
}
```

`api.close()` drains the process-global pool, so it also covers code
paths that only use the standalone OAuth helpers (`getAuthToken`,
`refreshAuthToken`, `revokeAuthToken`, `registerClient`). Those flows can also import
`closeDefaultDispatcher` directly.

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
