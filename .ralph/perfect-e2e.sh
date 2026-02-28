#!/bin/bash
# perfect-e2e.sh — Invoke Claude to audit E2E test code and create PRD(s) to fix bugs and improve quality.
#
# Usage: bash .ralph/perfect-e2e.sh
#
# This script launches a single Claude session (default model) that:
#   1. Reads all E2E test source code (e2e/*.e2e.ts, fixtures, helpers, test servers)
#   2. Identifies flaky patterns, missing coverage, incorrect assertions, and test infrastructure issues
#   3. Uses the ralph skill to generate PRD(s) targeting the root monorepo
#
# The ralph daemon (.ralph/ralph.sh) must be running to pick up the PRDs.
# This script does NOT start ralph — it only creates the PRD files.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

read -r -d '' PROMPT <<'PROMPT_EOF' || true
You are auditing the OpenTabs E2E test suite (e2e/) to find bugs, flaky patterns, missing test coverage, incorrect assertions, and test infrastructure issues. Your job is to read the test code thoroughly, identify genuine problems, then use the ralph skill to create PRD(s) to fix them.

## Step 1: Read the rules and understand the codebase

1. Read CLAUDE.md (root) — overall platform architecture, key concepts, commands, code quality rules
2. Read e2e/CLAUDE.md — E2E test conventions, fixtures, process cleanup rules
3. Read platform/mcp-server/CLAUDE.md — server architecture (tests exercise this)
4. Read platform/browser-extension/CLAUDE.md — extension architecture (tests exercise this)
5. Read platform/plugin-sdk/CLAUDE.md — SDK API surface (test plugin uses this)

These CLAUDE.md files are the source of truth for understanding what the tests should be verifying.

## Step 2: Read the test infrastructure

Start with the shared infrastructure that all tests depend on:

1. **e2e/fixtures.ts** — test fixtures (MCP server, extension, test server lifecycle)
2. **e2e/helpers.ts** — shared test helpers and utilities
3. **e2e/test-server.ts** — controllable test web server
4. **e2e/test-server-utils.ts** — test server utilities
5. **e2e/strict-csp-test-server.ts** — CSP test server
6. **e2e/analyze-site-test-server.ts** — site analysis test server
7. **e2e/global-setup.ts** — Playwright global setup
8. **e2e/global-teardown.ts** — Playwright global teardown
9. **e2e/orphan-guard.ts** — orphan process cleanup
10. **e2e/tsconfig.json** — TypeScript configuration for tests

Understanding the fixtures and helpers is critical — many test quality issues originate in shared infrastructure.

## Step 3: Systematically audit all E2E test files

Read through ALL test files in e2e/. Do not skim — read every test case, every assertion, every setup/teardown block.

### Test files to audit (read every one):

- e2e/iife-injection.e2e.ts
- e2e/strict-csp.e2e.ts
- e2e/lifecycle.e2e.ts
- e2e/lifecycle-hooks.e2e.ts
- e2e/tool-dispatch.e2e.ts
- e2e/tool-defaults.e2e.ts
- e2e/browser-tools.e2e.ts
- e2e/resources-prompts.e2e.ts
- e2e/structured-errors.e2e.ts
- e2e/sdk-utilities.e2e.ts
- e2e/sdk-fetch-errors.e2e.ts
- e2e/sdk-version.e2e.ts
- e2e/plugin-management.e2e.ts
- e2e/plugin-logging.e2e.ts
- e2e/npm-discovery.e2e.ts
- e2e/discovery-edge-cases.e2e.ts
- e2e/tab-state-sync.e2e.ts
- e2e/side-panel-data-flow.e2e.ts
- e2e/side-panel-icons.e2e.ts
- e2e/side-panel-live-update.e2e.ts
- e2e/side-panel-plugin-toggle.e2e.ts
- e2e/side-panel-reload.e2e.ts
- e2e/config-watcher.e2e.ts
- e2e/hot-reload-dynamic.e2e.ts
- e2e/health-endpoint.e2e.ts
- e2e/audit-logging.e2e.ts
- e2e/secret-rotation.e2e.ts
- e2e/dispatch-resilience.e2e.ts
- e2e/progress.e2e.ts
- e2e/onboarding.e2e.ts
- e2e/analyze-site.e2e.ts
- e2e/build-icons.e2e.ts
- e2e/orphan-guard.ts

