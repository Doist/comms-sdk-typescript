---
name: verify
description: Proves a change works before it is called done, and reports the evidence on a ladder from "said" to "ran". Use when you are about to say "done", "fixed", "works" or "ready", when asked to check or test a change, or before opening a pull request.
---

# Verify a change

## 1. Run the checks

```bash
npm run verify
```

It runs every check CI runs on a pull request (about ten seconds) and records the pass. Fix every failure; never weaken a check to pass it. Done when it prints `Verified.`, or says only docs changed and only their formatting was checked.

## 2. Prove the change itself

The checks prove nothing broke. Now prove the change does what was asked, with the proof its kind needs:

| Change                                                   | Proof                                                                                                                                                                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A client method: the request it sends or what it returns | A test in `src/clients/<area>-client.test.ts` that answers the call with `server.use(http.<method>(...))` and asserts both the request received and the result. Undo the change once and see the test fail. |
| A schema or entity type (`src/types/`)                   | A test that parses a payload with the schema, including the field the change is about (`src/types/entities.test.ts`). `npm run verify` type-checks the rest.                                                |
| Retries, timeouts or the dispatcher (`src/transport/`)   | Their tests, which opt out of the MSW seam to use the real undici (see `src/transport/http-dispatcher.test.ts`).                                                                                            |
| `customFetch`, `baseUrl` or headers                      | A `customFetch` stub that answers per request, as in `src/custom-fetch-simple.test.ts`.                                                                                                                     |
| The public API (anything exported from `src/index.ts`)   | `npm run verify` type-checks it. `npm run build && npm run attw` checks how consumers resolve the package. `README.md` describes the change.                                                                |
| The docs site (`website/`) or doc comments TypeDoc reads | `npm ci && npm run build` in `website/`. It is the one pull-request check `npm run verify` leaves out.                                                                                                      |
| A real Comms answer                                      | `npm run build`, then a short script that imports `dist/esm/index.js`, with a test account's token from the environment. Never a real account; ask before writes.                                           |
| Agent tooling (`.agents/scripts`)                        | Its tests in throwaway repos, plus one real run of the hook or command.                                                                                                                                     |
| Docs only                                                | Every path and command named exists (`ls`, `npm run`).                                                                                                                                                      |

Check the proof can fail: undo the change and see the test fail, or run the scenario that used to break. Done when you have seen it fail and then pass. A refactor is the exception: its proof is the pinned tests passing before and after (see `refactor`).

## 3. Report the evidence

Rate every claim on this ladder:

1. **said:** stated without looking.
2. **cited:** the line that shows it (`path:line`).
3. **traced:** followed the code path through each call.
4. **ran:** a test or command executed the code and showed the result.
5. **seen:** observed against the real Comms API, or in a consumer built against this change.

Claims about behaviour ("fixed", "works", "safe", "no regressions") need **ran** or higher. A fact the code shows needs **cited**. Anything lower goes under **Not verified**, with why.

Everything exported from `src/index.ts` is code other packages rely on. For a change to it, or to code it reaches (`src/clients/base-client.ts`, `src/transport/`, the schemas in `src/types/`), name the one fact that makes it safe for them, and how you proved it.

Report format:

```
What changed: <one line>
Verified:
- <claim> — ran: <command or test>, <what it showed>
Not verified:
- <claim> — <why>
Safe because: <the one fact>, <how you proved it>   (only for the public API or shared code)
```
