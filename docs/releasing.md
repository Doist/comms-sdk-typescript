# Releasing the scoped SDK

The first current-line package is `@todoist/comms-sdk@4.0.1`. Its runtime dependency
`@todoist/sdk-kmp@0.6.2` must be published and installable first. Until then the
migration draft is **WAITING_FOR_PUBLICATION**: the old lockfile is deliberately
unchanged, and an old-scope overlay is only provisional evidence. Do not merge it.

## Complete the real dependency verification

After both upstream registry copies exist, use Node 24 and npm 11:

```sh
npm view @todoist/sdk-kmp@0.6.2 version dist --registry=https://registry.npmjs.org/ --json
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
npm ci --ignore-scripts --no-audit --no-fund
npm run verify
npm run attw
(cd website && npm ci --ignore-scripts --no-audit --no-fund && npm run postinstall && npm run build)
```

Review and commit the actual lockfile; do not invent URLs, integrity, or aliases.
The website is private and is never published as a package. Public-only installs use
npmjs via `.npmrc`. Mixed public/private consumers route the whole `@todoist` scope
to GitHub Packages, with explicit read access; npm has no registry fallback.

## Build first, publish later

`release.yml` runs on main/next pushes and manual dispatch on those branches. It runs
verification, then semantic-release **in dry-run mode**, packs once, and retains the
artifact for 90 days (subject to the organization's shorter retention limit). It
never publishes, creates tags/releases, or announces. Its contents-write permission
is needed only for semantic-release's push-authorization check; its dry run never
pushes. The selected checkout is exactly the triggering run's SHA, not a custom ref.

The existing scope-independent `v<version>` tags are retained. The first build
requires the existing `v4.0.0` baseline and explicitly selects the approved patch
`4.0.1`; a newly analyzed feature/breaking change stops for target reconciliation.
Subsequent conventional commits determine the normal next version. The `next`
branch resumes only after stable 4.0.1. No old tags are rewritten. Release records
include semantic-release channel notes, so the next prerelease increments normally.
Future release notes are kept on GitHub releases; the historical CHANGELOG remains
untouched. Source manifests declare the migration version; each packed manifest gets
the version calculated from the actual tags and commits.

`publish-release.yml` is separate. Manual runs must use main. Automatic publication
is **off by default** and requires the repository variable
`COMMS_SDK_AUTOMATIC_RELEASES=true`, configured only after bootstrap, mirror ACLs,
protected environment and npm trust are ready. Its `workflow_run` entry accepts only
successful push builds. Build-only manual runs never auto-publish. A normal merge
also triggers the existing Pages deployment independently; account for this before
merging. Neither workflow is to be dispatched during migration preparation.

The publisher validates the source run's repository and head repository, workflow
ID/path, event, successful conclusion, main/next branch, checkout SHA, and ancestry
in that release branch. It downloads the exact run/attempt artifact, checks packed
name/version/dependencies and its SHA-256/SHA-512, and checks **both registries'**
same-version copies before each publication. Conflicting bytes, auth failures or
ambiguous network responses stop before any write. Matching copies are skipped.
The interactive helper also downloads the authenticated run artifact and compares both the tarball and full metadata byte for byte; edited local checksums cannot authorize a replacement. No retry rebuilds or recalculates a version.

A second push can arrive while the first retained artifact awaits publication. The builder refuses to produce another plan while an earlier retained plan has no release tag. Finish the earlier artifact and release record, then dispatch `release.yml` on the current release branch to analyze the later commits against the new baseline. Do not rebuild the partially published version. The proposed version must also be untagged: a prerelease tag with a channel note still pending cannot produce a second artifact. Build and publish queues stay separate so GitHub's single pending-run limit cannot replace a pending publisher with a new build.

## Administrator setup

Before publication, maintainers must inspect and configure these exact resources:

- [Repository Actions](https://github.com/todoist/comms-sdk-typescript/settings/actions):
  allow the actions used in the two workflows, including
  `todoist/comms-actions/post-comment-action@aeeefe3270ad30d0c4cdd7dbf94b2fac1dcb8ceb`.
  This is the unchanged bootstrap runtime. The later action SDK-consumer changes
  must wait for this SDK; they are not a publisher prerequisite.
- [Environments](https://github.com/todoist/comms-sdk-typescript/settings/environments):
  create/protect `npm-release`, require maintainer approval and main-only publisher
  execution. Build jobs have no environment; the publisher runs on GitHub-hosted
  `ubuntu-latest`, Node 24 and npm >=11.5.1, with `id-token: write`.
- [npm settings](https://www.npmjs.com/package/@todoist/comms-sdk/access): after the
  real identity exists and near the next real release, configure GitHub owner
  `todoist`, repository `comms-sdk-typescript`, workflow `publish-release.yml`,
  environment `npm-release`, and enable direct npm publish. There is no reusable
  caller. Manual bootstrap does not verify OIDC. New trust expires after two days
  without a successful publish. No dist-tag write permission is needed by the
  normal publisher; recovery cleanup is an explicit operator action.
- [GitHub package](https://github.com/orgs/todoist/packages/npm/package/comms-sdk):
  inspect inherited visibility and Manage Actions access. An old-package lookup
  returned 404 during preparation; this is not evidence that its visibility is
  public or that it never existed. Confirm intended mirror visibility with the
  package administrator before the first GitHub publication. Publishing omits
  `--access` on GitHub and never changes package visibility. Link the SDK repository
  and grant its Actions token write access. Grant read only to actual GitHub-routed
  consumers, including the shared Actions repositories if they choose that routing.
  New GitHub packages can start private; verify the approved visibility separately.
- Preserve `DOIST_RELEASE_BOT_ID` and `DOIST_RELEASE_BOT_PRIVATE_KEY`. Their App needs
  contents-write access to the renamed repository for new tags, semantic-release
  notes and release records. Existing Comms secrets and service IDs stay unchanged.

The packed manifest has no `publishConfig`, lifecycle scripts, or dev dependencies.
Each destination uses a temporary, isolated npm config with an explicit registry
and scope mapping. Public npm receives `--access=public`. Both paths explicitly
use `--provenance=false`: a retained artifact was built in another run, so automatic
publisher-run provenance would attest the wrong build. See
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and
[GitHub package access](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility).

## First real artifact — future maintainer commands

Only after merge prerequisites and rename, in a reviewed checkout:

```sh
# Build/pack only. Do not dispatch again to recover a partially published version.
gh workflow run release.yml --repo todoist/comms-sdk-typescript --ref main
gh run list --repo todoist/comms-sdk-typescript --workflow release.yml --limit 10 \
  --json databaseId,headSha,headBranch,event,conclusion
```

Set `ARTIFACT_RUN_ID` to the successful reviewed run, `RELEASE_SHA` to its full
head SHA, `RUN_ATTEMPT` to its run attempt, and `RELEASE_DIR` to a new absolute
local directory. These are real operator-selected values, never placeholder
artifacts. Keep the tarball and `release.json` together for all retries.

```sh
export ARTIFACT_RUN_ID RELEASE_SHA
gh run download "$ARTIFACT_RUN_ID" --repo todoist/comms-sdk-typescript \
  --name "release-$ARTIFACT_RUN_ID-$RUN_ATTEMPT" --dir "$RELEASE_DIR"
```

Use an authenticated `gh` session with Actions/contents read access. Separately
supply `GH_PACKAGES_TOKEN` from the approved credential store: a GitHub token with
`read:packages`, repository access and any required organization SSO authorization.
This token is required even for npm-only bootstrap because the GitHub copy must
be checked before writing npm. Do not paste credentials into commands/history.
The helper passes that token only to the GitHub registry subprocess; it removes
GitHub tokens and inherited npm tokens/config from npm login and publish.

```sh
node scripts/release.mjs verify "$RELEASE_DIR"
node scripts/release.mjs bootstrap-npm "$RELEASE_DIR"
```

The second command logs the authorized npm maintainer in using a temporary config,
then publishes the **real retained tarball** with scripts disabled and public
access. Both login and publish inherit the terminal for browser auth/fresh 2FA.
The temporary login is removed afterward; global npm configuration is untouched.
The package must exist before configuring npm trust. No dummy/staged publication.

After npm succeeds, the same artifact can supply the GitHub mirror and record the
release without needing npm trust yet:

```sh
gh workflow run publish-release.yml --repo todoist/comms-sdk-typescript --ref main \
  -f artifact_run_id="$ARTIFACT_RUN_ID" -f source_sha="$RELEASE_SHA" \
  -f destination=github -f tag=normal
```

The job's GitHub token supplies package read/write; it rechecks npm anonymously.
Only after both copies and their normal channels match does it create the normal
`v<version>` tag, channel note and attributed GitHub release, then announce a newly
created stable release through the bootstrap action. Repeated release-record runs
skip an existing matching tag/release and do not announce again. No source commit
or branch push is necessary to establish the new-scope baseline.

## Partial publication and recovery

Retry the same run ID, source SHA and bytes, selecting `github`, `npmjs` or `both`.
For first npm publication use the interactive helper again; subsequent trusted
npm copies can use the publisher. All choices preflight both copies. If either
normal channel has advanced, choose `tag=migration-recovery` (or
`RELEASE_TAG=migration-recovery` for the interactive helper). Recovery never moves
latest/next and never creates/promotes a GitHub release or sends an announcement.

The package maintainer verifies both integrity values and removes the temporary
recovery tag from each affected registry using that registry's isolated credentials:

```sh
npm dist-tag rm @todoist/comms-sdk migration-recovery --registry=https://registry.npmjs.org/
npm dist-tag rm @todoist/comms-sdk migration-recovery --registry=https://npm.pkg.github.com/
```

Run those only in dedicated configs with `@todoist:registry` set to the matching
registry; a CLI registry flag alone is insufficient. GitHub auth requires package
write permission. A maintainer performs cleanup interactively; OIDC tag-management
commands additionally need npm >=11.21 on v11 or >=12.2 on v12 and separate trust
permission. If an existing identical copy has an unexpected normal dist-tag,
publication skips it and release recording stops: inspect and approve a separate
promotion rather than silently changing tags. If artifacts expire, stop and
recover the original bytes; do not regenerate an already-published version.
