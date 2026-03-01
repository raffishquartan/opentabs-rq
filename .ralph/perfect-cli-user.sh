#!/bin/bash
# perfect-cli-user.sh — Invoke Claude to perform a fresh-user CLI experience test and create PRD(s) for frictions found.
#
# Usage: bash .ralph/perfect-cli-user.sh
#
# This script launches a single Claude session (default model) that:
#   1. Spins up a Docker container simulating a brand-new user environment
#   2. Installs the opentabs CLI from npm and exercises every command
#   3. Identifies UX frictions, confusing output, broken flows, and error handling gaps
#   4. Uses the ralph skill to generate PRD(s) targeting the root monorepo
#
# Prerequisites:
#   - Docker running (Docker Desktop or OrbStack)
#   - ralph-worker image built: bash .ralph/docker-build.sh
#   - ~/.npmrc with valid auth token for @opentabs-dev packages
#
# The ralph daemon (.ralph/ralph.sh) must be running to pick up the PRDs.
# This script does NOT start ralph — it only creates the PRD files.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

read -r -d '' PROMPT <<'PROMPT_EOF' || true
You are a QA engineer performing a fresh-user experience test of the OpenTabs CLI. Your job is to install and use the CLI exactly as a real new user would — someone who has never heard of OpenTabs before — identify every friction point, then use the ralph skill to create PRD(s) to fix them.

You are sensitive to UX for general people (not nitpicking, not a plugin developer). You are a normal user who wants to try OpenTabs for the first time.

## IMPORTANT: Skip source code reading — go straight to testing

Do NOT spend time reading source code, CLAUDE.md files, or exploring the codebase. The value of this test comes from testing the CLI as a real user would — not from understanding the implementation. A real user has zero knowledge of the source code. Your fresh perspective IS the test.

Read only these two files for orientation (30 seconds max):
1. README.md — the landing page a user would see on GitHub
2. The docs Quick Start page: docs/content/docs/quick-start.mdx

Then immediately proceed to Docker setup and testing.

## Step 1: Set up a clean Docker environment

First, kill any stale container from a previous run:

```bash
docker kill opentabs-ux-test 2>/dev/null; docker rm opentabs-ux-test 2>/dev/null; true
```

Then launch a fresh container:

```bash
docker run --rm -d \
  --name opentabs-ux-test \
  --init --ipc=host --shm-size=2g \
  --network host \
  -e "HOME=/home/testuser" \
  -v "$HOME/.npmrc:/tmp/staging/.npmrc:ro" \
  ralph-worker:latest \
  "mkdir -p /home/testuser && cp /tmp/staging/.npmrc /home/testuser/.npmrc 2>/dev/null; sleep 86400"
```

Verify the container is healthy and record the environment:

```bash
docker exec opentabs-ux-test bash -c 'echo "Node: $(node --version), npm: $(npm --version), HOME=$HOME" && ls -la $HOME/'
```

Record the Node.js version — it is critical context. If a command behaves differently than expected, the Node version may explain why.

Key details:
- Uses `ralph-worker:latest` image (has Node.js, npm, Chromium pre-installed)
- Mounts `~/.npmrc` read-only for npm auth (required — @opentabs-dev packages are private on npm)
- Sets a clean HOME at `/home/testuser` so there is no prior opentabs config
- Uses `--network host` so the server binds to the host's loopback
- All `docker exec` commands run as: `docker exec opentabs-ux-test <command>`

IMPORTANT: Clean up the container when done (`docker kill opentabs-ux-test`).

## Step 2: Walk through the COMPLETE new-user journey

Act as a new user. Exercise every command and workflow. Be thorough and methodical.

### Debugging principle: always capture stdout and stderr separately

When testing any command that might fail unexpectedly, capture stdout and stderr into separate files so silent failures surface:

```bash
docker exec opentabs-ux-test bash -c 'COMMAND 1>/tmp/cmd-stdout.txt 2>/tmp/cmd-stderr.txt; echo "EXIT=$?"'
docker exec opentabs-ux-test bash -c 'echo "=== STDOUT ==="; cat /tmp/cmd-stdout.txt; echo "=== STDERR ==="; cat /tmp/cmd-stderr.txt'
```

Use this pattern for `opentabs start --background` and any other command that exits non-zero with no visible output. A command that exits non-zero with empty stdout AND empty stderr is a **silent failure** bug.

### Phase 1: Installation and first impression
- Install: `npm install -g @opentabs-dev/cli`
- `opentabs --version` and `opentabs --help`
- `opentabs` with no arguments (what does a new user see?)
- Typo: `opentabs strat` (error handling)

