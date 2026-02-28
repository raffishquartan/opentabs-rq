#!/bin/bash
# perfect-sdk.sh — Invoke Claude to audit the plugin SDK and create PRD(s) to fix bugs and improve quality.
#
# Usage: bash .ralph/perfect-sdk.sh
#
# This script launches a single Claude session (default model) that:
#   1. Reads the plugin SDK source code and tests (platform/plugin-sdk/)
#   2. Identifies bugs in browser-context utilities (DOM, fetch, storage, timing)
#   3. Checks for CSP compatibility, same-origin issues, and browser API edge cases
#   4. Uses the ralph skill to generate PRD(s) targeting the root monorepo
#
# The ralph daemon (.ralph/ralph.sh) must be running to pick up the PRDs.
# This script does NOT start ralph — it only creates the PRD files.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

read -r -d '' PROMPT <<'PROMPT_EOF' || true
You are auditing the OpenTabs Plugin SDK (platform/plugin-sdk/) — a library that runs entirely in browser page context, injected as IIFEs into web applications. Your job is to find bugs, browser compatibility issues, CSP violations, same-origin edge cases, and quality problems in the SDK's utilities and base classes, then use the ralph skill to create PRD(s) to fix them.

This is a browser-context audit. Unlike server-side Node.js code, every function in this SDK runs inside a web page's main thread. Issues like SecurityError from blocked storage, CSP-restricted fetch, MutationObserver edge cases, and same-origin policy violations are first-class concerns.

## Step 1: Read the rules and understand the SDK

