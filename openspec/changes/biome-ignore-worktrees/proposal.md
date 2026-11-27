## Why

A git worktree under `<repo>/.worktrees/<name>` is a full checkout, so it contains its own root `biome.json`. `biome lint .` and `biome check .` run from the primary checkout then scan into it and abort with "Found a nested root configuration, but there's already a root configuration", which also fails the pre-push hook. The repo already excludes `.ralph/worktrees` and `.claude/worktrees` but not `.worktrees`, and the per-user global gitignore that hides `.worktrees/` from git is not read by Biome.

## What Changes

- Add `!.worktrees` to `files.includes` in `biome.json`, beside the existing worktree exclusions.
- Add `/.worktrees/` to the repo `.gitignore`.
- Fork rule (documented in `CLAUDE.fork.md`): this branch is merged into every feature branch and into `exec-branch`, so lint works in the primary checkout and inside any worktree under `.worktrees/`.

## Capabilities

### New Capabilities
- `worktree-tooling`: lint and format checks work from the primary checkout and from inside a worktree located under `.worktrees/`.

### Modified Capabilities

## Impact

- `biome.json`, `.gitignore`. No platform, extension or plugin behaviour change.
- The exclusion path is relative to each `biome.json`, so inside a worktree it matches nothing and the worktree still lints its own files.
