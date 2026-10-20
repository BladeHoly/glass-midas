---
name: release
description: Version and publish glass-midas packages to npm with Changesets. Use when the user asks to release, publish, cut a version, bump versions or ship to npm.
disable-model-invocation: true
---

# Release

Publishing to npm is public and can't be undone (npm only allows unpublishing within 72 hours). Confirm with the user before step 5.

1. **Clean state**: on `main`, up to date with `origin`, nothing uncommitted (`git status`).
2. **Pending changes**: list `.changeset/*.md` (excluding README/config). If there are none, stop and say so.
3. **Gate**: `pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm test && pnpm size`. Any failure stops the release.
4. **Version**: `pnpm changeset version`. Show the user the resulting version bumps and the CHANGELOG entries.
5. **Publish** (after the user confirms): `pnpm release`. If npm asks for an OTP, ask the user to run `! pnpm release` themselves.
6. **Tag and push**: commit `chore: release`, then `git push --follow-tags`.
7. **CDN check**: confirm each published version resolves at `https://cdn.jsdelivr.net/npm/@glass-midas/core@<version>/+esm`.
