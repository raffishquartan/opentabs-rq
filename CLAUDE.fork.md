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
       +-----> f/screenshot-image-content-part-v2
       |
       +-----> f/restore-screenshot-tab-filepath
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
| `f/screenshot-image-content-part-v2` | `browser_screenshot_tab` returns MCP image content parts instead of file paths | 10 |
| `f/restore-screenshot-tab-filepath` | Sibling work in flight: restores the optional `filePath` parameter dropped during the v0.0.106 rebase | in progress |
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

### 5. Rebuild `exec-branch` from scratch

```bash
git checkout exec-branch
git reset --hard main
git merge --no-ff f/gitignore-superpowers
git merge --no-ff f/fork-readme
git merge --no-ff f/screenshot-image-content-part-v2
git merge --no-ff f/restore-screenshot-tab-filepath
git merge --no-ff f/fork-strategy-doc
# add any new f/* branches here in a stable, agreed order
```

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

## Worktree layout

| Path | Branch | Purpose |
|------|--------|---------|
| `/home/chris/repos/opentabs-rq` | `exec-branch` | Primary checkout. Live MCP server reads from here. |
| `/home/chris/repos/opentabs-rq-rebase` | varies | Branch-admin worktree. Used for reset/merge work without disturbing the live checkout. |
| `/home/chris/repos/opentabs-rq-clauderfork` | `f/fork-strategy-doc` | Per-feature worktree (example). |

Per-feature worktrees can be added ad hoc:

```bash
git worktree add /home/chris/repos/opentabs-rq-<short> f/<feature>
```

Remove them when done:

```bash
git worktree remove /home/chris/repos/opentabs-rq-<short>
```

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
