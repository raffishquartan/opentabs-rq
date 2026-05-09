# Fork Branching Strategy

## Why this file exists

This repository (`raffishquartan/opentabs-rq`) is a personal fork of the upstream
`opentabs-dev/opentabs` project. It carries customisations that may never go upstream -
local-machine hacks, personal workflow integrations, and work-in-progress changes that
are being developed before upstream PR submission.

The strategy described here keeps `main` byte-identical to the upstream tagged releases.
That single invariant makes future upstream pulls trivial: reset `main` to the new tag,
rebase each feature branch, rebuild `exec-branch`. No merge archaeology, no cherry-picks
across diverged histories.

---

## Branch architecture

```
upstream/main (tagged releases: v0.0.106, ...)
       |
       v
    main  <-- always identical to upstream/main at a tagged release
    (currently v0.0.106)
       |
       +-----> f/gitignore-superpowers
       |
       +-----> f/fork-readme
       |
       +-----> f/screenshot-image-content-part-v2 ─┐
       |                                            │
       +-----> f/restore-screenshot-tab-filepath ───┤
       |                                            │
       |                                            └──> f/screenshot-tab-integrated
       |                                                  (local-only meta-branch — combines
       |                                                   the two above + integration commit)
       |
       +-----> f/fork-strategy-doc
       |
       v
  exec-branch  <-- main + git merge --no-ff of all f/* branches
  (what the live MCP server runs from)
```

### `main`

Always identical to `upstream/main` at a tagged release. Currently at `v0.0.106`.
Never carries fork-specific commits. `origin/main` is force-pushed to match each new
upstream tag. This is the rebase base for every feature branch.

### `f/<feature>` branches

Each fork-specific change lives on its own branch off `main`. One logical change per
branch. These are independently submittable upstream as PRs. When a feature is accepted
upstream and merged, remove it from the `exec-branch` rebuild sequence and delete the
local and remote branch.

### `exec-branch`

Built from `main` plus a `git merge --no-ff` of every `f/<feature>` branch in
deterministic order. This is what the live MCP server reads from. It is never submitted
upstream. Always rebuilt from scratch after `main` advances - never carry forward
previous exec-branch state.

---

## Current `f/` branches (snapshot as of 2026-05-09)

| Branch | Description | Commits |
|--------|-------------|---------|
| `f/gitignore-superpowers` | Adds `docs/superpowers/` to `.gitignore` | 1 |
| `f/fork-readme` | Adds `README-HOWTO-UPDATEFORK-TO-MYSTREAM.md` | 1 |
| `f/screenshot-image-content-part-v2` | `browser_screenshot_tab` returns MCP image content parts | 10 |
| `f/restore-screenshot-tab-filepath` | Restores the optional `filePath` parameter — vacuously v0.0.106 + 1 new test commit (the parameter was never actually removed in v0.0.106; it was only dropped on the image-content-part branch during the original rebase resolution) | 1 |
| `f/screenshot-tab-integrated` | **Local-only meta-branch.** Merges the two screenshot branches above and adds a hand-integration commit so they coexist in `exec-branch` (filePath provided → write to disk + return `{savedTo, bytes}`; filePath omitted → return image content part). Not for upstream PR — the two underlying branches are. | 12 commits + 1 merge + 1 integration |
| `f/fork-strategy-doc` | This file | 1 |

---

## Upstream sync procedure

When a new upstream release lands, follow these steps in order.

### 1. Fetch upstream

```bash
git fetch upstream --tags
```

### 2. Reset `main` to the new tag

```bash
git checkout main
git reset --hard upstream/<new-tag>
# e.g. git reset --hard upstream/v0.0.107
```

### 3. Push `main` to origin

```bash
git push origin main --force-with-lease
```

`origin/main` always equals the upstream tag commit. The force-push is intentional and
correct here.

### 4. Rebase each `f/` branch onto the new `main`

For each feature branch in turn:

```bash
git checkout f/<feature>
git rebase main
# resolve any conflicts
git push origin f/<feature> --force-with-lease
```

Work through them in dependency order if any branch builds on another (currently none do).

### 4a. Recreate `f/screenshot-tab-integrated`

`f/screenshot-tab-integrated` is a merge of `f/screenshot-image-content-part-v2` and
`f/restore-screenshot-tab-filepath` plus a hand-integration commit. After the two
underlying branches have been rebased onto the new `main`, recreate it from scratch
rather than trying to rebase the merge:

```bash
git checkout f/screenshot-image-content-part-v2
git checkout -B f/screenshot-tab-integrated
git merge --no-ff f/restore-screenshot-tab-filepath
# Re-apply the integration commit. If the underlying screenshot-tab.ts shape is
# unchanged upstream, cherry-pick the previous integration commit by hash:
git cherry-pick <previous-integration-commit-hash>
# Otherwise hand-port the integration: combine filePath + image-content-part dispatch
# (see the integration commit message for the design). Verify with the screenshot-tab
# test file (12 tests covering both branches + the round-trip).
git push origin f/screenshot-tab-integrated --force-with-lease
```

### 5. Rebuild `exec-branch` from scratch

