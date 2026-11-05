# Comms SDK TypeScript

`@doist/comms-sdk`, the TypeScript SDK for the Comms REST API. ESM-only, Node 24 or newer. Its users are other packages and apps, so everything exported from `src/index.ts` is public API.

## Definition of done

- **Done means proven:** a test that failed before the change and passes after, at the public interface: a `CommsApi` client method against MSW handlers, or an exported helper. For a refactor: tests that pin the behaviour, passing before and after. Reading code or a passing compile is not proof.
- **Run `npm run verify` before calling a change done.** It runs every check CI runs on a pull request, in about ten seconds, and records the pass. It prints what it cannot see, and when only docs changed it checks just their formatting.
- **Never weaken a check to pass it.** Don't skip, delete or loosen tests, edit lint, type or test config to get green, or use `--no-verify`. If a check looks wrong, say so and stop.
- **Report honestly:** what ran, what it showed, and what you did not verify.

## Commands

```bash
npm run build       # clean, compile to dist/esm and dist/types, fix the ESM and .d.ts imports
npm run type-check  # tsc --noEmit for src/ and the agent tooling (.agents/scripts)
npm run check       # oxlint + oxfmt --check
npm run check:fix   # oxlint --fix + oxfmt
npm test            # vitest run
npm run verify      # every check CI runs on a pull request (lint, format, types, tests, build)
npm run attw        # how consumers resolve the packed package; the release runs it
```

## Where things live

- `src/comms-api.ts`: `CommsApi`, which holds one client per area of the API (`src/clients/*-client.ts`, all built on `base-client.ts`).
- `src/types/`: entities and requests, with most of their Zod schemas. `src/consts/endpoints.ts`: the API's URLs.
- `src/transport/`: the HTTP client, retries and the undici dispatcher.
- `src/index.ts`: the public API. Anything not exported from it is internal.
- Tests sit next to the code (`*.test.ts`). MSW answers every request (`src/testUtils/msw-setup.ts`); fixtures and test IDs are in `src/testUtils/test-defaults.ts`.
- `website/`: the docs site (Docusaurus, with TypeDoc reading `src/index.ts`). `scripts/`: the build's import fixers.

## String Union Types

When defining a string union type, always derive it from a `const` array with `as const`. This gives you both a runtime array and a type from a single source of truth.

### Pattern

```ts
export const EXAMPLE_VALUES = ['a', 'b', 'c'] as const
export type ExampleValue = (typeof EXAMPLE_VALUES)[number]

// If used in a Zod schema:
z.enum(EXAMPLE_VALUES)
```

### Rules

- **Naming**: `SCREAMING_SNAKE_CASE` for const arrays, `PascalCase` for types
- **Export**: Always export const arrays and types
- **Chaining**: Never put `.nullable()` or `.optional()` on the const array — chain those on the schema after `z.enum()`
- **Placement**: Place the const array and type immediately above the first usage
- **Reuse**: If the same values appear in multiple files, define the const array once and import it elsewhere

## Zod Schemas

- **Export**: All Zod schemas should be exported

## Git hooks and agent tooling

- Commits and pushes to `main` are refused by the git hooks. Work on a branch.
- Agent tooling lives in `.agents/scripts/`. It never ships: `package.json#files` lists only `dist/`, and a test checks the packed package.
- How it all fits together: [`docs/agents.md`](docs/agents.md).
