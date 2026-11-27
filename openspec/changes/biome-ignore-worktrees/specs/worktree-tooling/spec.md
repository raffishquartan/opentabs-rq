## Purpose
Defines how repository lint and format checks behave when git worktrees are kept under `.worktrees/`.

## ADDED Requirements

### Requirement: Worktrees under .worktrees do not break lint
Lint and format checks run from the primary checkout SHALL ignore the contents of `.worktrees/`, and the same checks run inside a worktree located there SHALL still check that worktree's own files.

#### Scenario: Check from the primary checkout
- **WHEN** a worktree exists at `.worktrees/<name>` and `biome lint .` runs in the primary checkout
- **THEN** it exits 0 without reporting a nested root configuration

#### Scenario: Check from inside a worktree
- **WHEN** `biome lint .` runs in `.worktrees/<name>`
- **THEN** it checks that worktree's files and exits 0
