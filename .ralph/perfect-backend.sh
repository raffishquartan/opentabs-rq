#!/bin/bash
# perfect-backend.sh — Audit backend code (everything except browser extension) and create PRD(s).
#
# Usage: bash .ralph/perfect-backend.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

read -r -d '' PROMPT <<'PROMPT_EOF' || true
You are auditing the OpenTabs backend code (everything except the browser extension) to find bugs and code quality issues with concrete consequences. Read the source code thoroughly, identify genuine problems, then use the ralph skill to create PRD(s) to fix them.

## Step 1: Read the rules and understand the codebase

1. Read CLAUDE.md (root) — overall platform architecture, key concepts, commands, code quality rules
2. Read these package-level CLAUDE.md files:
   - platform/mcp-server/CLAUDE.md
   - platform/plugin-sdk/CLAUDE.md
   - platform/cli/CLAUDE.md
   - platform/plugin-tools/CLAUDE.md

## Step 2: Systematically audit all backend source files

Read through ALL source files in each backend package. Do not skim — read every function, every error path, every cleanup handler.

### Packages to audit (in order):

1. **platform/mcp-server/src/** — the MCP server (highest priority, most complex)
2. **platform/cli/src/** — the user-facing CLI
3. **platform/plugin-tools/src/** — the plugin developer CLI
4. **platform/create-plugin/src/** — the scaffolding CLI
5. **platform/shared/src/** — shared utilities

**Do NOT audit** (handled by dedicated scripts):
- `platform/plugin-sdk/src/` — audited by perfect-sdk.sh
- `platform/browser-extension/src/` — audited by perfect-extension.sh

### What to look for:

- **Bugs**: Incorrect logic, race conditions, wrong return values, unhandled edge cases
- **Resource leaks**: Uncleaned timers, event listeners, unbounded maps/caches, missing cleanup, file descriptor leaks
- **Missing error handling**: Unguarded operations that could crash, missing null checks on edge cases, unhandled promise rejections
- **Dead/unreachable code**: Unused exports, unreachable branches, code that can never execute
- **Missing defensive guards**: Validation gaps, boundary checks, API version checks, transport-level limits not matching application-level limits
- **Architectural inconsistencies with concrete consequences**: Shared state protected in some paths but not others, cleanup done on one code path but not an equivalent one

## Step 3: Create PRD(s) using the ralph skill

Use the skill tool to load the "ralph" skill, then follow its instructions to create PRD(s).

Key parameters for backend PRDs:
- Target project: "OpenTabs Platform" (root monorepo)
- Do NOT set workingDirectory or qualityChecks (root monorepo uses defaults)
- Split into multiple PRDs by package boundary to allow parallel execution
- Stories that touch the same files must be in the same PRD
- All stories: e2eCheckpoint: false EXCEPT the final story in a PRD that touches browser-observable behavior
PROMPT_EOF

echo "=== perfect-backend.sh ==="
echo "Launching Claude to audit backend code and create PRD(s)..."
echo ""

echo "$PROMPT" | bash "$SCRIPT_DIR/run-prompt.sh" --perfect
