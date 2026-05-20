import {
    base58FromUuidString,
    decodeBase58ToUuidBytes,
    encodeUuidToBase58,
    generateId,
    isValidUuidV7Base58,
    UuidV7Error,
    uuidStringFromBase58,
} from './uuidv7'

describe('uuidv7 utilities', () => {
    test('generateId produces a valid UUIDv7 base58 string', () => {
        for (let i = 0; i < 20; i++) {
            const id = generateId()
            expect(typeof id).toBe('string')
            expect(id.length).toBeGreaterThanOrEqual(20)
            expect(id.length).toBeLessThanOrEqual(22)
            expect(isValidUuidV7Base58(id)).toBe(true)
        }
    })

    test('generateId values are unique', () => {
        const set = new Set<string>()
        for (let i = 0; i < 100; i++) set.add(generateId())
        expect(set.size).toBe(100)
    })

    test('encode/decode round-trip preserves bytes', () => {
        const bytes = new Uint8Array(16)
        for (let i = 0; i < 16; i++) bytes[i] = (i * 17) & 0xff
        const encoded = encodeUuidToBase58(bytes)
        const decoded = decodeBase58ToUuidBytes(encoded)
        expect(Array.from(decoded)).toEqual(Array.from(bytes))
    })

    test('base58FromUuidString matches encodeUuidToBase58', () => {
        const uuid = '01976e0c-2f4d-7a1f-9b3a-2b3c4d5e6f70'
        const expected = encodeUuidToBase58(
            new Uint8Array([
                0x01, 0x97, 0x6e, 0x0c, 0x2f, 0x4d, 0x7a, 0x1f, 0x9b, 0x3a, 0x2b, 0x3c, 0x4d, 0x5e,
                0x6f, 0x70,
            ]),
        )
        expect(base58FromUuidString(uuid)).toBe(expected)
        expect(uuidStringFromBase58(expected)).toBe(uuid)
    })

    test('decodeBase58ToUuidBytes rejects garbage', () => {
        expect(() => decodeBase58ToUuidBytes('')).toThrow(UuidV7Error)
        expect(() => decodeBase58ToUuidBytes('0O')).toThrow(UuidV7Error)
        expect(() => decodeBase58ToUuidBytes('1'.repeat(30))).toThrow(UuidV7Error)
    })

    test('isValidUuidV7Base58 rejects non-v7 UUIDs', () => {
        // UUIDv4: version nibble 0x40, variant 0x80
        const v4 = new Uint8Array(16)
        v4[6] = 0x42
        v4[8] = 0x80
        expect(isValidUuidV7Base58(encodeUuidToBase58(v4))).toBe(false)
    })
})
