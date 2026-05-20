import { camelCaseKeys, snakeCaseKeys } from './case-conversion'

describe('caseConversion', () => {
    describe('camelCaseKeys', () => {
        it('should convert snake_case keys to camelCase', () => {
            const input = {
                user_id: 1,
                user_name: 'John',
                is_active: true,
                created_at: '2023-01-01',
            }

            const expected = {
                userId: 1,
                userName: 'John',
                isActive: true,
                createdAt: '2023-01-01',
            }

            expect(camelCaseKeys(input)).toEqual(expected)
        })

        it('should handle nested objects', () => {
            const input = {
                user_data: {
                    first_name: 'John',
                    last_name: 'Doe',
                },
                workspace_info: {
                    workspace_id: 1,
                    is_public: false,
                },
            }

            const expected = {
                userData: {
                    firstName: 'John',
                    lastName: 'Doe',
                },
                workspaceInfo: {
                    workspaceId: 1,
                    isPublic: false,
                },
            }

            expect(camelCaseKeys(input)).toEqual(expected)
        })

        it('should handle arrays', () => {
            const input = [
                { user_id: 1, user_name: 'John' },
                { user_id: 2, user_name: 'Jane' },
            ]

            const expected = [
                { userId: 1, userName: 'John' },
                { userId: 2, userName: 'Jane' },
            ]

            expect(camelCaseKeys(input)).toEqual(expected)
        })

        it('should handle primitive values', () => {
            expect(camelCaseKeys('test')).toBe('test')
            expect(camelCaseKeys(123)).toBe(123)
            expect(camelCaseKeys(true)).toBe(true)
            expect(camelCaseKeys(null)).toBe(null)
        })
    })

    describe('snakeCaseKeys', () => {
        it('should convert camelCase keys to snake_case', () => {
            const input = {
                userId: 1,
                userName: 'John',
                isActive: true,
                createdAt: '2023-01-01',
            }

            const expected = {
                user_id: 1,
                user_name: 'John',
                is_active: true,
                created_at: '2023-01-01',
            }

            expect(snakeCaseKeys(input)).toEqual(expected)
        })

        it('should handle nested objects', () => {
            const input = {
                userData: {
                    firstName: 'John',
                    lastName: 'Doe',
                },
                workspaceInfo: {
                    workspaceId: 1,
                    isPublic: false,
                },
            }

            const expected = {
                user_data: {
                    first_name: 'John',
                    last_name: 'Doe',
                },
                workspace_info: {
                    workspace_id: 1,
                    is_public: false,
                },
            }

            expect(snakeCaseKeys(input)).toEqual(expected)
        })

        it('should handle arrays', () => {
            const input = [
                { userId: 1, userName: 'John' },
                { userId: 2, userName: 'Jane' },
            ]

            const expected = [
                { user_id: 1, user_name: 'John' },
                { user_id: 2, user_name: 'Jane' },
            ]

            expect(snakeCaseKeys(input)).toEqual(expected)
        })

        it('should handle primitive values', () => {
            expect(snakeCaseKeys('test')).toBe('test')
            expect(snakeCaseKeys(123)).toBe(123)
            expect(snakeCaseKeys(true)).toBe(true)
            expect(snakeCaseKeys(null)).toBe(null)
        })
    })
})
