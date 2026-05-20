---
slug: /
title: Getting Started
sidebar_position: 1
---

# Comms SDK TypeScript

The official TypeScript SDK for the Comms REST API.

## Installation

```bash
npm install @doist/comms-sdk
```

## Quick Start

```typescript
import { CommsApi } from '@doist/comms-sdk'

const api = new CommsApi('your-api-token')

// Get the current user
const user = await api.users.getSessionUser()
console.log(user.fullName)

// Get all workspaces
const workspaces = await api.workspaces.getWorkspaces()

// Get channels in a workspace
const channels = await api.channels.getChannels({ workspaceId: 1 })

// Create a new thread (channelId comes from the channel you fetched)
const thread = await api.threads.createThread({
    channelId: channels[0].id,
    content: 'Hello from the SDK!',
    title: 'My First Thread',
})
```

## API Reference

See the [API Reference](./api/classes/CommsApi.md) for detailed documentation of all available methods and types.