1. Read CLAUDE.md (root) — overall platform architecture, key concepts, commands, code quality rules
2. Read platform/plugin-sdk/CLAUDE.md — SDK public API, lifecycle hooks, utilities, structured errors, Zod schema rules
3. Read platform/browser-extension/CLAUDE.md — how the extension injects adapters and dispatches tool calls (the SDK's runtime environment)

Understanding both the SDK's API and its runtime injection context is critical for this audit.

## Step 2: Read ALL SDK source files

Read every source file thoroughly. Do not skim — read every function, every error path, every edge case handler.

### Core SDK (read in order):

1. **platform/plugin-sdk/src/index.ts** — OpenTabsPlugin base class, defineTool, defineResource, definePrompt factories, ToolHandlerContext, all exports
2. **platform/plugin-sdk/src/errors.ts** — ToolError class with structured metadata, factory methods (auth, notFound, rateLimited, validation, timeout, internal)
3. **platform/plugin-sdk/src/dom.ts** — DOM utilities (waitForSelector, waitForSelectorRemoval, querySelectorAll, getTextContent, observeDOM)
4. **platform/plugin-sdk/src/fetch.ts** — fetch utilities (fetchFromPage, fetchJSON, postJSON, putJSON, patchJSON, deleteJSON)
5. **platform/plugin-sdk/src/storage.ts** — storage utilities (getLocalStorage, setLocalStorage, getSessionStorage, setSessionStorage, removeLocalStorage, removeSessionStorage, getCookie)
6. **platform/plugin-sdk/src/page-state.ts** — page state utilities (getPageGlobal, getCurrentUrl, getPageTitle)
7. **platform/plugin-sdk/src/timing.ts** — timing utilities (retry, sleep, waitUntil)
8. **platform/plugin-sdk/src/log.ts** — structured logging API (log.debug, log.info, log.warn, log.error)
9. **platform/plugin-sdk/src/lucide-icon-names.ts** — icon name constants

### SDK tests (read all):

10. **platform/plugin-sdk/src/index.test.ts**
11. **platform/plugin-sdk/src/errors.test.ts**
12. **platform/plugin-sdk/src/dom.test.ts**
13. **platform/plugin-sdk/src/fetch.test.ts**
14. **platform/plugin-sdk/src/storage.test.ts**
15. **platform/plugin-sdk/src/page-state.test.ts**
16. **platform/plugin-sdk/src/timing.test.ts**
17. **platform/plugin-sdk/src/log.test.ts**

### Build and config:

18. **platform/plugin-sdk/package.json** — exports, dependencies
19. **platform/plugin-sdk/tsconfig.json** — TypeScript config
20. **platform/plugin-sdk/tsconfig.test.json** — test TypeScript config

## Step 3: Audit for browser-context-specific issues

### DOM utilities (dom.ts)
- **MutationObserver edge cases**: Does waitForSelector handle the case where the element already exists before the observer is set up? Race between checking and observing?
- **Disconnected observers**: Are MutationObservers always disconnected on timeout, on success, and on abort?
- **Memory leaks**: Do observeDOM cleanup functions properly disconnect observers and remove references?
- **Selector validity**: What happens with invalid CSS selectors? Does the code handle DOMException gracefully?
- **Shadow DOM**: Do selectors work across shadow boundaries? Is this documented or handled?
- **Detached documents**: What if the document is in an unexpected state?

### Fetch utilities (fetch.ts)
- **CSP restrictions**: Does fetchFromPage work when the page has a restrictive Content-Security-Policy (connect-src)?
- **AbortSignal handling**: Are timeouts and aborts properly cleaned up? Are there leaked AbortController references?
- **Credentials behavior**: Is credentials:'include' correct for all use cases? What about cross-origin requests from the page context?
- **Error mapping**: Does the ToolError mapping from HTTP status codes cover all common cases? Are network errors (TypeError from fetch) handled distinctly from HTTP errors?
- **Response body handling**: What if the response has no body? What if JSON parsing fails with a non-JSON content type?
- **Redirect behavior**: How are redirects handled? Does follow/manual mode matter?

### Storage utilities (storage.ts)
- **SecurityError handling**: Are all storage access patterns wrapped in try-catch for SecurityError (third-party contexts, iframe sandboxing, privacy mode)?
- **QuotaExceededError**: Is setLocalStorage safe when storage is full?
- **Cookie parsing edge cases**: Does getCookie handle cookies with = in values, empty values, whitespace variations, or URI-encoded content correctly?
- **Null vs undefined**: Are return types consistent (null for missing, not undefined)?

### Timing utilities (timing.ts)
- **Retry abort handling**: Does retry properly stop when the AbortSignal fires? Are there race conditions between the abort and the retry delay?
- **waitUntil cleanup**: Are polling intervals always cleared on success, timeout, and abort?
- **sleep abort**: Can sleep be aborted early? Should it support AbortSignal?
- **Exponential backoff overflow**: Does the backoff calculation overflow for large maxAttempts values?

### Page state utilities (page-state.ts)
- **getPageGlobal safety**: Does deep property access handle non-object intermediates (e.g., `null.foo`, `"string".foo`)? Does it protect against prototype pollution paths?
- **Proxy traps**: What happens if a global property is a Proxy that throws on property access?

### Structured errors (errors.ts)
- **ToolError serialization**: Does ToolError serialize correctly through the IIFE → extension → MCP server pipeline? Are all fields preserved?
- **Factory method consistency**: Do all factory methods (auth, notFound, rateLimited, etc.) set the correct category, retryable, and retryAfterMs defaults?
- **Custom code handling**: Can custom error codes conflict with built-in codes?

### Logging (log.ts)
- **Circular reference handling**: Does safe serialization actually handle all edge cases (DOM nodes, WeakRef, SharedArrayBuffer)?
- **Runtime detection**: Does the log adapter correctly detect whether it's running in the adapter runtime vs standalone?
- **Message formatting**: Are args correctly formatted for both the MCP log path and the console fallback?

### Base class and factories (index.ts)
- **defineTool schema validation**: Are Zod schemas validated at definition time or only at invocation time? What happens with malformed schemas?
- **defineResource/definePrompt**: Are URI patterns and prompt argument schemas validated correctly?
- **Type exports**: Are all public types properly exported for plugin developers?

## Step 4: Audit test coverage and correctness

For each test file, check:
- Are the important edge cases from Step 3 tested?
- Are there tests that pass but verify the wrong thing (incorrect assertions)?
- Are there missing tests for error paths, timeout paths, and abort paths?
- Do tests properly mock browser APIs (localStorage, fetch, MutationObserver, document.cookie)?
- Are test mocks accurate representations of real browser behavior?

## Step 5: Create PRD(s) using the ralph skill

After completing the audit, use the skill tool to load the "ralph" skill, then follow its instructions to create PRD(s).

Key parameters for SDK PRDs:
- Target project: "OpenTabs Platform" (root monorepo)
- Do NOT set workingDirectory or qualityChecks (root monorepo uses defaults)
- Group related fixes by file to avoid merge conflicts (dom.ts fixes together, fetch.ts fixes together, etc.)
- All stories: e2eCheckpoint: false EXCEPT the final story if it touches behavior observable in E2E tests
- Always use small stories (1-3 files per story)
- Include repo-root-relative file paths and line numbers in the notes field
- Every story must have concrete, verifiable acceptance criteria
- Skip clarifying questions — this prompt provides all the context needed

Do NOT create stories for:
- Style preferences or alternative implementations
- Browser compatibility issues for browsers the project doesn't target (only Chromium is used via the extension)
- Theoretical issues with no reachable execution path
- Features that work correctly but could be done differently

DO create stories for:
- Real bugs with observable consequences in browser context
- Missing error handling that causes silent failures or crashes
- Resource leaks (MutationObserver not disconnected, timers not cleared, AbortController not cleaned up)
- SecurityError/QuotaExceededError handling gaps
- Race conditions between async operations
- Test coverage gaps for critical browser-context edge cases
- Incorrect test mocks that hide real bugs
- Dead or unreachable code
PROMPT_EOF

echo "=== perfect-sdk.sh ==="
echo "Launching Claude to audit plugin SDK and create PRD(s)..."
echo ""

echo "$PROMPT" | bash "$SCRIPT_DIR/run-prompt.sh"
