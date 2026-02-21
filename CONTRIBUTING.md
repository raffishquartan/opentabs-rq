# Contributing to OpenTabs

## Development Setup

**Prerequisites:**

- [Bun](https://bun.sh/) (>= 1.3.9)
- Google Chrome
- Git

**Clone and install:**

```bash
git clone https://github.com/opentabs-dev/opentabs.git
cd opentabs
bun install
bun run build
```

**Load the Chrome extension:**

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" and select `~/.opentabs/extension/`

## Development Workflow

**Full dev mode** (recommended):

```bash
bun run dev
```

This starts `tsc --build --watch`, the MCP server with `bun --hot`, and auto-rebuilds the Chrome extension on source changes. After extension rebuilds, you still need to manually reload the extension from `chrome://extensions/`.

**Manual workflow:**

```bash
bun run build        # Build everything
opentabs start       # Start the MCP server
```

## Making Changes

### MCP Server Changes

In dev mode (`bun run dev`), the MCP server runs with `bun --hot`. After `tsc` recompiles, the server hot-reloads automatically.

Without dev mode: rebuild (`bun run build`) and restart the server.

### Chrome Extension Changes

The extension never auto-reloads. After building:

1. `bun run build`
2. Open `chrome://extensions/`
3. Click the reload icon on the OpenTabs extension card
4. Reopen the side panel if it was open

### Plugin Changes

Plugin builds auto-register and notify the running MCP server:

```bash
cd plugins/<name>
bun install    # first time only
bun run build  # builds, registers, and notifies the server
```

## Verification

All five checks must pass before pushing. Run them all at once:

```bash
bun run check
```

This runs the following in sequence, stopping on the first failure:

| Command              | What it checks                     |
| -------------------- | ---------------------------------- |
| `bun run build`      | Production build (tsc + extension) |
| `bun run type-check` | TypeScript type checking           |
| `bun run lint`       | ESLint                             |
| `bun run knip`       | Unused exports and dependencies    |
| `bun run test`       | Unit tests                         |

For the comprehensive suite including E2E tests: `bun run check:all`

The pre-push hook automatically runs `build`, `type-check`, and `test`. The pre-commit hook runs `lint-staged` (Prettier + ESLint on staged files) and `knip`.

## Code Quality

Key principles:

- **Correctness over speed** — never cut corners or take shortcuts.
- **Read before writing** — understand existing patterns before changing code.
- **Do the full job** — update all call sites, tests, types, and documentation.
- **No TODO/FIXME/HACK comments** — fix it now or don't commit.
- **No eslint-disable comments** — fix the underlying issue.
- **Delete unused code** — dead code is noise.

See [CLAUDE.md](CLAUDE.md) for the full code quality rules, architectural conventions, and engineering standards.

## E2E Tests

E2E tests require the test plugin to be built first:

```bash
cd plugins/e2e-test && bun install && bun run build
```

Then run from the project root:

```bash
bun run test:e2e
```

## Adding a Platform Package

1. Create the package directory under `platform/<name>/`
2. Add `package.json` with the `@opentabs-dev` scope
3. Add `tsconfig.json` with `composite: true` and project references to dependencies
4. Reference the new package from the root `tsconfig.json`
5. Verify the package is included in the workspace: the root `package.json` uses `"workspaces": ["platform/*"]`
6. Run `bun install` to link the workspace

## Publishing

Platform packages are published to npm under the `@opentabs-dev` scope using `scripts/publish.sh`:

```bash
./scripts/publish.sh <version>
```

This bumps versions, rebuilds, and publishes in dependency order: shared → plugin-sdk → plugin-tools → cli. See [CLAUDE.md](CLAUDE.md) for npm authentication setup.
