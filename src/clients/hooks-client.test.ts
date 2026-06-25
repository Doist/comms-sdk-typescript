import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { CommsApi } from '../comms-api'
import { server } from '../testUtils/msw-setup'
import {
    TEST_API_BASE_URL as BASE,
    TEST_API_TOKEN,
    TEST_CHANNEL_ID,
    TEST_CONVERSATION_ID,
    TEST_THREAD_ID,
} from '../testUtils/test-defaults'
import { SubscribeHookArgsSchema, UnsubscribeHookArgsSchema } from '../types/requests'

const TARGET_URL = 'https://example.com/comms-hook'

describe('HooksClient', () => {
    it('subscribes to a REST hook event with optional filters', async () => {
        let body: Record<string, unknown> | undefined

        server.use(
            http.post(`${BASE}/hooks/subscribe`, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>
                return HttpResponse.json({ status: 'ok', id: 123 }, { status: 201 })
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        const result = await api.hooks.subscribe({
            targetUrl: TARGET_URL,
            event: 'message_added',
            workspaceId: 456,
            channelId: TEST_CHANNEL_ID,
            threadId: TEST_THREAD_ID,
            conversationId: TEST_CONVERSATION_ID,
        })

        expect(result).toEqual({ status: 'ok', id: 123 })
        expect(body).toEqual({
            target_url: TARGET_URL,
            event: 'message_added',
            workspace_id: 456,
            channel_id: TEST_CHANNEL_ID,
            thread_id: TEST_THREAD_ID,
            conversation_id: TEST_CONVERSATION_ID,
        })
    })

    it('unsubscribes hooks for a target URL', async () => {
        let body: Record<string, unknown> | undefined

        server.use(
            http.post(`${BASE}/hooks/unsubscribe`, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>
                return HttpResponse.json({ status: 'ok' })
            }),
        )

        const api = new CommsApi(TEST_API_TOKEN)
        const result = await api.hooks.unsubscribe({ targetUrl: TARGET_URL })

        expect(result).toEqual({ status: 'ok' })
        expect(body).toEqual({ target_url: TARGET_URL })
    })

    it('validates hook target URLs and conversation filters', () => {
        expect(
            SubscribeHookArgsSchema.safeParse({
                targetUrl: 'http://example.com/comms-hook',
                event: 'message_added',
            }).success,
        ).toBe(false)
        expect(UnsubscribeHookArgsSchema.safeParse({ targetUrl: 'foo' }).success).toBe(false)
        expect(
            SubscribeHookArgsSchema.safeParse({
                targetUrl: TARGET_URL,
                event: 'thread_added',
                conversationId: TEST_CONVERSATION_ID,
            }).success,
        ).toBe(false)
        expect(
            SubscribeHookArgsSchema.safeParse({
                targetUrl: TARGET_URL,
                event: 'message_added',
                conversationId: TEST_CONVERSATION_ID,
            }).success,
        ).toBe(true)
    })
})
