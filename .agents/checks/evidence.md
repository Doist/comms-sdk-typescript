# Check: evidence

Apply to the PR description and any report from an agent.

## Report

- A behaviour claim ("fixed", "works", "safe", "no regressions") with no test or command that ran it.
- A "Not verified" section missing when something could not be checked: the real Comms API, the docs site build, a consumer built against the change, the other Node version CI tests on.
- A change to the public API, or to code it reaches (`src/clients/base-client.ts`, `src/transport/`, the schemas in `src/types/`), without the one fact that makes it safe for consumers.
- A PR title whose type doesn't match the change: behaviour changes need `feat:`, `fix:` or `perf:` to release (`!` for breaking); tooling, docs and restructuring use `chore:`, `ci:`, `docs:`, `test:` or `refactor:` so they don't.

## Fine

- Claims about what the code shows, with the cited line.
