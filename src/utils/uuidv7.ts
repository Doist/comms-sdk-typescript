import { v7 as uuidv7 } from 'uuid'

/**
 * ID utilities for entities that use opaque string identifiers (channels,
 * threads, comments, conversations, messages, groups).
 *
 * Use {@link generateId} to mint a new ID locally and pass it to a creation
 * endpoint. {@link encodeUuidToBase58} / {@link decodeBase58ToUuidBytes}
 * expose the underlying encoding for callers that need to round-trip raw
 * UUID bytes themselves.
 */

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const BASE58_MAP: Readonly<Record<string, number>> = (() => {
    const map: Record<string, number> = {}
    for (let i = 0; i < BASE58_ALPHABET.length; i++) {
        map[BASE58_ALPHABET[i] as string] = i
    }
    return map
})()

const UUID_BYTES_LEN = 16
const UUID_BASE58_MAX_LEN = 22

const HEX_RE = /^[0-9a-f]+$/

export class UuidV7Error extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'UuidV7Error'
    }
}

/** Encode a 16-byte UUID as a base58 string. */
export function encodeUuidToBase58(bytes: Uint8Array): string {
    if (bytes.length !== UUID_BYTES_LEN) {
        throw new UuidV7Error(`id must be ${UUID_BYTES_LEN} bytes`)
    }

    let zeros = 0
    while (zeros < bytes.length && bytes[zeros] === 0) {
        zeros++
    }

    let n = 0n
    for (const b of bytes) {
        n = (n << 8n) | BigInt(b)
    }

    let out = ''
    while (n > 0n) {
        const rem = Number(n % 58n)
        out = (BASE58_ALPHABET[rem] as string) + out
        n /= 58n
    }
    return '1'.repeat(zeros) + out
}

/**
 * Decode a base58 string back into 16 UUID bytes. Throws {@link UuidV7Error}
 * if the input is malformed or doesn't decode to exactly 16 bytes.
 */
export function decodeBase58ToUuidBytes(value: string): Uint8Array {
    if (typeof value !== 'string') {
        throw new UuidV7Error('id must be a base58 string')
    }
    if (value.length === 0) {
        throw new UuidV7Error('id is empty')
    }
    if (value.length > UUID_BASE58_MAX_LEN) {
        throw new UuidV7Error('id is too long')
    }

    let zeros = 0
    while (zeros < value.length && value[zeros] === '1') {
        zeros++
    }

    let n = 0n
    for (let i = 0; i < value.length; i++) {
        const ch = value[i] as string
        const v = BASE58_MAP[ch]
        if (v === undefined) {
            throw new UuidV7Error(`invalid base58 character: '${ch}'`)
        }
        n = n * 58n + BigInt(v)
    }

    const raw: number[] = []
    while (n > 0n) {
        raw.unshift(Number(n & 0xffn))
        n >>= 8n
    }

    const padded = new Uint8Array(zeros + raw.length)
    padded.set(raw, zeros)

    if (padded.length !== UUID_BYTES_LEN) {
        throw new UuidV7Error(`id must decode to ${UUID_BYTES_LEN} bytes`)
    }
    return padded
}

function hexToBytes(hex: string): Uint8Array {
    const out = new Uint8Array(hex.length / 2)
    for (let i = 0; i < out.length; i++) {
        out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    }
    return out
}

/**
 * Mint a fresh ID. Callers should generate one of these locally when
 * creating a new channel / thread / comment / conversation / message /
 * group — the backend requires the client to supply the ID on create.
 */
export function generateId(): string {
    const hex = uuidv7().replace(/-/g, '')
    return encodeUuidToBase58(hexToBytes(hex))
}

/** Validate an existing entity ID without minting a replacement. */
export function resolveReferenceId(id: string, fieldName: string): string {
    if (!isValidUuidV7Base58(id)) {
        throw new UuidV7Error(
            `invalid ${fieldName} ${JSON.stringify(id)} — use a base58 UUIDv7 value for \`${fieldName}\`.`,
        )
    }
    return id
}

/**
 * Resolve the `id` for a create-style API call: validate the caller-supplied
 * value (throwing {@link UuidV7Error} before the request leaves the SDK) or
 * mint a fresh one via {@link generateId}.
 */
export function resolveCreateId(id: string | undefined): string {
    if (id === undefined) return generateId()
    if (!isValidUuidV7Base58(id)) {
        throw new UuidV7Error(
            `invalid id ${JSON.stringify(id)} — use generateId() or omit \`id\` and let the SDK mint one.`,
        )
    }
    return id
}

/**
 * Validate that a value matches the expected ID format (the decoded bytes
 * have the v7 version nibble + RFC 4122/9562 variant bits). Does NOT
 * validate the embedded timestamp — the backend may still reject a value
 * that is too far in the future or past.
 */
export function isValidUuidV7Base58(value: unknown): value is string {
    if (typeof value !== 'string') return false
    let bytes: Uint8Array
    try {
        bytes = decodeBase58ToUuidBytes(value)
    } catch {
        return false
    }
    const versionNibble = (bytes[6] as number) & 0xf0
    const variantBits = (bytes[8] as number) & 0xc0
    return versionNibble === 0x70 && variantBits === 0x80
}

/**
 * Encode a canonical UUID string (hyphenated or not, any case) as a
 * wire-format ID. Useful when interoperating with systems that hand you
 * UUIDs in canonical form.
 */
export function base58FromUuidString(uuid: string): string {
    const stripped = uuid.replace(/-/g, '').toLowerCase()
    if (stripped.length !== 32 || !HEX_RE.test(stripped)) {
        throw new UuidV7Error('not a valid UUID string')
    }
    return encodeUuidToBase58(hexToBytes(stripped))
}

/**
 * Inverse of {@link base58FromUuidString}: takes a wire-format ID and
 * returns the canonical hyphenated UUID string.
 */
export function uuidStringFromBase58(value: string): string {
    const bytes = decodeBase58ToUuidBytes(value)
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32),
    ].join('-')
}
