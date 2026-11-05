# Working with coding agents

This repository is set up so coding agents prove their work before they call it done. This page explains the parts, what each one guarantees, and where it stops.

## Layers

1. **Git hooks** run for everyone, people and agents alike, on every commit and push.
2. **`npm run verify`** runs every CI check locally and records a pass.
3. **`AGENTS.md`** tells agents what done means. Claude Code reads it through `CLAUDE.md`; Codex and Cursor read it directly.

## Rules and what holds them

| Rule                                          | Held by                                                              | Certainty                                |
| --------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------- |
| No commits on `main`                          | `pre-commit` and `commit-msg` → `.agents/scripts/branch-guard.sh`    | Enforced locally; `--no-verify` skips it |
| No pushes to `main`                           | `pre-push` → `branch-guard.sh`; the "Protect default branch" ruleset | Enforced on GitHub                       |
| Committed files are linted and formatted      | `pre-commit` (lefthook, staged files only); CI                       | Enforced in CI                           |
| Type check passes before a commit             | `pre-commit`; CI                                                     | Enforced in CI                           |
| Tests pass before a push                      | `pre-push`; CI                                                       | Enforced in CI                           |
| Agent tooling never ships in the npm package  | `.agents/scripts/package-contents.test.ts`                           | Enforced in CI                           |
| `npm run verify` runs what CI runs            | `.agents/scripts/lib/steps.test.ts` compares it with the workflows   | Enforced in CI                           |
| Run `npm run verify` before calling work done | `AGENTS.md`                                                          | Asked                                    |
| Never weaken a check to pass it               | `AGENTS.md`                                                          | Asked                                    |

"Enforced in CI" means a pull request cannot merge without it. A local hook alone is a speed bump: `git commit --no-verify` skips it.

## Git hooks

[Lefthook](https://github.com/evilmartians/lefthook) runs the hooks, configured in `lefthook.yml`. `npm install` installs them into `.git/hooks`: the `prepare` script runs `lefthook install --reset-hooks-path`, then the build. Outside a git checkout, as when npm installs this package from GitHub, it only builds.

- **`pre-commit`** refuses a commit on `main`, then lints and formats the staged files (re-staging what the tools fix) and runs the type check. Like CI, it lints the SDK but not the docs site in `website/`. Unstaged changes in a partly staged file are left alone.
- **`commit-msg`** refuses a commit on `main` again. Lefthook runs no pre-commit job when nothing is staged, so without it an empty commit would get past.
- **`pre-push`** refuses a push to `main`, then runs the tests. It checks `git push --dry-run` too. Pushes to `next`, the prerelease branch, are allowed.
- If node is not on `PATH` (some GUI git clients), both hooks still apply the branch rule, skip the checks, and say so. CI runs the same checks.
- The default branch is read from `origin/HEAD`, falling back to `main`.
- Worktrees share the hooks in `.git/hooks`, so the branch rule works in a new worktree at once. Lint, format, types and tests need `npm ci` in that worktree first.
- Without the lefthook binary (no `node_modules` in any checkout), the hooks print "Can't find lefthook in PATH" and let the commit through.

The release workflow commits and pushes to `main` and `next` from GitHub Actions, and `npm ci` runs `prepare` there, which installs the hooks. The release step sets `LEFTHOOK=0`, so they do not run, and the guard also skips itself when `GITHUB_ACTIONS=true`. Branch protection on GitHub is the real enforcement; the hooks only catch mistakes early.

## `npm run verify`

One command, every check a pull request's CI runs: lint, format, both type checks, all tests and the build (which `npm ci` runs in CI, through `prepare`). It takes about ten seconds, so it always checks the whole tree. Picking only the affected tests would save a few seconds and add a way to miss something.

- **Before the checks** it stops if Node is older than `package.json` requires, or if `node_modules` does not match the lockfile. Both make checks fail for reasons unrelated to your change.
- **Steps** run the `package.json` scripts CI runs (`lint`, `format:check`, `type-check:src`, `type-check:tools`, `build`, `test`) side by side, except the tests: they start once the build has passed, since in CI `npm ci` builds first and a test packs `dist/`.
- **Only docs changed** since the branch left `main`: it checks just their formatting, which CI checks too, and records nothing.
- **Only CI files changed** (Renovate, `.github/` config other than workflows): it says no local check reads them, and checks their formatting. Every workflow counts as code, since a local test reads them all.
- **Output:** one line per step. A failing step prints the last 30 lines of its log and the log's path under `.tmp/agents/logs/`.
- **The record:** after a full pass it writes a content hash of every file local checks read (not docs, not CI-only files) to `.tmp/agents/verified.json`. A run that fails, or sees files change while it runs, deletes it.
- **What it cannot see:** the real Comms API, Node versions other than yours, the packed package as consumers resolve it (`npm run attw`, which only the release runs) and the docs site build. It prints these after every pass.

The docs site build (`.github/workflows/validate-docs.yml`) is the one pull-request check verify leaves out: it needs its own `npm ci` in `website/` and takes over a minute from cold, several times the rest put together. Run `npm ci && npm run build` in `website/` when a change touches the docs site or the public API's doc comments.

If `ci.yml` gains a step, or another workflow starts running commands on pull requests, `.agents/scripts/lib/steps.test.ts` fails until verify accounts for it.

## Where the tooling lives

- `.agents/scripts/` holds scripts and their tests. Nothing under `.agents/` ships: `package.json#files` lists only `dist/`, and a test checks the packed package.
- The tooling runs straight from TypeScript with Node's type stripping, so it only uses erasable syntax (`.agents/scripts/tsconfig.json` enforces this). The one exception is `.agents/scripts/verify.mjs`, plain JavaScript that checks the Node version before loading the rest, so an old Node gets a message instead of a syntax error. `npm run type-check` covers it, and `npm run check` lints it.
- Tests run in `npm test` and CI. They copy the tools into throwaway git repositories and never touch your checkout. A test helper clears the variables git exports to hooks, since `npm test` itself runs inside `pre-push`.

## Releases

semantic-release publishes from `main` on every merge, and prereleases from `next`. The squash-merged PR title decides whether anything ships: `feat:`, `fix:`, `perf:` and any breaking change (`!`) release; `chore:`, `ci:`, `docs:`, `test:` and `refactor:` do not. Changes to the agent tooling use `chore:` or `ci:`, so they never publish a new version. No path filter is needed.

## What fails open

- No node on `PATH` in a GUI client: the hooks skip lint, the type check and the tests, with a message. The branch rule still applies.
- `git commit --no-verify`: every local hook is skipped. CI and branch protection still apply.
- A push that changes no files, such as an empty commit or a branch deletion: lefthook runs no pre-push job for it, so the branch rule is skipped too. The ruleset still refuses it on GitHub.
