---
slug: /
title: Getting Started
sidebar_position: 1
---

# Twist SDK TypeScript

The official TypeScript SDK for the Twist REST API.

## Installation

```bash
npm install @doist/twist-sdk
```

## Quick Start

```typescript
import { TwistApi } from '@doist/twist-sdk'

const api = new TwistApi('your-api-token')

// Get the current user
const user = await api.users.getSessionUser()
console.log(user.name)

// Get all workspaces
const workspaces = await api.workspaces.getWorkspaces()

// Get channels in a workspace
const channels = await api.channels.getChannels({ workspaceId: 123 })

// Create a new thread
const thread = await api.threads.createThread({
    channelId: 456,
    content: 'Hello from the SDK!',
    title: 'My First Thread',
})
```

## API Reference

See the [API Reference](./api/classes/TwistApi.md) for detailed documentation of all available methods and types.
