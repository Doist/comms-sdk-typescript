import {
    CommsRequestError,
    getCommsErrorCode,
    getCommsErrorString,
    isConflict,
    isMalformedId,
    isNotFound,
} from './errors'

function requestError(status: number, body?: unknown): CommsRequestError {
    return new CommsRequestError('request failed', status, body)
}

describe('isNotFound', () => {
    it('is true for a 404', () => {
        expect(isNotFound(requestError(404))).toBe(true)
    })

    it('is false for another status', () => {
        expect(isNotFound(requestError(409))).toBe(false)
    })

    it('is false for an error with no status', () => {
        expect(isNotFound(new CommsRequestError('network down'))).toBe(false)
    })

    it('is false for anything that is not a CommsRequestError', () => {
        expect(isNotFound(new Error('nope'))).toBe(false)
        expect(isNotFound({ httpStatusCode: 404 })).toBe(false)
        expect(isNotFound(undefined)).toBe(false)
    })
})

describe('isConflict', () => {
    it('is true for a 409', () => {
        expect(isConflict(requestError(409))).toBe(true)
    })

    it('is false for another status', () => {
        expect(isConflict(requestError(404))).toBe(false)
    })
})

describe('getCommsErrorCode', () => {
    it('reads the numeric error_code out of the response body', () => {
        expect(getCommsErrorCode(requestError(409, { error_code: 217 }))).toBe(217)
    })

    it('is null when the body carried no error_code', () => {
        expect(getCommsErrorCode(requestError(409, { error_string: 'nope' }))).toBeNull()
        expect(getCommsErrorCode(requestError(409))).toBeNull()
    })

    it('is null when error_code is not a number', () => {
        expect(getCommsErrorCode(requestError(409, { error_code: '217' }))).toBeNull()
    })

    it('is null for anything that is not a CommsRequestError', () => {
        expect(getCommsErrorCode({ responseData: { error_code: 217 } })).toBeNull()
    })
})

describe('getCommsErrorString', () => {
    it('reads the error_string out of the response body', () => {
        const error = requestError(409, { error_string: 'id must decode to 16 bytes' })
        expect(getCommsErrorString(error)).toBe('id must decode to 16 bytes')
    })

    it('is null when the body carried no error_string', () => {
        expect(getCommsErrorString(requestError(409, { error_code: 217 }))).toBeNull()
        expect(getCommsErrorString(requestError(409))).toBeNull()
    })

    it('is null when error_string is not a string', () => {
        expect(getCommsErrorString(requestError(409, { error_string: 217 }))).toBeNull()
    })

    it('is null for anything that is not a CommsRequestError', () => {
        expect(getCommsErrorString({ responseData: { error_string: 'nope' } })).toBeNull()
    })

    it('does not fall back to the error message', () => {
        // `message` is the SDK's own text; this reads the server's body only.
        expect(getCommsErrorString(requestError(409))).toBeNull()
    })
})

describe('isMalformedId', () => {
    it('is true for a 409 carrying error_code 217', () => {
        expect(isMalformedId(requestError(409, { error_code: 217 }))).toBe(true)
    })

    it('is true whichever message the server pairs with 217', () => {
        // The API sends 217 for both an id that does not decode to 16 bytes
        // and one whose version nibble is not 7, so the code is what it keys on.
        const decode = requestError(409, {
            error_code: 217,
            error_string: 'id must decode to 16 bytes',
        })
        const nibble = requestError(409, {
            error_code: 217,
            error_string: 'id must be UUIDv7 (version nibble mismatch)',
        })
        expect(isMalformedId(decode)).toBe(true)
        expect(isMalformedId(nibble)).toBe(true)
    })

    it('is false for a 409 that is a genuine conflict', () => {
        expect(isMalformedId(requestError(409, { error_code: 110 }))).toBe(false)
        expect(isMalformedId(requestError(409))).toBe(false)
    })

    it('is false for 217 on another status', () => {
        expect(isMalformedId(requestError(404, { error_code: 217 }))).toBe(false)
    })
})
