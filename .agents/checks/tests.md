# Check: tests

Apply to every change that touches code or tests. The quality bar is `.agents/skills/write-tests/references/test-rules.md`.

## Report

- A test deleted, skipped (`.skip`, `.todo`, `xit`), or with an assertion loosened (`toEqual` → `toMatchObject`, exact arguments → `toHaveBeenCalled()`, an exact request body → `expect.objectContaining`), without a behaviour change that explains it.
- New behaviour with no test, or a test that would still pass with the change undone.
- A client test that never looks at the request the API received, when the change is about what the SDK sends.
- A new `vi.mock` of an internal module, or a mock of the function under test.
- An expected value computed by the code under test: its schemas, its case conversion, its timestamp helpers.
- A test that reaches the real Comms API or any other network service, instead of MSW, a `customFetch` stub or a local server.
- A new snapshot test, or a fixed sleep where fake timers would do.
- Config that runs fewer tests or checks less: `vitest.config.ts` `include`/`exclude`, `src/testUtils/msw-setup.ts`, the scripts in `package.json`, the steps in `.github/workflows/ci.yml`.

## Fine

- `.not.toHaveBeenCalled()`, guards like `toBeDefined()` before reading a value, and `toMatchObject` on the request fields a test is about, as the test rules describe.
- A test changing its assertions because the behaviour changed on purpose, when the description says so.
- A refactor changing import paths, names or call sites in tests.
