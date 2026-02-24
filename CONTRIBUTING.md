# Contributing to OpenTabs

## Prerequisites

- [Bun](https://bun.sh/) >= 1.3.9
- [Node.js](https://nodejs.org/) >= 20 (Playwright E2E tests run under Node.js)
- Google Chrome (for extension development and E2E tests)
- Git

## Getting Started

```bash
git clone https://github.com/opentabs-dev/opentabs.git
cd opentabs
bun install
bun run build
```

If builds get into a bad state, reset with `bun run clean` (removes all `dist/` and `.tsbuildinfo` files) then `bun run build` again. Use `bun run clean:all` to also remove `node_modules/` everywhere.

Load the Chrome extension:

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" and select `~/.opentabs/extension/`

## Development Workflow

**Full dev mode** (recommended):

```bash
bun run dev
```

This starts `tsc --build --watch`, the MCP server with `bun --hot`, and auto-rebuilds the Chrome extension on source changes. Output is color-coded by subprocess (`[tsc]`, `[mcp]`, `[ext]`) and a startup banner shows the MCP server URL and extension path when everything is ready. You still need to manually reload the extension from `chrome://extensions/` after rebuilds.

**MCP server only** (lightweight alternative for server-only work):

```bash
bun run dev:mcp
```

This starts just the MCP server with `bun --hot` for hot reload — no tsc watcher or extension rebuilds. Useful when you're only changing server code and want faster iteration.

**Manual workflow:**

```bash
bun run build        # Build everything
opentabs start       # Start the MCP server
```

### MCP Server Changes

In dev mode, the server hot-reloads automatically when `tsc` recompiles. Without dev mode: rebuild (`bun run build`) and restart the server.

### Chrome Extension Changes

The extension never auto-reloads. After building:

1. `bun run build`
2. Open `chrome://extensions/` and click the reload icon on the OpenTabs card
3. Reopen the side panel if it was open

### Plugin Changes

Plugin builds auto-register and notify the running MCP server:

```bash
cd plugins/<name>
bun install    # first time only
bun run build  # builds, registers, and notifies the server
```

## Running Tests

**Unit tests:**

```bash
bun run test
```

**E2E tests** (requires the test plugin to be built):

```bash
bun run test:e2e
```

This builds the `e2e-test` plugin automatically, then runs Playwright.

**All quality checks at once:**

```bash
bun run check       # build + lint + format + knip + unit tests
bun run check:everything   # everything above + E2E tests + docs checks + plugin checks
```

| Command                    | What it does                                                    |
| -------------------------- | --------------------------------------------------------------- |
| `bun run build`            | Production build (tsc + extension, incremental)                 |
| `bun run build:force`      | Full clean rebuild (non-incremental)                            |
| `bun run build:docs`       | Build docs site                                                 |
| `bun run build:plugins`    | Build all plugins (install + build each)                        |
| `bun run type-check`       | TypeScript type checking (--noEmit, no file emission)           |
| `bun run lint`             | ESLint                                                          |
| `bun run format:check`     | Prettier formatting                                             |
| `bun run knip`             | Unused exports and dependencies                                 |
| `bun run test`             | Unit tests (Bun test runner)                                    |
| `bun run test:e2e`         | E2E tests (builds e2e-test plugin + Playwright)                 |
| `bun run check`            | All root checks (build + lint + format + knip + unit tests)     |
| `bun run check:everything` | Everything: root + E2E + docs + plugins                         |
| `bun run check:docs`       | Docs quality checks (build + type-check + lint + knip + format) |
| `bun run check:plugins`    | Plugin quality checks (type-check + lint + format)              |
| `bun run dev`              | Full dev mode (tsc watch + MCP server + extension)              |
| `bun run dev:mcp`          | MCP server only with hot reload                                 |
| `bun run dev:docs`         | Docs dev server                                                 |
| `bun run storybook`        | Storybook dev server (extension components)                     |
| `bun run clean`            | Remove all build artifacts                                      |
| `bun run clean:all`        | Remove build artifacts + node_modules everywhere                |

All checks must pass before merging.

## Git Hooks

The project uses [Husky](https://typicode.github.io/husky/) for git hooks:

**Pre-commit** (runs on every commit):

- Rejects any accidentally staged ralph state files (`.ralph/prd.json`, `.ralph/progress.txt`)
- Runs `lint-staged`: Prettier and ESLint auto-fix on staged `.ts`, `.tsx`, and `.json` files; Prettier on `.md` files
- Runs `knip` to catch unused exports and dependencies

**Pre-push** (runs before every push):

- `bun run build` — full production build
- `bun run type-check` — TypeScript type checking
- `bun run test` — unit tests

If any hook command fails, the git operation is aborted. Fix the issue before retrying.

## E2E Test Infrastructure

E2E tests live in `e2e/` and use Playwright with custom fixtures. Each test gets a fully isolated environment:

**Fixture hierarchy** (each layer depends on the previous):

1. **`testPorts`** — dynamically allocated free ports (MCP server + test server)
2. **`mcpServer`** — MCP server subprocess running on the test's unique port, with its own config directory
3. **`testServer`** — controllable HTTP server that simulates web applications the extension interacts with
4. **`extensionContext`** — Chromium browser context with a copy of the extension configured for this test's ports
5. **`backgroundPage`** — the extension's service worker page, for inspecting extension internals
6. **`mcpClient`** — MCP Streamable HTTP client connected to this test's server, for calling tools and reading resources
7. **`sidePanelPage`** — the extension's side panel, for testing the React UI

**Writing a new test:**

```typescript
import { test, expect } from './fixtures.js';

test('my feature works', async ({ mcpClient, mcpServer }) => {
  await mcpServer.waitForHealth();
  const tools = await mcpClient.listTools();
  expect(tools.length).toBeGreaterThan(0);
});
```

Import `test` and `expect` from `./fixtures.js` (not from `@playwright/test` directly). The custom `test` object provides all the fixtures above as destructured parameters.

**Configuration**: Tests run in parallel (`fullyParallel: true`) with 4 local workers (2 on CI). Each test uses ephemeral ports (`PORT=0`), so parallel tests never collide. Traces and video are retained on failure.

## Debugging

OpenTabs spans four processes — each has its own debugging surface:

**MCP Server** (Bun process):

- Log file: `~/.opentabs/server.log`
- CLI: `opentabs logs -f` to follow logs in real time, or `opentabs logs` for recent output
- Filter by plugin: `opentabs logs -f --plugin <name>`
- Health endpoint: `curl http://localhost:9515/health`

**Extension background** (Chrome service worker):

- Open `chrome://extensions/`, find OpenTabs, click "Inspect views: service worker"
- Console shows WebSocket messages, adapter injection, and tool dispatch

**Extension side panel** (React UI):

- Right-click the side panel and select "Inspect"
- Standard Chrome DevTools for the React app

**Injected adapters** (page context):

- Open DevTools on the target page
- Console: `globalThis.__openTabs` shows registered adapters and their state
- Network tab shows API calls made by plugin tool handlers

**E2E test failures:**

- Playwright traces are saved to `test-results/` on failure (configured via `trace: 'retain-on-failure'`)
- View traces: `bunx playwright show-trace test-results/<test-name>/trace.zip`
- HTML report: `bunx playwright show-report`
- Video recordings are also retained on failure

## Code Conventions

Key rules (see [CLAUDE.md](CLAUDE.md) for the full list):

- **Bun-first APIs** — use `Bun.file()`, `Bun.write()`, `Bun.env` instead of Node.js equivalents where possible
- **No `eslint-disable` comments** — fix the underlying issue
- **No TODO/FIXME/HACK comments** — fix it now or don't commit
- **Delete unused code** — dead code is noise
- **Every `.ts` file must be covered by a tsconfig** that `tsc --build` reaches
- **Comments describe current behavior** — no historical context or "used to" phrasing

## Architecture

OpenTabs has three core components: the **MCP Server** (discovers plugins, dispatches tool calls), the **Chrome Extension** (injects plugin adapters into matching tabs), and the **Plugin SDK** (base class and utilities for plugin authors). They communicate via Streamable HTTP (Claude Code ↔ MCP Server) and WebSocket (MCP Server ↔ Extension).

See [CLAUDE.md](CLAUDE.md) for the full architecture documentation, plugin discovery pipeline, dispatch protocol, and design decisions.

## Adding a Platform Package

1. Create the package directory under `platform/<name>/`
2. Add `package.json` with the `@opentabs-dev` scope
3. Add `tsconfig.json` with `composite: true` and project references to dependencies
4. Reference the new package from the root `tsconfig.json`
5. The root `package.json` uses `"workspaces": ["platform/*"]`, so it is automatically included
6. Run `bun install` to link the workspace

## Publishing

Platform packages are published to npm under the `@opentabs-dev` scope:

```bash
./scripts/publish.sh <version>
```

This bumps versions, rebuilds, and publishes in dependency order. See [CLAUDE.md](CLAUDE.md) for npm authentication setup.

## Creating a Pull Request

1. Create a feature branch: `git checkout -b my-feature`
2. Make your changes and commit with a clear message
3. Run `bun run check:everything` to verify everything passes
4. Push your branch: `git push -u origin my-feature`
5. Open a pull request against `main` with a description of what changed and why
