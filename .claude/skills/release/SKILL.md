---
name: release
description: Version and publish glass-midas packages to npm with Changesets. Use when the user asks to release, publish, cut a version, bump versions or ship to npm.
disable-model-invocation: true
---

# Release

Publishing to npm is public and can't be undone (npm only allows unpublishing within 72 hours). Confirm with the user before step 6.

1. **Clean state**: on `main`, up to date with `origin`, nothing uncommitted (`git status`).
2. **Pending changes**: list `.changeset/*.md` (excluding README/config). If there are none, stop and say so.
3. **Gate**: `pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm test && pnpm size`. Any failure stops the release.
4. **Version**: `pnpm changeset version`, then `pnpm format`. Show the user the resulting version bumps and the CHANGELOG entries. Changelogs are in English, and name no other projects (credits live in the README).
5. **Check what ships**: `pnpm build`, then `pnpm pack` each bumped package into the scratchpad and inspect it: `workspace:` ranges resolved to real versions, README and LICENSE present, no stale files in `dist`, and nothing sensitive (keys, tokens, emails, local paths, `.npmrc`, `.env`).
6. **Publish** (after the user confirms): the account uses 2FA in the browser, which can't complete through Claude Code's `!` shell (it isn't interactive, so npm aborts with `EOTP`). Ask the user to run it in their own terminal:

   ```
   cd "C:\Users\ren\Desktop\The Man Who Stole The World"
   pnpm release
   ```

   It skips versions already on npm. Nothing is published until they approve in the browser.

7. **Commit and tag**: commit `chore: release`. Changesets created lightweight tags on the commit _before_ it, so move each one onto the release commit (`git tag -f <name>`) and push them **by name**: `git push --follow-tags` skips lightweight tags.
8. **Registry and CDN check**: a new package first shows a `0.0.0-stage` placeholder and the real version appears a few minutes later, so poll `https://registry.npmjs.org/@glass-midas%2F<name>` until `dist-tags.latest` is the new version. Then confirm each one at `https://cdn.jsdelivr.net/npm/@glass-midas/<name>@<version>/+esm` (jsDelivr can lag npm by a minute or two), the components. `dist/styles.css`, and `npx @glass-midas/cli@<version> list` when the CLI was released.
