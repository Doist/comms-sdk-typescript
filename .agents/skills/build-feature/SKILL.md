---
name: build-feature
description: Builds a new client method, endpoint, option or behaviour in thin test-first slices, after settling the open decisions with the owner. Use when asked to "add", "build", "implement", "support" or "create" something, such as a new endpoint, a new client method or a new request option.
---

# Build a feature

## 1. Read the closest existing feature

Find the method most like the one you are building and read it with its test: `getUsersByIds` in `src/clients/workspace-users-client.ts` for a read that batches ids, `createChannel` in `src/clients/channels-client.ts` for a create with request options, `src/clients/search-client.ts` for a query with filters. Read the rules in `AGENTS.md` ("String Union Types", "Zod Schemas"). Done when you can name the file you will copy patterns from.

## 2. Settle decisions in one round

List what the request leaves open: the method's name and which client carries it, its argument type and which fields are optional, what it returns (and its schema), how it reports failure, whether it changes anything existing callers see, and so whether the PR title is `feat:` or a breaking `feat!:`. Ask the owner all of them at once, each with your recommendation. Don't ask what the code can answer. Done when every decision has an answer.

## 3. Write "done" as checkable behaviours

Write each behaviour as a call and the expected request and result, for example: "`api.workspaceUsers.getUsersByIds({ workspaceId: 1, userIds: [2, 2, 3] })` sends one request with `user_ids=[2,3]` and returns `{ 2: user, 3: null }` when the API answers `3: null`". Each becomes a test. Done when a test could pass or fail on every one.

## 4. Build in thin slices, test first

For each behaviour: write its test at the public interface (`new CommsApi(TEST_API_TOKEN)`, the API answered by `server.use(...)`), see it fail, make it pass, run its test file. Follow `write-tests`. Done when every behaviour from step 3 has a passing test you saw fail.

## 5. Update everything the change touches

| You changed                      | Also update                                                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Added a client method            | Its argument type in `src/types/requests.ts`, the response schema in `src/types/entities.ts`, and a doc comment TypeDoc can publish |
| Added a client                   | `src/comms-api.ts`, the export in `src/index.ts`, and `src/comms-api.test.ts`                                                       |
| Added a helper callers use       | Its module in `src/utils/` and `src/utils/index.ts`, which `src/index.ts` re-exports                                                |
| A set of allowed string values   | A `const` array with its type, as "String Union Types" in `AGENTS.md` says                                                          |
| A schema or a parsed field       | Every client that parses that entity; a stricter schema makes a call fail where it used to succeed                                  |
| Documented usage                 | `README.md`, and `website/docs/` if the docs site covers it; build the site once (`npm ci && npm run build` in `website/`)          |
| Structure (new folder or client) | "Where things live" in `AGENTS.md`                                                                                                  |

Done when each row that applies is handled.

## 6. Verify and report

Follow `verify`. If the feature needs restructuring first, do that as a separate change with `refactor`.
