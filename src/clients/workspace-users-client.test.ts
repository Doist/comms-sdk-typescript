import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { apiUrl } from '../testUtils/msw-handlers'
import { server } from '../testUtils/msw-setup'
import { mockWorkspaceUser, TEST_API_TOKEN } from '../testUtils/test-defaults'
import { CommsRequestError } from '../types/errors'
import { WorkspaceUsersClient } from './workspace-users-client'

const removedWorkspaceUser = {
    ...mockWorkspaceUser,
    id: 2,
    fullName: 'Removed User',
    shortName: 'RU',
    removed: true,
}

describe('WorkspaceUsersClient', () => {
    let client: WorkspaceUsersClient

    beforeEach(() => {
        client = new WorkspaceUsersClient({ apiToken: TEST_API_TOKEN })
    })

    describe('getUsersByIds', () => {
        it('sends the ids as JSON and keys full, restricted, and unknown users by id', async () => {
            const restrictedUser = {
                id: 2,
                fullName: 'Alex',
                firstName: 'Alex',
                shortName: 'Alex',
                version: 0,
                removed: true,
                restricted: true,
            }
            server.use(
                http.get(apiUrl('api/v1.0/workspace_users/get_by_ids'), ({ request }) => {
                    const url = new URL(request.url)
                    expect(url.searchParams.get('workspace_id')).toBe('123')
                    expect(url.searchParams.get('user_ids')).toBe('[1,2,3]')
                    return HttpResponse.json({ 1: mockWorkspaceUser, 2: restrictedUser, 3: null })
                }),
            )

            const users = await client.getUsersByIds({ workspaceId: 123, userIds: [1, 2, 3] })

            expect(users[1]).toEqual(mockWorkspaceUser)
            expect(users[2]).toMatchObject({ id: 2, fullName: 'Alex', restricted: true })
            expect(users[3]).toBeNull()
        })

        it('requests each id once, in chunks of 100, and skips the request for no ids', async () => {
            const requested: number[][] = []
            server.use(
                http.get(apiUrl('api/v1.0/workspace_users/get_by_ids'), ({ request }) => {
                    const ids: number[] = JSON.parse(
                        new URL(request.url).searchParams.get('user_ids') ?? '[]',
                    )
                    requested.push(ids)
                    return HttpResponse.json(
                        Object.fromEntries(ids.map((id) => [id, { ...mockWorkspaceUser, id }])),
                    )
                }),
            )
            const userIds = Array.from({ length: 150 }, (_, i) => i + 1)

            const users = await client.getUsersByIds({ workspaceId: 123, userIds: [...userIds, 1] })
            const none = await client.getUsersByIds({ workspaceId: 123, userIds: [] })

            expect(requested.map((ids) => ids.length)).toEqual([100, 50])
            expect(Object.keys(users)).toHaveLength(150)
            expect(users[150]?.id).toBe(150)
            expect(none).toEqual({})
        })

        it('rejects when a later chunk fails', async () => {
            let requests = 0
            server.use(
                http.get(apiUrl('api/v1.0/workspace_users/get_by_ids'), () =>
                    ++requests === 1
                        ? HttpResponse.json({})
                        : HttpResponse.json({ error: 'forbidden' }, { status: 403 }),
                ),
            )
            const userIds = Array.from({ length: 101 }, (_, i) => i + 1)

            const error = await client.getUsersByIds({ workspaceId: 123, userIds }).catch((e) => e)

            expect(error).toBeInstanceOf(CommsRequestError)
            expect(error.httpStatusCode).toBe(403)
            expect(requests).toBe(2)
        })
    })

    describe('getWorkspaceUsers', () => {
        it('excludes removed users by default and sends no server-side filter param', async () => {
            server.use(
                http.get(apiUrl('api/v1.0/workspace_users/get'), ({ request }) => {
                    const url = new URL(request.url)
                    expect(url.searchParams.get('id')).toBe('123')
                    expect(url.searchParams.has('include_removed')).toBe(false)
                    expect(url.searchParams.has('with_removed')).toBe(false)
                    return HttpResponse.json([mockWorkspaceUser, removedWorkspaceUser])
                }),
            )

            const result = await client.getWorkspaceUsers({ workspaceId: 123 })

            expect(result).toHaveLength(1)
            expect(result[0].id).toBe(mockWorkspaceUser.id)
            expect(result.some((user) => user.removed)).toBe(false)
        })

        it('includes removed users when includeRemoved is true and sends no server-side filter param', async () => {
            server.use(
                http.get(apiUrl('api/v1.0/workspace_users/get'), ({ request }) => {
                    const url = new URL(request.url)
                    expect(url.searchParams.get('id')).toBe('123')
                    expect(url.searchParams.has('include_removed')).toBe(false)
                    expect(url.searchParams.has('with_removed')).toBe(false)
                    return HttpResponse.json([mockWorkspaceUser, removedWorkspaceUser])
                }),
            )

            const result = await client.getWorkspaceUsers({
                workspaceId: 123,
                includeRemoved: true,
            })

            expect(result).toHaveLength(2)
            expect(result.map((user) => user.id)).toEqual([1, 2])
        })
    })
})
