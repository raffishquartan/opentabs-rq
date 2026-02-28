#!/bin/bash
# perfect-plugins.sh — Invoke Claude to audit example plugins and create PRD(s) to fix bugs and improve quality.
#
# Usage: bash .ralph/perfect-plugins.sh
#
# This script launches a single Claude session (default model) that:
#   1. Reads all plugin source code under plugins/
#   2. Identifies bugs, SDK misuse, missing error handling, and quality issues
#   3. Uses the ralph skill to generate PRD(s) targeting individual plugin projects
#
# The ralph daemon (.ralph/ralph.sh) must be running to pick up the PRDs.
# This script does NOT start ralph — it only creates the PRD files.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

read -r -d '' PROMPT <<'PROMPT_EOF' || true
You are auditing the OpenTabs example plugins (plugins/) to find bugs, SDK misuse, missing error handling, and code quality issues. Your job is to read the plugin source code thoroughly, compare it against the SDK's public API, identify genuine problems, then use the ralph skill to create PRD(s) to fix them.

## Step 1: Read the rules and understand the SDK

1. Read CLAUDE.md (root) — overall platform architecture, key concepts, commands, code quality rules
2. Read plugins/CLAUDE.md — plugin isolation, conventions, build workflow, quality checks
3. Read platform/plugin-sdk/CLAUDE.md — the SDK's public API, utilities, lifecycle hooks, structured errors, conventions
4. Read platform/plugin-sdk/src/index.ts — all SDK exports (the authoritative public API surface)
5. Read platform/plugin-tools/CLAUDE.md — plugin build tooling (opentabs-plugin build)

Understanding the SDK is critical — plugins are consumers of the SDK, and many issues stem from incorrect or outdated SDK usage.

## Step 2: Discover all plugins

List all directories under plugins/ to find every plugin. Do NOT assume a fixed list — discover them dynamically.

For each plugin found, read its package.json to understand its opentabs config (displayName, urlPatterns, description).

## Step 3: Audit each plugin thoroughly

For each plugin, read EVERY source file. The key areas are:

### Plugin entry point (src/index.ts)
- Plugin class extending OpenTabsPlugin
- Tool, resource, and prompt registration
- Lifecycle hook implementations (isReady, teardown, onActivate, onDeactivate, onNavigate, onToolInvocationStart, onToolInvocationEnd)
- isReady() implementation — correctness of readiness detection

### Shared API/schema layer
- API client implementation (authentication, error handling, rate limiting)
- Shared Zod schemas (type correctness, completeness)

### Individual tools (src/tools/*.ts)
- defineTool() usage (schema correctness, description quality, parameter validation)
- Handle function implementation (error handling, edge cases, return format)
- SDK utility usage (fetchJSON, retry, waitForSelector, storage APIs, etc.)

### What to look for:

- **SDK misuse**: Using deprecated or incorrect SDK APIs, wrong parameter types, ignoring SDK conventions
- **Bugs**: Incorrect logic, wrong API calls, broken error propagation, incorrect return formats
- **Missing error handling**: Unhandled API errors, missing null checks on API responses, swallowed exceptions
- **Authentication issues**: Token extraction that could fail silently, stale token caching, missing re-auth on expiry
- **Rate limiting issues**: Missing rate limit handling, retry logic that could infinite-loop
- **Schema issues**: Zod schemas that don't match actual API responses, missing optional fields, incorrect types
- **Resource leaks**: Polling loops without cleanup, timers not cleared, event listeners not removed
- **Dead code**: Unused exports, unreachable branches, obsolete tool implementations
- **Inconsistency with SDK patterns**: Tools that don't follow the patterns established by the SDK's defineTool/defineResource/definePrompt factories

### What NOT to report:

- **Style preferences** — different-but-equivalent code styles are not bugs
- **Tool design preferences** — "I would have structured this tool differently" is not a quality issue
- **Missing tools** — the plugin author decides which tools to expose; gaps are not bugs
- **Upstream API issues** — issues in the Slack API itself are not plugin bugs

### Validation criteria for each finding:

For each candidate issue, ask yourself:
1. Is this a real problem or a different opinion?
2. Can I articulate a concrete consequence? (tool failure, wrong data returned, silent error, resource leak, auth breakdown)
3. Is the existing code following the SDK's documented patterns correctly?

**Discard any finding that fails this validation.** Only keep issues with concrete, articulable consequences.

## Step 4: Check SDK compatibility

Compare each plugin's SDK usage against the current SDK exports:

1. Read platform/plugin-sdk/src/index.ts for the latest exported API surface
2. Check if any plugin uses deprecated or removed SDK APIs
3. Check if any plugin is missing new SDK features that would improve reliability (e.g., structured errors, fetchJSON error mapping, retry utility)
4. Check if Zod schema patterns match the SDK's expected defineTool/defineResource/definePrompt signatures

## Step 5: Create PRD(s) using the ralph skill

After completing the audit, use the skill tool to load the "ralph" skill, then follow its instructions to create PRD(s).

Key parameters for plugin PRDs:
- Create SEPARATE PRDs for each plugin that needs fixes
- For the Slack plugin:
  - Target project: "OpenTabs Slack Plugin"
  - workingDirectory: "plugins/slack"
  - qualityChecks: "cd plugins/slack && npm run build && npm run type-check && npm run lint && npm run format:check"
- For the E2E test plugin:
  - Target project: "OpenTabs E2E Test Plugin"
  - workingDirectory: "plugins/e2e-test"
  - qualityChecks: "cd plugins/e2e-test && npm run build && npm run type-check && npm run lint && npm run format:check"
- All stories: e2eCheckpoint: false (plugin changes are verified by plugin-level checks, not platform E2E)
- Always use small stories (1-3 files per story)
- Include repo-root-relative file paths and line numbers in the notes field
- Every story must have concrete, verifiable acceptance criteria
- Skip clarifying questions — this prompt provides all the context needed

Do NOT create stories for:
- Stylistic preferences or alternative coding approaches
- Adding new tools or features to plugins
- Cosmetic changes to tool descriptions or parameter names
- Issues in the SDK itself (those belong in the backend audit)

DO create stories for:
- Bugs in tool handle functions
- Missing error handling that causes tools to fail with unhelpful errors
- SDK misuse that could cause runtime failures
- Authentication logic that can fail silently
- Resource leaks (polling, timers, event listeners)
- Schema mismatches that cause validation failures
- Dead or unreachable code
- Rate limiting issues that could cause infinite loops or data loss
PROMPT_EOF

echo "=== perfect-plugins.sh ==="
echo "Launching Claude to audit example plugins and create PRD(s)..."
echo ""

echo "$PROMPT" | bash "$SCRIPT_DIR/run-prompt.sh"