### Phase 2: First run
- `opentabs doctor` (before starting — what's the diagnostic?)
- `opentabs status` (before starting)
- `opentabs logs` (before starting)
- `opentabs start --show-config` (before server has ever started — does it work or error?)
- Run `opentabs start` in the foreground (capturing output):
  ```bash
  docker exec -d opentabs-ux-test bash -c 'opentabs start > /tmp/start-output.txt 2>&1'
  sleep 5
  docker exec opentabs-ux-test cat /tmp/start-output.txt
  ```
- Analyze the first-time output: Is it clear? Complete? Correct? Would the MCP config snippets actually work?

### Phase 3: Server running — test ALL commands
With the server running, test every command systematically:

**Status & diagnostics:**
- `opentabs status` and `opentabs status --json`
- `opentabs doctor`
- `opentabs logs` and `opentabs logs --lines 5`
- `opentabs logs --plugin nonexistent` (filter for a plugin that doesn't exist — feedback?)
- `opentabs audit` and `opentabs audit --json` and `opentabs audit --file`
- `opentabs audit --since 1h` and `opentabs audit --limit 5` (filter options with empty results)
- `opentabs audit --since invalid` (invalid duration format)

**Config management:**
- `opentabs config show` and `opentabs config show --json`
- `opentabs config show --show-secret` and `opentabs config show --json --show-secret`
- `opentabs config path`
- `opentabs config set port 8080` then `opentabs config set port 9515`
- `opentabs config set tool.` (list available tools)
- `opentabs config set invalidkey foo` (error handling)
- `opentabs config set prot 9515` (typo — does it suggest "port"?)
- `opentabs config set port notanumber` (validation)
- `opentabs config set port 0` and `opentabs config set port 99999` (boundary values)
- `opentabs config set browser-tool.browser_execute_script disabled` then re-enable
- `opentabs config set browser-tool.nonexistent_tool disabled` (nonexistent tool name)
- `opentabs config set browser-tool.browser_execute_script badvalue` (invalid value)
- `opentabs config set browser-tool.` (list available browser tools)
- `opentabs config set localPlugins.add /tmp/nonexistent` (warning?)
- `opentabs config set localPlugins.add /tmp/nonexistent --force` (force flag)
- `opentabs config set localPlugins.remove /tmp/nonexistent`
- `opentabs config reset` (without --confirm)
- `opentabs config rotate-secret` (without --confirm)
- `opentabs config rotate-secret --confirm` (actually rotate — verify the secret changed by comparing `config show --show-secret` before and after)
- `opentabs config set` with no args (missing key)
- `opentabs config set port` with no value (missing value)

**Plugin management:**
- `opentabs plugin` and `opentabs plugin --help`
- `opentabs plugin search` (no query — discover what's available)
- `opentabs plugin search slack`
- `opentabs plugin search nonexistent-thing-12345`
- `opentabs plugin list` and `opentabs plugin list --json`
- `opentabs plugin install slack` (then verify with `opentabs plugin list` and `opentabs status`)
- `opentabs plugin list --verbose` (see tool names)
- `opentabs plugin remove slack` (without --confirm)
- `opentabs plugin remove slack --confirm`
- `opentabs plugin install slack` again (reinstall after remove — does it work cleanly?)
- `opentabs plugin install nonexistent-plugin` (error handling)
- `opentabs plugin create test-plugin --domain .example.com` (scaffolding in a temp dir)
- Verify the scaffolded plugin builds: `cd test-plugin && npm install && npm run build` (does it succeed?)

**Server lifecycle:**
- `opentabs start` again while server is running (port conflict error)
- `opentabs stop` while foreground server is running (what message?)
- Kill the foreground server, then test background mode:
  ```bash
  # Kill the foreground server
  docker exec opentabs-ux-test bash -c 'pkill -f "opentabs" 2>/dev/null; sleep 2'
  # Test --background (capture stdout/stderr separately!)
  docker exec opentabs-ux-test bash -c 'opentabs start --background 1>/tmp/bg-stdout.txt 2>/tmp/bg-stderr.txt; echo "EXIT=$?"'
  docker exec opentabs-ux-test bash -c 'cat /tmp/bg-stdout.txt; cat /tmp/bg-stderr.txt'
  # If --background succeeded: test stop
  docker exec opentabs-ux-test bash -c 'opentabs status'
  docker exec opentabs-ux-test bash -c 'opentabs stop'
  docker exec opentabs-ux-test bash -c 'opentabs status'
  ```
- `opentabs stop` when no server is running

**Custom port end-to-end:**
- Start server on a custom port: `opentabs start --port 8888` (foreground, in background via docker exec -d)
- Verify: `opentabs status --port 8888`
- Verify: `opentabs doctor --port 8888`
- Kill it after testing

**Other commands:**
- `opentabs update`
- `opentabs start --show-config` (after server has been initialized)
- Every `--help` flag on every subcommand

### Phase 4: Config reset and fresh re-start
Test destructive config operations and recovery:
- `opentabs config reset --confirm` (actually reset)
- `opentabs config show` (what does it look like after reset?)
- `opentabs doctor` (what's the diagnostic after reset?)
- Start the server again — does it re-initialize cleanly?
- Kill the server

### Phase 5: Server stopped — test offline behavior
With no server running, test every command for graceful degradation:
- `opentabs status` — graceful "not running" message?
- `opentabs doctor` — degrades gracefully?
- `opentabs audit` — handles no server?
- `opentabs audit --file` — reads from disk log?
- `opentabs logs` — still works from file?
- `opentabs plugin list` — offline mode?
- `opentabs config show` — works without server?

### Phase 6: Cleanup
- `docker kill opentabs-ux-test`

## Step 3: Evaluate every interaction for friction

For each command, evaluate from a NORMAL USER's perspective (not a developer):

1. **Clarity**: Would a new user understand the output and know what to do next?
2. **Correctness**: Does the output match reality? Are configs functional? Are counts accurate?
3. **Completeness**: Is important information missing?
4. **Error handling**: Do errors provide actionable guidance?
5. **Consistency**: Are patterns consistent across commands?
6. **Progressive disclosure**: Right amount of info for beginners vs power users?

### Categories of friction:
- **Broken flows**: Output that leads users to do the wrong thing
- **Confusing output**: Messages that don't make sense without insider knowledge
- **Missing information**: Important details not shown when needed
- **Excessive information**: Output that overwhelms or buries the important stuff
- **Silent failures**: Things that fail without telling the user (exit non-zero with no output)
- **Poor error messages**: Errors that don't tell you how to fix the problem
- **Discoverability gaps**: Features that exist but users would never find

### What NOT to report as friction:
- Plugin ecosystem being WIP (limited plugins available, missing descriptions) — this is temporary
- `opentabs-plugin` CLI not being globally available — WIP, not final state
- Stylistic preferences about output formatting
- Features that work correctly but you'd design differently
- Docker/headless environment issues — OpenTabs is designed for headed mode (Chrome on the desktop). You are testing in Docker only for a clean environment; do not report "no browser found" or headless-related issues as frictions
- `opentabs` with no args showing "Server not running" — this is intentional (status is the default command)

## Step 4: Create PRD(s) using the ralph skill

After completing all testing, compile findings and use the skill tool to load the "ralph" skill, then create PRD(s).

Key parameters:
- Target project: "OpenTabs Platform" (root monorepo) unless the fix is docs-only
- For docs-only fixes: project "OpenTabs Docs", workingDirectory "docs", qualityChecks "cd docs && npm run build && npm run type-check && npm run lint && npm run knip && npm run format:check"
- Do NOT set workingDirectory or qualityChecks for root monorepo
- Group related fixes into the same PRD (fixes to the same file go together)
- All stories: e2eCheckpoint: false (CLI/docs changes are not browser-observable)
- Small stories (1-3 files per story)
- Include repo-root-relative file paths in notes
- Concrete, verifiable acceptance criteria
- Skip clarifying questions — this prompt provides all context

Severity triage (for prioritization, not for filtering):
- **HIGH**: Broken flows (user copies output that doesn't work), silent data loss, crashes
- **MEDIUM**: Confusing output, missing information, poor discoverability
- **LOW**: Minor inconsistencies, edge case polish

Create PRDs for ALL severity levels — HIGH, MEDIUM, and LOW. Every genuine issue deserves a fix. Use severity to order stories (HIGH first) and to decide model (opus for complex HIGH issues, sonnet for straightforward fixes).

However, ruthlessly distinguish genuine issues from style preferences. Before filing any issue, ask: "Is this a real problem with a concrete consequence, or just a different way to write the same thing?" A different-but-equivalent approach is NOT an issue. Only file issues where you can articulate a specific harm: user confusion, broken workflow, misleading output, silent failure, wasted time, or incorrect behavior.
PROMPT_EOF

echo "=== perfect-cli-user.sh ==="
echo "Launching Claude to test CLI user experience and create PRD(s)..."
echo ""

echo "$PROMPT" | bash "$SCRIPT_DIR/run-prompt.sh"
