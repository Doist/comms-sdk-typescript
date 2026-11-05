# Check: architecture

Rules lint and types can't express. Most are written in `AGENTS.md`; report where a change works around one.

## Report

- A string union type not derived from an exported `const` array, `.nullable()` or `.optional()` chained on the array instead of the schema, or a Zod schema that isn't exported ("String Union Types" and "Zod Schemas" in `AGENTS.md`).
- A client method that hands API data to the caller without parsing it through its schema, or a schema loosened (`z.any()`, a dropped field, a looser type) only to make a parse pass.
- An endpoint called outside its area's client, or a client that sends requests other than through `request` in `src/transport/http-client.ts` (its own `fetch`, retries or headers).
- A new client not wired into `CommsApi` (`src/comms-api.ts`) or not exported from `src/index.ts`.
- Snake_case keys or second-based timestamps reaching callers, or camelCase keys reaching the API.
- `interface` for an object shape, where a `type` alias would do. The SDK declares none.
- A runtime dependency added where the Node standard library or an existing dependency does the job: every one ships to every consumer.
- A helper that duplicates one in `src/utils/`.

## Fine

- An exception documented next to the code, with the reason.
- Request types and schemas kept next to the client when only that client uses them.
