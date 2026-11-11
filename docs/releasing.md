# Releasing the scoped SDK

The first current-line package is `@todoist/comms-sdk@5.0.0`. It keeps depending on
the shared Kotlin library as `@doist/sdk-kmp` (pinned to `0.6.0`), which is published
on npmjs. `@todoist/sdk-kmp` is not published yet; moving to it is a later follow-up
with its own release. `scripts/release.mjs` refuses to pack or publish a manifest that
names `@todoist/sdk-kmp` or does not pin `@doist/sdk-kmp` to an exact version.

## Dependency resolution

The repository's `.npmrc` routes the `@todoist` scope to npmjs, and `@doist/sdk-kmp`
resolves from the default npmjs registry. The website is private and is never
published as a package. Public-only installs use npmjs. Mixed public/private
consumers that route the whole `@todoist` scope to GitHub Packages need explicit read
access to the mirror (npm has no registry fallback), and must still resolve
`@doist/sdk-kmp` wherever they route the `@doist` scope.

## Build first, publish later

`release.yml` runs on main/next pushes and manual dispatch on those branches. It runs
verification, then semantic-release **in dry-run mode**, packs once, and retains the
artifact for 90 days (subject to the organization's shorter retention limit). It
never publishes, creates tags/releases, or announces. Its contents-write permission
is needed only for semantic-release's push-authorization check; its dry run never
pushes. The selected checkout is exactly the triggering run's SHA, not a custom ref.

The existing scope-independent `v<version>` tags are retained. The first build
requires the existing `v4.0.1` baseline (the last `@doist/comms-sdk` release) and
must analyse to a major: renaming the package breaks every consumer, so the scope
change is merged with a breaking-change title (`feat!:`) and ships as `5.0.0`. Any
other result on that baseline (a patch, a minor or no release) stops the build.
Subsequent conventional commits determine the normal next version. The `next`
branch resumes only after stable 5.0.0. No old tags are rewritten. Release records
include semantic-release channel notes, so the next prerelease increments normally.
Stable releases also retain the existing source changelog/version record policy:
only after completed dual publication, the recorder prepends the original notes to
`CHANGELOG.md` and commits the versions in `package.json` and `package-lock.json`.
Prior changelog bytes and current-main dependencies are preserved. `next` excludes
this source commitback. Source manifests declare the latest recorded stable version; each packed manifest gets
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
The interactive helper selects the explicit original successful run/attempt, finds its unique artifact ID, verifies the downloaded ZIP against GitHub's authenticated SHA-256 archive digest, and compares both the tarball and full metadata byte for byte; edited local checksums cannot authorize a replacement. No retry rebuilds or recalculates a version.

A second push can arrive while the first retained artifact awaits publication. The builder refuses to produce another plan while an earlier retained plan lacks a verified, published release record with both original assets. A bare tag or interrupted draft is not completed history. Before skipping ancestor runs, it verifies the baseline record, exact tag commit, stable/prerelease state, published timestamp, original tarball and `release.json`, hashes, and authenticated source run/attempt. The only asset-free exception is `v4.0.1`, the last `@doist/comms-sdk` release, at `b6c13f63d9e4914ed83c550081a9a503596f4d56`; that record must still be published and stable. Completed records retain their assets beyond Actions artifact expiry. A new stable baseline additionally requires its verified source changelog/version commit; unfinished commitback blocks the next artifact build. Finish the earlier artifact and release record, then dispatch `release.yml` on the current release branch to analyze the later commits against the new baseline. Do not rebuild the partially published version. The proposed version must also be untagged: a prerelease tag with a channel note still pending cannot produce a second artifact. Build and publish queues stay separate so GitHub's single pending-run limit cannot replace a pending publisher with a new build.

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
  notes, release records and the existing stable-only main commitback. Preserve the
  release App's approved main-branch access; if a branch rule rejects the normal
  push, stop and retry the original publisher after maintainers resolve access.
  This preparation changes no branch rule or App permission. Existing Comms secrets and service IDs stay unchanged.

The packed manifest has no `publishConfig`, lifecycle scripts, or dev dependencies.
Each destination uses a temporary, isolated npm config with an explicit registry
and scope mapping. Public npm receives `--access=public`. Both paths explicitly
use `--provenance=false`: a retained artifact was built in another run, so automatic
publisher-run provenance would attest the wrong build. See
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and
[GitHub package access](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility).

## First real artifact — maintainer commands

Merging the scope change to main runs `release.yml` on that push, which builds and
retains the `5.0.0` artifact. Use that run. Dispatch `release.yml` only if the push
run produced no artifact; while a retained artifact is unrecorded, a second build
stops (see above), and a dispatch never recovers a partially published version.

```sh
gh run list --repo todoist/comms-sdk-typescript --workflow release.yml --limit 10 \
  --json databaseId,headSha,headBranch,event,conclusion,attempt
```

Set `ARTIFACT_RUN_ID` to the successful reviewed run, `RELEASE_SHA` to its full
head SHA, `ARTIFACT_RUN_ATTEMPT` to its run attempt, and `RELEASE_DIR` to a new absolute
local directory. These are real operator-selected values, never placeholder
artifacts. Do not replace the original attempt with a later rerun. Keep the tarball
and `release.json` together for all retries; unsupported/missing archive digests
stop for original-byte recovery rather than accepting local metadata. The digest
comes from the authenticated [artifact API](https://docs.github.com/en/rest/actions/artifacts#get-an-artifact).

```sh
export ARTIFACT_RUN_ID ARTIFACT_RUN_ATTEMPT RELEASE_SHA
gh run download "$ARTIFACT_RUN_ID" --repo todoist/comms-sdk-typescript \
  --name "release-$ARTIFACT_RUN_ID-$ARTIFACT_RUN_ATTEMPT" --dir "$RELEASE_DIR"
```

Use an authenticated `gh` session with Actions/contents read access. Separately
supply `GH_PACKAGES_TOKEN` from the approved credential store: a GitHub token with
`read:packages`, repository access and any required organization SSO authorization.
This token is required even for npm-only bootstrap because the GitHub copy must
be checked before writing npm. A GitHub version 404 is accepted only if the same
credential can read the package metadata. If the entire package is unreadable,
the helper requires that same credential to prove active `todoist` owner
membership (`role=admin`) and package-read scope. Use an authorized owner classic
PAT with `read:org` and `read:packages` for initial absence proof, plus
`write:packages` for the first GitHub mirror write. Required organization SSO
authorization still applies. Token presence, registry `whoami`, a bare 404 and
an empty organization package list are never absence proof. See the
[authenticated membership API](https://docs.github.com/en/rest/orgs/members#get-an-organization-membership-for-the-authenticated-user)
and [GitHub package permissions](https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages). Auth/network
ambiguity stops; there is no local confirmation-file bypass. Do not paste credentials into commands/history.
The helper passes that token only to GitHub registry and owner-proof requests; it removes
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

After npm succeeds, create the first GitHub mirror locally with the same verified
artifact and an authorized owner classic PAT including `write:packages` and
`read:org` in `GH_PACKAGES_TOKEN`:

```sh
node scripts/release.mjs publish "$RELEASE_DIR" github
```

This command repeats both-registry preflight and owner/read proof before writing.
An ordinary Actions token cannot establish package-level absence. Confirm the
GitHub package visibility, repository linkage and Actions read/write grant after
creation. Once both real copies are readable, the following workflow skips both
matching copies and records the release without needing npm trust yet:

```sh
gh workflow run publish-release.yml --repo todoist/comms-sdk-typescript --ref main \
  -f artifact_run_id="$ARTIFACT_RUN_ID" -f artifact_run_attempt="$ARTIFACT_RUN_ATTEMPT" \
  -f source_sha="$RELEASE_SHA" \
  -f destination=github -f tag=normal
```

The job's GitHub token supplies package read/write for the linked readable mirror;
it rechecks npm anonymously. If that mirror is ACL-hidden, the run stops rather
than interpreting an empty inventory as absence.
Only after both copies and their normal channels match does it create the normal
`v<version>` tag and attributed draft release, upload the exact retained tarball and
`release.json`, publish that same release ID, then complete the stable source record
and write the semantic-release channel note. Every retry verifies the exact tag commit, target SHA, notes, draft/published
state, stable/prerelease flag, publication timestamp and both original asset bytes.
Only a newly completed stable record is announced through the bootstrap action.
An already complete published record is skipped without another announcement; a
lost publish response or a later source-record/channel-note failure may therefore
omit an announcement rather than duplicate it. A stable release is fully recorded
only after the source commitback and channel note complete.

## Stable source changelog and version record

The original stable-only changelog/git behavior is performed in
`scripts/source-release-record.mjs` after both registries and the published GitHub
record verify. The build remains analysis/pack-only. The recorder uses a temporary
Git checkout of current main and changes only `CHANGELOG.md`, `package.json`, and
`package-lock.json`. It prepends the exact retained release notes and updates only
root versions in an already synchronized real lock; it never regenerates a lock,
installs dependencies, rebuilds or repacks the immutable artifact.

The source record uses the existing `chore(release): VERSION [skip ci]` message,
with original run/attempt/source/hash identity trailers for recovery. Full notes
remain in the changelog and GitHub release; they are excluded from the commit body
so a copied breaking-change note cannot trigger another release after the build tag. Current main must
descend from the original build. User changes on main become the parent of this
commit and remain intact. A normal, non-force push rejects a concurrent main
advance; retrying the same publisher then reads the new tip. An already matching
record is verified by its message, parent, exact three-file change and original
artifact identity, then reused without another commit or changelog entry. A
conflicting record, unsynchronized lock, newer source version, or existing release
entry without a verified marker stops for maintainer inspection.

The **original build SHA remains the artifact source and tag target**. The generated
source record is a separate commit; its SHA is stored as `sourceRecord.recordSha`
in the semantic-release note alongside `sourceSha`, version, run/attempt and hash.
Existing note fields and channels are preserved. `next` adds its semantic channel
but makes no source-file commit. No tag is moved and the generated commit is never
substituted for the artifact's original build identity.

If commitback or channel recording is interrupted, retry the same original
run/attempt publisher command above. A lost successful main-push response is
recovered by finding that record in main's history. Stable baseline validation
refuses a new build until the source record exists and verifies. Do not dispatch a
replacement artifact to repair commitback. No actual main commitback runs during
migration preparation.

## Partial publication and recovery

Retry the same run ID, original attempt, source SHA and bytes, selecting `github`, `npmjs` or `both`.
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

### Interrupted GitHub release recording

A successful `gh release list` lookup is not completion: it also returns drafts.
Retry the **same** `publish-release.yml` command above with the original run ID,
attempt and SHA, `destination=github` (or the missing registry), and `tag=normal`. Matching
registry copies are skipped. A matching draft resumes under its existing release
ID, verifies every uploaded asset before any write, uploads only missing original
assets, then publishes and re-reads the record. A lost tag/create/upload/publish
response is safe to retry. Never delete/recreate a release, clobber an asset, or
move/recreate an existing release's tag.

Inspect the exact record and its assets read-only before recovery:

```sh
# VERSION and RELEASE_ID identify the interrupted original record.
gh api --paginate --slurp repos/todoist/comms-sdk-typescript/releases \
  --jq 'add | map({id,tag_name,target_commitish,draft,prerelease,published_at})'
gh api "repos/todoist/comms-sdk-typescript/git/matching-refs/tags/v$VERSION"
gh api "repos/todoist/comms-sdk-typescript/releases/$RELEASE_ID"
gh api --paginate --slurp "repos/todoist/comms-sdk-typescript/releases/$RELEASE_ID/assets"
```

A different source, notes, prerelease state, duplicate/changed asset, missing tag
on an existing record, or an asset left in `starter` state stops before writes.
Keep the original run/attempt tarball and `release.json`; inspect the named release
and asset IDs without deleting or replacing anything. A published release with a
missing required asset also stops with its original run/attempt: recover those
exact bytes into the same record through a separately reviewed maintainer action.
The retry helper does not silently repair an incomplete published record. If the
retained Actions artifact has expired or the original bytes cannot be recovered,
stop; rebuilding or editing metadata is not an acceptable substitute.
