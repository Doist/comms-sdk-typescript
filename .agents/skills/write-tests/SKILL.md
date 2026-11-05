---
name: write-tests
description: Writes or changes tests in this repository to its quality bar, with the right helpers and layer. Use when adding, fixing or reviewing tests, when a change "needs a test", or when deciding whether a test may change.
---

# Write tests

## Where tests live

- Next to the code: `src/clients/channels-client.ts` → `src/clients/channels-client.test.ts`. Vitest, globals on.
- Client tests go through the public API: `new CommsApi(TEST_API_TOKEN)`, then a method such as `api.channels.createChannel(...)`. MSW answers the request: `server.use(http.post(url, handler))`, with the URL built from `TEST_API_BASE_URL` and a handler that can read the request and return the payload. Handlers reset after each test.
- `src/testUtils/msw-setup.ts` runs before every test file. It starts MSW and moves the transport onto the global `fetch`, which MSW intercepts.
- Transport tests (`src/transport/`) test the real undici: `src/transport/http-dispatcher.test.ts` and `src/transport/fetch-with-retry.test.ts` opt out of that seam with `vi.unmock('./http-dispatcher')`, and `src/transport/http-client.test.ts` stubs the global `fetch`.
- `src/custom-fetch-simple.test.ts` covers the `customFetch` option with a stub that answers per request.
- Agent tooling tests live in `.agents/scripts/` and run copies of the tools in throwaway repos (`.agents/scripts/lib/test-repo.ts`).

## Helpers

From `src/testUtils/test-defaults.ts`: `TEST_API_TOKEN`, `TEST_API_BASE_URL`, `TEST_CHANNEL_ID`, `TEST_THREAD_ID`, `TEST_COMMENT_ID`, `TEST_CONVERSATION_ID`, `TEST_MESSAGE_ID`, `TEST_GROUP_ID`, `mockUser`, `mockWorkspace`, `mockChannel`, `mockThread`, `mockGroup`, `mockConversation`, `mockComment`, `mockWorkspaceUser`. From `src/testUtils/msw-handlers.ts`: `createSuccessResponse`, `createErrorResponse`, `apiUrl`, `createGetHandler`, `createPostHandler`. And `server` from `src/testUtils/msw-setup.ts`. Use them instead of building objects and ids by hand; extend them when a test needs a new shape. The channel and thread ids are base58 UUIDv7 strings because the SDK validates them before sending.

## The quality bar

Read [references/test-rules.md](references/test-rules.md) before writing or reviewing a test. In short: a test counts only if it can fail. It asserts outcomes (the request the API received and what the caller got back), takes expected values from outside the code under test, mocks only real boundaries, and you saw it fail once.

Done when each new test has failed once for the right reason, and then passes.

## When an existing test may change

- **The behaviour changed on purpose** (a feature or a fix): change the assertions that describe it, and say which in the report.
- **A refactor:** only how the test reaches the code (imports, names, call sites). Never its inputs or assertions.
- **Never** to make a failing check pass without a behaviour change: no `.skip`, no deleted test, no looser matcher (`toEqual` → `toMatchObject`), no widened handler that answers any request.
