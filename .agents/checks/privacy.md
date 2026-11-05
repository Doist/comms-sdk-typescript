# Check: privacy and secrets

This repository is public, and the npm package ships `dist/` to every app that installs it.

## Report

- A secret, API key, token or password, even an expired one.
- Real user data in fixtures, tests or docs: real names, emails, workspace or user ids, or message content copied from an account.
- Personal identifiers in docs and examples: real emails, usernames, home-directory paths, local repository names. Use placeholders (`alice@example.com`, `~/code`).
- Internal details: private hostnames, internal URLs, Doist-internal tools or documents.
- A new path in `package.json#files` that should not be published.
- Untracked files the change doesn't need (`.env`, logs, `.tmp/`).

## Fine

- Made-up fixtures (`src/testUtils/test-defaults.ts`, `example.com`, "Test User").
- Public URLs: the production and staging API hosts `README.md` documents, GitHub, the npm registry.
