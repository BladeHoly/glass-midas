---
name: release
description: Review and verify a glass-midas release. Publishing is automated by `.github/workflows/release.yml`; use this when the user asks to release, publish, cut a version, bump versions or ship to npm.
disable-model-invocation: true
---

# Release

Releases are automated by `.github/workflows/release.yml` (Changesets v3):

- Changesets on `main` → the workflow opens or updates the **`chore: release`** PR (versions, changelogs).
- That PR merged → the workflow runs the CI gate, packs, publishes to npm with **trusted publishing** (OIDC, no token, provenance), pushes the tags and writes a GitHub release per package.

**Merging the release PR publishes to npm, which can't be undone. Only the user merges it.** Claude reviews it and reports; it never merges it, even with CI green.

1. **Pending changes**: list `.changeset/*.md` on `main` (excluding config). If there are none and no release PR is open, stop and say so.
2. **Find the release PR**: `gh pr list --head changeset-release/main`. If there isn't one, check the last Release run (`gh run list --workflow release.yml`) and why.
3. **Review it**: the version bumps follow the changesets (patch/minor; no major before 1.0 without asking); the CHANGELOG entries are in English, read well and name no other projects (credits live in the README). Fix wording in the `.changeset/*.md` files on `main` through a normal PR; the workflow rewrites the release PR.
4. **Check what ships**: on the PR's branch, `pnpm install --frozen-lockfile && pnpm build`, then `pnpm changeset pack --out-dir <scratchpad>/pack` and inspect each tarball: `workspace:` ranges resolved to real versions, README and LICENSE present, no stale files in `dist`, nothing sensitive (keys, tokens, emails, local paths, `.npmrc`, `.env`).
5. **Hand it over**: tell the user the PR link, the versions, and that merging it publishes. Wait for them to merge it.
6. **Watch the run**: `gh run watch` on the Release run the merge starts. If `publish` fails on auth, the package's trusted publisher on npmjs.com is missing or wrong (user `BladeHoly`, repo `glass-midas`, workflow `release.yml`, **Allow npm publish** checked); the user fixes it there and re-runs the failed jobs.
7. **Registry and CDN check**: poll `https://registry.npmjs.org/@glass-midas%2F<name>` until `dist-tags.latest` is the new version (a first publish shows a `0.0.0-stage` placeholder for a few minutes), then confirm `https://cdn.jsdelivr.net/npm/@glass-midas/<name>@<version>/+esm` (jsDelivr can lag a minute or two), the components' `dist/styles.css`, and `npx @glass-midas/cli@<version> list` when the CLI was released. Check the GitHub releases exist (`gh release list`).

## By hand, if the workflow can't publish

Only when the user asks. The account uses 2FA in the browser, which Claude Code's `!` shell can't complete (npm aborts with `EOTP`), so the user runs, in their own terminal, after `pnpm version-packages` is merged:

```
cd "C:\Users\ren\Desktop\The Man Who Stole The World"
pnpm release
```

Then push the tags by name (`git push origin <tag>`; `--follow-tags` skips lightweight tags) and create the GitHub releases with `gh release create <tag> --notes <changelog section>`.