### What to look for:

- **Flaky patterns**: Race conditions in test code, missing waits, polling without proper timeouts, timing-dependent assertions, shared mutable state between tests
- **Incorrect assertions**: Tests that pass but verify the wrong thing, overly broad assertions (toContain instead of toEqual), missing negative assertions
- **Missing error handling in tests**: Tests that swallow errors silently, missing try/finally for cleanup, tests that pass when they should fail
- **Resource leaks in test infrastructure**: Servers not shut down, browsers not closed, temp files not cleaned up on failure paths
- **Missing test coverage**: Features documented in CLAUDE.md files that have no E2E test coverage, edge cases mentioned in source code comments but not tested
- **Fragile selectors or assumptions**: Tests that depend on implementation details that could change, hardcoded port numbers, filesystem path assumptions
- **Duplicate or redundant tests**: Tests that verify the exact same behavior, wasting CI time
- **Test isolation issues**: Tests that depend on execution order, shared state leaking between test files, missing cleanup between tests
- **Process cleanup issues**: Tests that could leave orphaned processes (Chromium, MCP servers, test servers) on failure

### What NOT to report:

- **Test style preferences** — different-but-equivalent assertion styles are not bugs
- **Test structure preferences** — organizing tests differently is not a quality issue
- **Missing tests for internal implementation details** — E2E tests verify user-visible behavior, not internals
- **Slow tests that are correct** — slowness without flakiness is not a bug (unless there's a clear optimization)

### Validation criteria for each finding:

For each candidate issue, ask yourself:
1. Is this a real test quality problem or a style preference?
2. Can I articulate a concrete consequence? (false positive, false negative, flaky failure, resource leak, CI instability)
3. Does the existing test code already handle this case in a way I missed?

**Discard any finding that fails this validation.** Only keep issues with concrete, articulable consequences.

## Step 4: Check for missing E2E coverage

Compare the features described in the CLAUDE.md files against the existing test files. Look for:

1. **MCP server features** (from platform/mcp-server/CLAUDE.md) with no E2E coverage
2. **Extension features** (from platform/browser-extension/CLAUDE.md) with no E2E coverage
3. **SDK utilities** (from platform/plugin-sdk/CLAUDE.md) with no E2E coverage
4. **CLI behaviors** that are E2E-testable but not covered
5. **Error scenarios** and edge cases described in source code but not tested

Only flag missing coverage if the feature is user-visible and the gap creates real risk. Do not flag coverage gaps for trivial or internal-only code paths.

## Step 5: Create PRD(s) using the ralph skill

After completing the audit, use the skill tool to load the "ralph" skill, then follow its instructions to create PRD(s).

Key parameters for E2E PRDs:
- Target project: "OpenTabs Platform" (root monorepo)
- Do NOT set workingDirectory or qualityChecks (root monorepo uses defaults)
- Group related fixes to avoid merge conflicts (fixes to the same test file go together)
- All stories: e2eCheckpoint: true for the final story (E2E test changes are browser-observable by definition)
- All other stories: e2eCheckpoint: false
- Always use small stories (1-3 files per story)
- Include repo-root-relative file paths and line numbers in the notes field
- Every story must have concrete, verifiable acceptance criteria

Do NOT create stories for:
- Test style preferences or alternative assertion patterns
- Cosmetic changes to test descriptions or comments
- Adding tests for internal implementation details
- Theoretical flakiness with no evidence of actual failures

DO create stories for:
- Flaky test patterns with concrete race conditions
- Tests that verify the wrong thing (false positives/negatives)
- Resource leaks in test infrastructure
- Missing test coverage for documented user-visible features
- Test isolation issues that cause order-dependent failures
- Incorrect cleanup that could leave orphaned processes

Skip clarifying questions — this prompt provides all the context needed.
PROMPT_EOF

echo "=== perfect-e2e.sh ==="
echo "Launching Claude to audit E2E test code and create PRD(s)..."
echo ""

echo "$PROMPT" | bash "$SCRIPT_DIR/run-prompt.sh"
