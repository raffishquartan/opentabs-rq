#!/bin/bash
# perfect-sdk.sh — Audit the plugin SDK (browser-context code) and create PRD(s).
#
# Usage: bash .ralph/perfect-sdk.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

read -r -d '' PROMPT <<'PROMPT_EOF' || true
You are auditing the OpenTabs Plugin SDK (platform/plugin-sdk/) — a library that runs entirely in browser page context, injected as IIFEs into web applications. Find bugs, browser compatibility issues, CSP violations, same-origin edge cases, and quality problems, then use the ralph skill to create PRD(s) to fix them.

This is a browser-context audit. Every function in this SDK runs inside a web page's main thread. Issues like SecurityError from blocked storage, CSP-restricted fetch, MutationObserver edge cases, and same-origin policy violations are first-class concerns.

## Step 1: Read the rules and understand the SDK

1. Read CLAUDE.md (root) — overall platform architecture, key concepts, commands, code quality rules
2. Read platform/plugin-sdk/CLAUDE.md — SDK public API, lifecycle hooks, utilities, structured errors, Zod schema rules
3. Read platform/browser-extension/CLAUDE.md — how the extension injects adapters and dispatches tool calls (the SDK's runtime environment)

## Step 2: Read ALL SDK source files (Phase 1 — Collect)

Read every source file thoroughly — every function, every error path, every edge case handler. **As you read each file, append every potential finding to `/tmp/perfect-findings.md`** per the Audit Method above. Do not filter yet — just collect.

### Core SDK (read in order):
1. platform/plugin-sdk/src/index.ts — OpenTabsPlugin base class, defineTool, defineResource, definePrompt
2. platform/plugin-sdk/src/errors.ts — ToolError class, factory methods
3. platform/plugin-sdk/src/dom.ts — DOM utilities (waitForSelector, observeDOM, etc.)
4. platform/plugin-sdk/src/fetch.ts — fetch utilities (fetchJSON, postJSON, etc.)
5. platform/plugin-sdk/src/storage.ts — storage utilities (localStorage, sessionStorage, getCookie)
6. platform/plugin-sdk/src/page-state.ts — page state utilities (getPageGlobal, getCurrentUrl, getPageTitle)
7. platform/plugin-sdk/src/timing.ts — timing utilities (retry, sleep, waitUntil)
8. platform/plugin-sdk/src/log.ts — structured logging API
9. platform/plugin-sdk/src/lucide-icon-names.ts — icon name constants

### SDK tests (read all):
10. All *.test.ts files in platform/plugin-sdk/src/

### Build and config:
11. platform/plugin-sdk/package.json, tsconfig.json, tsconfig.test.json

## Step 3: Audit for browser-context-specific issues

Focus on issues unique to browser page context:

- **DOM utilities**: MutationObserver race conditions (element exists before observer setup?), disconnected observers on timeout/abort, invalid CSS selector handling, memory leaks in observeDOM cleanup
- **Fetch utilities**: CSP connect-src restrictions, AbortSignal cleanup, credentials behavior for cross-origin, error mapping from HTTP status codes, non-JSON response body handling
- **Storage utilities**: SecurityError handling (third-party contexts, privacy mode), QuotaExceededError on setLocalStorage, cookie parsing edge cases (= in values, empty values, URI encoding)
- **Timing utilities**: Retry abort handling race conditions, waitUntil polling interval cleanup, exponential backoff overflow for large maxAttempts
- **Page state**: getPageGlobal safety for non-object intermediates, Proxy trap handling
- **Structured errors**: ToolError serialization through the IIFE/extension/MCP pipeline, factory method consistency
- **Logging**: Circular reference handling, runtime detection, message formatting
- **Base class and factories**: Schema validation timing, type exports

## Step 4: Audit test coverage and correctness

For each test file, check: Are important edge cases tested? Are there tests that pass but verify the wrong thing? Are there missing tests for error/timeout/abort paths? Are test mocks accurate to real browser behavior?

## Step 5: Filter findings (Phase 2)

Read `/tmp/perfect-findings.md` in full. For each finding, apply the Validation Checklist from the shared guidelines. For each finding, write "KEEP: [reason]" or "DISCARD: [reason]" to force explicit justification. Delete discarded findings.

## Step 6: Create PRD(s) using the ralph skill (Phase 3)

Use the skill tool to load the "ralph" skill, then follow its instructions to create PRD(s) from the surviving findings.

Key parameters for SDK PRDs:
- Target project: "OpenTabs Platform" (root monorepo)
- Do NOT set workingDirectory or qualityChecks (root monorepo uses defaults)
- Group related fixes by file to avoid merge conflicts (dom.ts fixes together, fetch.ts fixes together, etc.)
- All stories: e2eCheckpoint: false EXCEPT the final story if it touches behavior observable in E2E tests
PROMPT_EOF

echo "=== perfect-sdk.sh ==="
echo "Launching Claude to audit plugin SDK and create PRD(s)..."
echo ""

echo "$PROMPT" | bash "$SCRIPT_DIR/run-prompt.sh"
