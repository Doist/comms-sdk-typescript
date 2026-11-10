# Test rules

Calibrated on this repository's tests (about 300 in `src/`, November 2026). Each rule says what to flag and what is fine, because a rule that flags good tests teaches agents to damage them.

## 1. It can fail

You saw the test fail once: before the fix, or with the feature undone. A test that has never failed may be testing nothing.

## 2. It asserts outcomes

Assert what reaches the API and what the caller gets: the path, query and body the MSW handler received, and the fields of the parsed result. Flag an assertion that cannot tell right from wrong.

| Flag                                                                                                         | Fine                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `toHaveBeenCalled()` as the only evidence the behaviour happened: nothing checks the arguments or the result | `.not.toHaveBeenCalled()`: proves a call did **not** happen (a `customFetch` means the default transport is never consulted, `src/transport/fetch-with-retry.test.ts:123`)                             |
| `toBeDefined()` as the last word on a value                                                                  | The same as a guard right before reading the value's fields (`src/transport/http-dispatcher.test.ts:66`), or when being there is the behaviour (each client on `CommsApi`, `src/comms-api.test.ts:12`) |
| A test whose only assertion is that no error was thrown, when the behaviour is a result                      | `toBeInstanceOf` when accepting the options **is** the behaviour (`src/custom-fetch-simple.test.ts:20`)                                                                                                |
| `toMatchObject` that replaced a `toEqual`, so extra or wrong fields now pass                                 | `toMatchObject` on a request body when the test is about those fields (`src/clients/channels-client.test.ts:59`)                                                                                       |

Judge a test by its point, the behaviour its name describes. A weak assertion beside the ones that carry that point is fine.

## 3. Expected values come from outside the code under test

Write the expected value out as literals (a lookup table or `it.each` rows are fine), or build it from fixtures. The wire format is snake_case JSON with timestamps in seconds: write it out as the API sends it. Flag an expectation that calls the code under test, or recomputes the answer the way the code does (the SDK's own `camelCaseKeys`/`snakeCaseKeys`, its schemas, its timestamp conversion).

## 4. Mock only real boundaries

The real boundary here is the Comms API: MSW handlers (`server.use`), or a `customFetch` stub. Other boundaries: the global `fetch` and undici in the transport tests, a local `node:http` server for the real dispatcher, the clock (`vi.useFakeTimers`, `src/transport/fetch-with-retry.test.ts:136`), environment variables such as the proxy settings.

| Flag                                                                            | Fine                                                                                                                                                                     |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A **new** `vi.mock` of an internal module, to make setup easier                 | The suite-wide transport seam in `src/testUtils/msw-setup.ts`, which lets MSW see requests                                                                               |
| Mocking the function the test is about, or one that computes its expected value | A call-through mock of `@todoist/sdk-kmp` that records what the SDK hands the shared library, next to assertions on the result (`src/utils/reply-recipients.test.ts:12`) |

New tests should answer requests with MSW rather than mock a client or the transport.

## 5. No skipped or focused tests

None exist today. `.only` fails in CI (`CI=true`, which `npm run verify` sets too). Don't add `.skip`, `.todo` or `xit` to get green.

## 6. No fixed sleeps

Use fake timers (`vi.advanceTimersByTimeAsync`) or wait on the event. There are no real sleeps in `src/` tests today.

## 7. No snapshots

There are none here. Assert the fields that matter, so a reader sees what the test is about. Flag a new `toMatchSnapshot()` or `toMatchInlineSnapshot()`.

## 8. Reading source files is for contracts

Fine: a test that reads source or config to enforce a rule across the codebase (`.agents/scripts/lib/steps.test.ts` reading the workflows and `package.json`). Flag a test that reads a source file to check one function's behaviour; call the function instead.

## 9. No real user data

Fixtures use made-up names, emails and ids (`src/testUtils/test-defaults.ts`, `example.com`). This repository is public.
