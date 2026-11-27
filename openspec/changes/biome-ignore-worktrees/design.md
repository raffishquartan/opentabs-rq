## Context

Biome 2.5.0 treats a `biome.json` as a root configuration unless it sets `"root": false`. A nested worktree checkout carries its own root `biome.json` (and `docs/biome.json`), so scanning into it is an error.

## Decisions

- Exclude the directory with `files.includes` (`!.worktrees`) rather than set `"root": false` in each worktree: the exclusion lives in the one tracked file, applies to every worktree automatically, and needs no per-worktree edit.
- Ignore the directory in `.gitignore` so `git status` stays clean without relying on a per-user global ignore file.
- Pattern is relative to the config file, so a worktree's own `biome.json` does not exclude anything and lint inside the worktree is unaffected.

## Verification performed

With a worktree at `.worktrees/biome-ignore`: lint in the primary checkout fails before the change and passes after it (574 files); `biome lint .` and the format check inside the worktree both pass (574 files).
