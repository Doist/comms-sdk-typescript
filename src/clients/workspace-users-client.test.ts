import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { apiUrl } from '../testUtils/msw-handlers'
import { server } from '../testUtils/msw-setup'
import { mockWorkspaceUser, TEST_API_TOKEN } from '../testUtils/test-defaults'
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

    describe('getWorkspaceUsers', () => {
        it('excludes removed users by default and sends no server-side filter param', async () => {
            server.use(
                http.get(apiUrl('api/v1/workspace_users/get'), ({ request }) => {
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

        it('includes removed users when includeRemoved is true', async () => {
            server.use(
                http.get(apiUrl('api/v1/workspace_users/get'), () =>
                    HttpResponse.json([mockWorkspaceUser, removedWorkspaceUser]),
                ),
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
