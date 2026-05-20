import { describe, expect, it } from 'vitest'
import { TEST_API_TOKEN, TEST_THREAD_ID } from '../testUtils/test-defaults'
import { EVERYONE, EVERYONE_IN_THREAD } from '../types/enums'
import { addCommentRequest } from './add-comment-helper'

const ctx = { baseUri: 'https://comms.todoist.com/api/v3/', apiToken: TEST_API_TOKEN }

describe('addCommentRequest — reserved broadcast marker validation', () => {
    it('throws when a marker is passed in `groups`', () => {
        expect(() =>
            addCommentRequest(ctx, {
                threadId: TEST_THREAD_ID,
                content: 'hello',
                groups: [EVERYONE],
            }),
        ).toThrow(/`groups` contains EVERYONE/)
    })

    it('throws when a marker is passed in `directGroupMentions`', () => {
        expect(() =>
            addCommentRequest(ctx, {
                threadId: TEST_THREAD_ID,
                content: 'hello',
                directGroupMentions: [EVERYONE_IN_THREAD],
            }),
        ).toThrow(/`directGroupMentions` contains EVERYONE_IN_THREAD/)
    })

    it('reports both fields in one error when markers appear in both', () => {
        let caught: Error | null = null
        try {
            addCommentRequest(ctx, {
                threadId: TEST_THREAD_ID,
                content: 'hello',
                groups: [EVERYONE],
                directGroupMentions: [EVERYONE_IN_THREAD],
            })
        } catch (e) {
            caught = e as Error
        }
        expect(caught).not.toBeNull()
        expect(caught?.message).toMatch(/`groups` contains EVERYONE/)
        expect(caught?.message).toMatch(/`directGroupMentions` contains EVERYONE_IN_THREAD/)
        expect(caught?.message).toMatch(/notifyAudience/)
    })

    it('translates notifyAudience: channel into the EVERYONE marker', () => {
        const descriptor = addCommentRequest(
            ctx,
            { threadId: TEST_THREAD_ID, content: 'hello', notifyAudience: 'channel' },
            { batch: true },
        )
        expect('params' in descriptor).toBe(true)
        if (!('params' in descriptor)) return
        const groups = (descriptor.params as Record<string, unknown>)?.groups as string[]
        expect(groups).toEqual([EVERYONE])
    })

    it('translates notifyAudience: thread into the EVERYONE_IN_THREAD marker', () => {
        const descriptor = addCommentRequest(
            ctx,
            { threadId: TEST_THREAD_ID, content: 'hello', notifyAudience: 'thread' },
            { batch: true },
        )
        if (!('params' in descriptor)) return
        const groups = (descriptor.params as Record<string, unknown>)?.groups as string[]
        expect(groups).toEqual([EVERYONE_IN_THREAD])
    })
})
