#!/bin/bash
# perfect-plugins.sh — Audit example plugins and create PRD(s).
#
# Usage: bash .ralph/perfect-plugins.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

read -r -d '' PROMPT <<'PROMPT_EOF' || true
You are auditing the OpenTabs example plugins (plugins/) to find bugs, SDK misuse, missing error handling, and code quality issues with concrete consequences. Read the plugin source code thoroughly, compare it against the SDK's public API, identify genuine problems, then use the ralph skill to create PRD(s) to fix them.

## Step 1: Read the rules and understand the SDK

1. Read CLAUDE.md (root) — overall platform architecture, key concepts, commands, code quality rules
2. Read plugins/CLAUDE.md — plugin isolation, conventions, build workflow, quality checks
3. Read platform/plugin-sdk/CLAUDE.md — the SDK's public API, utilities, lifecycle hooks, structured errors
4. Read platform/plugin-sdk/src/index.ts — all SDK exports (the authoritative public API surface)
5. Read platform/plugin-tools/CLAUDE.md — plugin build tooling

## Step 2: Discover all plugins

List all directories under plugins/ dynamically. For each plugin, read its package.json.

## Step 3: Audit each plugin thoroughly (Phase 1 — Collect)

For each plugin, read EVERY source file. **As you read each file, append every potential finding to `/tmp/perfect-findings.md`** per the Audit Method above. Do not filter yet — just collect.

- Plugin entry point (src/index.ts) — class, tool/resource/prompt registration, lifecycle hooks, isReady()
- Shared API/schema layer — API client, Zod schemas
- Individual tools (src/tools/*.ts) — defineTool() usage, handle function, error handling, SDK utility usage

### What to look for:

- **SDK misuse**: Deprecated/incorrect SDK APIs, wrong parameter types, ignoring SDK conventions
- **Bugs**: Incorrect logic, broken error propagation, incorrect return formats
- **Missing error handling**: Unhandled API errors, missing null checks on API responses, swallowed exceptions
- **Authentication issues**: Token extraction that could fail silently, stale token caching, missing re-auth on expiry
- **Rate limiting issues**: Missing rate limit handling, retry logic that could infinite-loop
- **Schema issues**: Zod schemas that don't match actual API responses, missing optional fields, incorrect types
- **Resource leaks**: Polling loops without cleanup, timers not cleared, event listeners not removed
- **Dead code**: Unused exports, unreachable branches

### What NOT to report (domain-specific):

- Tool design preferences — "I would have structured this tool differently"
- Missing tools — the plugin author decides which tools to expose
- Upstream API issues — issues in external APIs are not plugin bugs

## Step 4: Check SDK compatibility

Compare each plugin's SDK usage against platform/plugin-sdk/src/index.ts exports. Check for deprecated APIs, missing new SDK features that would improve reliability.

## Step 5: Filter findings (Phase 2)

Read `/tmp/perfect-findings.md` in full. For each finding, apply the Validation Checklist from the shared guidelines. For each finding, write "KEEP: [reason]" or "DISCARD: [reason]" to force explicit justification. Delete discarded findings.

## Step 6: Create PRD(s) using the ralph skill (Phase 3)

Use the skill tool to load the "ralph" skill, then follow its instructions to create PRD(s) from the surviving findings.

Key parameters for plugin PRDs:
- Create SEPARATE PRDs for each plugin that needs fixes
- For each plugin, set workingDirectory and qualityChecks appropriately:
  - workingDirectory: "plugins/<name>"
  - qualityChecks: "cd plugins/<name> && npm run build && npm run type-check && npm run lint && npm run format:check"
- All stories: e2eCheckpoint: false (plugin changes verified by plugin-level checks)
PROMPT_EOF

echo "=== perfect-plugins.sh ==="
echo "Launching Claude to audit example plugins and create PRD(s)..."
echo ""

echo "$PROMPT" | bash "$SCRIPT_DIR/run-prompt.sh"
