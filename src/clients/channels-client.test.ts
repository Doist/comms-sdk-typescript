import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { CommsApi } from '../comms-api'
import { server } from '../testUtils/msw-setup'
import {
    TEST_API_BASE_URL as BASE,
    TEST_API_TOKEN,
    TEST_CHANNEL_ID,
} from '../testUtils/test-defaults'

const CHANNEL_RESPONSE = {
    id: TEST_CHANNEL_ID,
    name: 'General',
    creator: 1,
    public: true,
    workspace_id: 1,
    archived: false,
    created_ts: 1_609_459_200,
    version: 1,
}

describe('ChannelsClient — wire serialization', () => {
    it.each([
        ['createChannel', 'add', true],
        ['createChannel', 'add', false],
        ['updateChannel', 'update', true],
        ['updateChannel', 'update', false],
    ] as const)(
        '%s sends use_default_recipients: %s and empty default audience arrays',
        async (method, suffix, useDefaultRecipients) => {
            let body: Record<string, unknown> | undefined
            server.use(
                http.post(`${BASE}/channels/${suffix}`, async ({ request }) => {
                    body = (await request.json()) as Record<string, unknown>
                    return HttpResponse.json(CHANNEL_RESPONSE)
                }),
            )

            const api = new CommsApi(TEST_API_TOKEN)
            if (method === 'createChannel') {
                await api.channels.createChannel({
                    workspaceId: 1,
                    name: 'General',
                    useDefaultRecipients,
                    defaultGroups: [],
                    defaultRecipients: [],
                })
            } else {
                await api.channels.updateChannel({
                    id: TEST_CHANNEL_ID,
                    name: 'General',
                    useDefaultRecipients,
                    defaultGroups: [],
                    defaultRecipients: [],
                })
            }

            expect(body).toMatchObject({
                use_default_recipients: useDefaultRecipients,
                default_groups: [],
                default_recipients: [],
            })
        },
    )
})
