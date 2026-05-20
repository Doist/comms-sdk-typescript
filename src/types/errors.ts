import { CustomError } from 'ts-custom-error'

export class CommsRequestError extends CustomError {
    public httpStatusCode?: number
    public responseData?: unknown

    constructor(message: string, httpStatusCode?: number, responseData?: unknown) {
        super(message)
        this.httpStatusCode = httpStatusCode
        this.responseData = responseData
    }
}
