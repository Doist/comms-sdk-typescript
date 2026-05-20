import { timestampToDate, transformTimestamps } from './timestamp-conversion'

describe('timestampConversion', () => {
    describe('timestampToDate', () => {
        it('should convert a Unix timestamp in seconds to a Date object', () => {
            const timestamp = 1700000000
            const result = timestampToDate(timestamp)
            expect(result).toBeInstanceOf(Date)
            expect(result.getTime()).toBe(timestamp * 1000)
        })
    })

    describe('transformTimestamps', () => {
        it('should convert fields ending in Ts to Date objects and strip the suffix', () => {
            const input = { postedTs: 1700000000, title: 'hello' }
            const result = transformTimestamps(input)
            expect(result).toEqual({
                posted: new Date(1700000000 * 1000),
                title: 'hello',
            })
        })

        it('should handle null and undefined', () => {
            expect(transformTimestamps(null)).toBe(null)
            expect(transformTimestamps(undefined)).toBe(undefined)
        })

        it('should handle arrays', () => {
            const input = [{ postedTs: 1700000000 }, { postedTs: 1700000001 }]
            const result = transformTimestamps(input)
            expect(result).toEqual([
                { posted: new Date(1700000000 * 1000) },
                { posted: new Date(1700000001 * 1000) },
            ])
        })

        it('should recursively transform nested objects', () => {
            const input = {
                name: 'test',
                nested: { createdTs: 1700000000 },
            }
            const result = transformTimestamps(input)
            expect(result).toEqual({
                name: 'test',
                nested: { created: new Date(1700000000 * 1000) },
            })
        })

        it('should use *Date suffix when stripping Ts would collide with an existing key', () => {
            const input = {
                pinned: true,
                pinnedTs: 1700000000,
            }
            const result = transformTimestamps(input) as Record<string, unknown>
            expect(result.pinned).toBe(true)
            expect(result.pinnedDate).toEqual(new Date(1700000000 * 1000))
        })

        it('should not collide when the base key does not exist', () => {
            const input = { pinnedTs: 1700000000 }
            const result = transformTimestamps(input) as Record<string, unknown>
            expect(result.pinned).toEqual(new Date(1700000000 * 1000))
            expect(result.pinnedDate).toBeUndefined()
        })

        it('should skip Ts fields that are not numbers', () => {
            const input = { pinnedTs: null, title: 'test' }
            const result = transformTimestamps(input)
            expect(result).toEqual({ pinnedTs: null, title: 'test' })
        })
    })
})