```bash
git checkout exec-branch
git reset --hard main
git merge --no-ff f/gitignore-superpowers
git merge --no-ff f/fork-readme
git merge --no-ff f/screenshot-tab-integrated   # transitively contains both screenshot f/ branches + integration
git merge --no-ff f/fork-strategy-doc
# add any new f/* branches here in a stable, agreed order
```

Do NOT also merge `f/screenshot-image-content-part-v2` and `f/restore-screenshot-tab-filepath`
directly into `exec-branch` — they are already pulled in transitively by
`f/screenshot-tab-integrated`. Merging them directly would trigger the silent semantic
regression in `screenshot-tab.ts` that the integration branch exists to prevent.

### 6. Push `exec-branch`

```bash
# The pre-push hook runs the full build and test suite.
# platform/create-plugin/src/index.test.ts OOMs on this WSL machine.
# Upstream commit 82b378bd added test.skipIf(process.env.CI === 'true') for this.
CI=true git push origin exec-branch --force-with-lease
```

The `CI=true` prefix skips the heavy scaffold install+build test that causes OOM on WSL.
This is the intended escape hatch - upstream added the guard for exactly this case.

---

## Local execution

The running MCP server is launched from:

```
/home/chris/repos/opentabs-rq/platform/mcp-server/dist/index.js
```

The primary checkout at `/home/chris/repos/opentabs-rq` tracks `exec-branch`. After
rebuilding, restart the server by killing the server PID. The parent CLI launcher
(`opentabs start`) respawns it automatically.

Build after any change:

```bash
cd /home/chris/repos/opentabs-rq
npm run build
```

---

## Worktrees

This fork uses git worktrees so multiple branches can be checked out simultaneously
without disturbing the live MCP server's checkout. Worktrees are a **local-only**
concept — they live under `.git/worktrees/<name>/` in the primary repo's git
directory, and are never pushed to or tracked on `origin`/`upstream`. Each
contributor sets up their own worktree layout.

### Standing worktrees

| Path | Branch | Purpose |
|------|--------|---------|
| `/home/chris/repos/opentabs-rq` | `exec-branch` | **Primary checkout.** The live MCP server reads `dist/index.js` from here, so this directory must always be on the branch you want running. Build artefacts (`dist/`, generated icons, `~/.opentabs/extension`) are produced from this tree. |
| `/home/chris/repos/opentabs-rq-rebase` | `main` (typically) | **Admin worktree.** Used for upstream-sync work — `git fetch upstream && git reset --hard upstream/<tag>`, the `f/*` rebase loop, force-push of `main` — without disturbing the live primary checkout. May be deleted and recreated on demand: nothing depends on its persistence. |

### Practical rule of thumb

- **Keep the primary on `exec-branch` always.** That's what runs.
- **For each new feature, spin up an ad-hoc worktree** off `main`:
  ```bash
  git worktree add /home/chris/repos/opentabs-rq-<short> -b f/<feature> main
  ```
  Remove it when the feature has landed on `exec-branch`:
  ```bash
  git worktree remove /home/chris/repos/opentabs-rq-<short>
  ```
- **The admin worktree is the one exception** — it's permanent because upstream-sync
  work is recurring. Don't repurpose it for feature work.

### Fork docs in the admin worktree

The admin worktree sits on `main`, which by design equals upstream and therefore
**lacks the fork-specific docs** (`CLAUDE.fork.md`, `README-HOWTO-UPDATEFORK-TO-MYSTREAM.md`).
Cherry-picking those onto `main` would break the "main = upstream" invariant. To make
the docs available in the admin worktree without polluting `main`, the admin worktree
carries them as **untracked symlinks** into the primary worktree's tracked copies:

```bash
ln -s ../opentabs-rq/CLAUDE.fork.md \
      /home/chris/repos/opentabs-rq-rebase/CLAUDE.fork.md
ln -s ../opentabs-rq/README-HOWTO-UPDATEFORK-TO-MYSTREAM.md \
      /home/chris/repos/opentabs-rq-rebase/README-HOWTO-UPDATEFORK-TO-MYSTREAM.md

# Hide the symlinks from `git status` in the admin worktree.
# These exclude entries are local-only and never committed.
{
  echo "/CLAUDE.fork.md"
  echo "/README-HOWTO-UPDATEFORK-TO-MYSTREAM.md"
} >> /home/chris/repos/opentabs-rq/.git/info/exclude
```

The `.git/info/exclude` file is shared across all worktrees of the same git
repository, so the entries hide the symlinks in the admin worktree without
affecting the primary worktree (where the same filenames are tracked on
`exec-branch` and exist as real files).

If the admin worktree is ever recreated from scratch, re-run the symlink commands
above. The exclude entries persist across worktree recreation because they live in
the shared `.git/` directory.

---

## Conventions

- Branch prefix: `f/` for all fork-specific branches.
- One logical change per branch. If a task spans multiple concerns, split it.
- Commit messages: imperative mood, explain why not just what.
- Never force-push `main` to anything other than an exact upstream tag commit.
- Never carry fork commits on `main`.
- `exec-branch` is ephemeral - rebuilding from scratch is always correct.
- When a feature branch is accepted upstream, remove it from the exec-branch merge
  sequence and delete the local and remote branch. Keep the branch list lean.
