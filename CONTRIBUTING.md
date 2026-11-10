# Contributing to Comms SDK

The following is a set of guidelines for contributing to the Comms SDK. Please read these guidelines before creating an issue or pull request.

## Open Development

All work on Comms SDK happens directly on [GitHub](https://github.com/todoist/comms-sdk-typescript). Both core team members and external contributors send pull requests that go through the same review process.

## Semantic Versioning

Comms SDK follows [semantic versioning](https://semver.org/). We release patch versions for bugfixes, minor versions for new features or non-essential changes, and major versions for any breaking changes.

Historical changes are in [CHANGELOG.md](CHANGELOG.md); future release notes accompany each GitHub release.

## Branch Organization

Submit all changes to the [main](https://github.com/todoist/comms-sdk-typescript/tree/main) branch (via PR) by default. For pre-release work, target the `next` branch instead — see [Release Process](#release-process-core-team-only) for details.

We do our best to keep `main` in good shape, with all tests passing.

## Development Workflow

After cloning the repository and installing dependencies with `npm install`, several commands are at your disposal:

- `npm run build`: Builds the package for publishing to npm
- `npm run check`: Validates code quality and formatting
- `npm run check:fix`: Auto-fixes lint and formatting issues
- `npm test`: Runs all tests
- `npm run test:watch`: Runs tests in watch mode
- `npm run integrity-checks`: Runs the full CI validation pipeline
- `npm run verify`: Runs every check CI runs on a pull request, and lists what it cannot check

`npm install` also installs the git hooks, run by [lefthook](https://github.com/evilmartians/lefthook) and configured in `lefthook.yml`. `pre-commit` refuses a commit on `main`, then lints and formats the staged files (re-staging what the tools fix) and runs the type check; `pre-push` refuses a push to `main`, then runs the tests. Without node on `PATH`, as in some GUI git clients, they keep the branch rule, skip the checks and say so. CI runs the same checks either way. [docs/agents.md](docs/agents.md) explains the hooks and the agent tooling.

## Sending a Pull Request

Before submitting a pull request, please take the following into consideration:

- Create your branch from `main` (or from `next` if working on a pre-release feature)
- Follow the [Commit Message Guidelines](#commit-message-guidelines) below
- Add tests for code that should be tested
- Run `npm run verify`: it runs every check CI runs, including the test suite
- Do not override built-in validation and formatting checks

## Commit Message Guidelines

### Commit Message Format

This repository expects all commit messages to follow the [Conventional Commits Specification](https://www.conventionalcommits.org/) to automate semantic versioning and changelog generation.

Each commit message consists of a **header**, an **optional body**, and an **optional footer**:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Commit types such as `feat:` and `fix:` affect versioning and changelog generation. Other types like `build:`, `chore:`, `ci:`, `docs:`, `perf:`, `refactor:`, `style:` and `test:` are valid but will not trigger a release.

A commit that has the text `BREAKING CHANGE:` at the beginning of its optional body or footer, or appends a `!` after the type/scope, introduces a breaking API change (correlating with `MAJOR` in semantic versioning).

### Semantic Pull Request Validation

PR titles are validated against the Conventional Commits format by CI. When squash-merging, the PR title becomes the commit message, so ensure it follows the format (e.g., `feat: add new endpoint`, `fix: correct pagination`).

## Release Process (core team only)

A push to `main` builds and retains a release artifact using semantic-release version analysis. Publication uses the same tarball for npmjs and GitHub Packages through a separate protected workflow. Automatic publication is enabled only after the first real new-scope release and registry setup. Follow [the release runbook](docs/releasing.md) for bootstrap, normal releases and retries.

### Pre-releases

To test features before publishing a stable release:

1. **Sync `next` with `main`** before starting new work, and after each stable release (required for semantic-release to correctly initiate the next pre-release versioning cycle):

    ```sh
    git checkout next
    git merge main -m "chore: sync next with main [skip ci]"
    git push origin next
    ```

2. **Develop on a feature branch** based off `next` and open a PR targeting `next`.

3. **Pre-release artifact:** Each PR merge into `next` triggers CI and prepares a pre-release artifact (e.g., `4.1.0-next.1`). Once automatic publication is enabled, the publisher uses the `next` dist-tag in both registries. Bootstrap stable 4.0.1 first.

4. **Promote to stable:** When ready, open a PR to merge `next` into `main`. Use a regular merge commit (not squash), as this preserves the individual commit history and allows semantic-release to correctly generate a comprehensive changelog and determine the version bump automatically.

> **Note:** Release notes are recorded on GitHub after both registries contain the same bytes. Existing changelog entries and release tags are preserved.

### Installing a pre-release

```sh
npm install @todoist/comms-sdk@next
```

## License

By contributing to Comms SDK, you agree that your contributions will be licensed under its [MIT license](LICENSE).
