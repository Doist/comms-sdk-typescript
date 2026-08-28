import { CustomError } from 'ts-custom-error'

export class CommsRequestError extends CustomError {
    public httpStatusCode?: number
    public responseData?: unknown

    constructor(
        message: string,
        httpStatusCode?: number,
        responseData?: unknown,
        options?: { cause?: unknown },
    ) {
        super(message, options)
        this.httpStatusCode = httpStatusCode
        this.responseData = responseData
    }
}
