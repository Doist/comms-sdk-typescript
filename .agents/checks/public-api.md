# Check: public API

What other packages and apps see: everything exported from `src/index.ts` (`CommsApi` and its options, the clients and their methods, the types and Zod schemas, the helpers in `src/utils/`), its names, signatures, types and behaviour, plus `package.json#exports`, `engines` and the runtime dependencies. Every change here reaches every consumer, and the PR title sets the version: `feat:` a minor, `fix:` or `perf:` a patch, `feat!:` or `fix!:` (or a `BREAKING CHANGE:` footer) a major.

## Report

- A renamed or removed export, method, option or field, a narrowed parameter type, a newly required argument, or a changed default, without a breaking-change PR title.
- A response type or schema made stricter (a field now required, an enum value dropped), so a call that used to succeed now throws or no longer type-checks, without a breaking-change PR title or a reason in the description.
- A behaviour change callers can see (retries, timeouts, error types or messages, what `close()` does, the URLs the helpers in `src/utils/url-helpers.ts` build) without it in the description.
- A raised Node engine, a changed `exports` or `types` entry in `package.json`, or a new runtime dependency, without saying whether it can break an install or an import.
- A new public method or option without a doc comment, which TypeDoc publishes on the docs site, or `README.md` out of step with the change.
- A PR title that releases a change callers can't see, or one that won't release a change they can.

## Fine

- New exports, methods and optional options (additive) in a `feat:` PR.
- Internal modules not reached from `src/index.ts`.
- A parameter type widened to accept more, in a `feat:` or `fix:` PR.
