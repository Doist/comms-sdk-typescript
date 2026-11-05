# Check: security

The SDK carries each caller's Comms API token, and OAuth client secrets, inside every app that uses it. Apply to changes in `src/`.

## Report

- A token, client secret, authorisation code or `Authorization` header written into an error message, a log, or an object a caller is likely to log, such as a `CommsRequestError` and its `cause`.
- The token sent anywhere but the configured Comms base URL: a URL taken from API data or caller input that the SDK then calls with the token, or a redirect followed with the `Authorization` header still attached.
- OAuth changes in `src/authentication.ts` that weaken the `state` parameter (`getAuthStateParameter`), send the client secret anywhere but the token endpoint, or drop the `redirect_uri` the flow asked for.
- Transport changes in `src/transport/http-dispatcher.ts` that turn off certificate checks or ignore the proxy settings.
- Caller input placed in a URL path without encoding, so it can change which endpoint is called.
- A new dependency with install scripts, or one pulled from outside the npm registry.

## Fine

- Error messages with the status code, the endpoint and the API's error code.
- Test fixtures with fake tokens (`test-api-token`) and made-up ids.
