# worktree-tooling Specification

## Purpose
Defines how repository lint and format checks behave when git worktrees are kept under `.worktrees/`.

## Requirements

### Requirement: Worktrees under .worktrees do not break lint
Lint and format checks run from the primary checkout SHALL ignore the contents of `.worktrees/`, and the same checks run inside a worktree located there SHALL still check that worktree's own files.

#### Scenario: Check from the primary checkout
- **WHEN** a worktree exists at `.worktrees/<name>` and `biome lint .` runs in the primary checkout
- **THEN** it exits 0 without reporting a nested root configuration

#### Scenario: Check from inside a worktree
- **WHEN** `biome lint .` runs in `.worktrees/<name>`
- **THEN** it checks that worktree's files and exits 0

### Requirement: Session working files do not break unused-code checks
The unused-code check (`knip`) SHALL ignore everything under `cc-sessions/`.

#### Scenario: Stub files in a session folder
- **WHEN** `cc-sessions/<tag>/` contains TypeScript files that nothing imports and `npm run knip` runs
- **THEN** it exits 0 without reporting them as unused files
