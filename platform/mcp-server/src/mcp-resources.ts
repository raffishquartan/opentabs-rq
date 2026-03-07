/**
 * MCP resource definitions for the OpenTabs server.
 *
 * Resources are static or dynamic documents that AI clients can fetch on demand
 * via `resources/read`. Unlike instructions (sent on every session), resources
 * are pull-based — clients discover them via `resources/list` and fetch content
 * when they need deeper context.
 *
 * Static resources return pre-built markdown content (guides, references).
 * The `opentabs://status` resource is dynamic — built from ServerState at read time.
 */

import type { ServerState } from './state.js';

/** A resource definition for MCP resources/list */
export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/** A resolved resource for MCP resources/read */
export interface ResolvedResource {
  uri: string;
  mimeType: string;
  text: string;
}

/** All registered resources */
const RESOURCES: ResourceDefinition[] = [
  {
    uri: 'opentabs://guide/quick-start',
    name: 'Quick Start Guide',
    description: 'Installation, configuration, and first tool call',
    mimeType: 'text/markdown',
  },
  {
    uri: 'opentabs://guide/plugin-development',
    name: 'Plugin Development Guide',
    description: 'Full guide to building OpenTabs plugins (SDK, patterns, conventions)',
    mimeType: 'text/markdown',
  },
  {
    uri: 'opentabs://guide/troubleshooting',
    name: 'Troubleshooting Guide',
    description: 'Common errors and resolution steps',
    mimeType: 'text/markdown',
  },
  {
    uri: 'opentabs://reference/sdk-api',
    name: 'SDK API Reference',
    description: 'Plugin SDK API reference (utilities, errors, lifecycle hooks)',
    mimeType: 'text/markdown',
  },
  {
    uri: 'opentabs://reference/cli',
    name: 'CLI Reference',
    description: 'CLI command reference (opentabs, opentabs-plugin)',
    mimeType: 'text/markdown',
  },
  {
    uri: 'opentabs://reference/browser-tools',
    name: 'Browser Tools Reference',
    description: 'All browser tools organized by category',
    mimeType: 'text/markdown',
  },
  {
    uri: 'opentabs://status',
    name: 'Server Status',
    description: 'Live server state: loaded plugins, extension connectivity, tab states',
    mimeType: 'application/json',
  },
];

/** Resource URI → definition for O(1) lookup */
const RESOURCE_MAP = new Map(RESOURCES.map(r => [r.uri, r]));

// ---------------------------------------------------------------------------
// Static resource content
// ---------------------------------------------------------------------------

const QUICK_START_CONTENT = `# OpenTabs Quick Start Guide

## What is OpenTabs?

OpenTabs is a platform that gives AI agents access to web applications through the user's authenticated browser session. It consists of:

- **MCP Server** — runs on localhost, serves tools to AI clients via Streamable HTTP
- **Chrome Extension** — injects plugin adapters into matching browser tabs, relays tool calls
- **Plugin SDK** — allows anyone to create plugins as standalone npm packages

When connected, your AI client gets browser tools (tab management, screenshots, DOM interaction, network capture) and plugin tools (e.g., \`slack_send_message\`, \`github_list_repos\`) that operate in the user's authenticated context.

## Installation

\`\`\`bash
npm install -g @opentabs-dev/cli
\`\`\`

## Starting the Server

\`\`\`bash
opentabs start
\`\`\`

On first run, this:
1. Creates \`~/.opentabs/\` (config, logs, extension files)
2. Generates a WebSocket auth secret at \`~/.opentabs/extension/auth.json\`
3. Prints MCP client configuration blocks for Claude Code, Cursor, and Windsurf
4. Starts the MCP server on \`http://127.0.0.1:9515/mcp\`

To re-display the configuration blocks later:

\`\`\`bash
opentabs start --show-config
\`\`\`

## Loading the Chrome Extension

1. Open \`chrome://extensions/\` in Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select \`~/.opentabs/extension\`

The extension icon appears in the toolbar. Click it to open the side panel showing plugin states and tool permissions.

## Configuring Your MCP Client

Get the auth secret:

\`\`\`bash
opentabs config show --json --show-secret | jq -r .secret
\`\`\`

### Claude Code

CLI method (recommended):

\`\`\`bash
claude mcp add --transport http opentabs http://127.0.0.1:9515/mcp \\
  --header "Authorization: Bearer YOUR_SECRET_HERE"
\`\`\`

Or merge into \`~/.claude.json\`:

\`\`\`json
{
  "mcpServers": {
    "opentabs": {
      "type": "streamable-http",
      "url": "http://127.0.0.1:9515/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_SECRET_HERE"
      }
    }
  }
}
\`\`\`

### Cursor

Add to \`.cursor/mcp.json\`:

\`\`\`json
{
  "mcpServers": {
    "opentabs": {
      "type": "http",
      "url": "http://127.0.0.1:9515/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_SECRET_HERE"
      }
    }
  }
}
\`\`\`

### Windsurf

Add to \`~/.codeium/windsurf/mcp_config.json\`:

\`\`\`json
{
  "mcpServers": {
    "opentabs": {
      "serverUrl": "http://127.0.0.1:9515/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_SECRET_HERE"
      }
    }
  }
}
\`\`\`

### OpenCode

Add to \`opencode.json\` in the project root:

\`\`\`json
{
  "mcp": {
    "opentabs": {
      "type": "remote",
      "url": "http://127.0.0.1:9515/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_SECRET_HERE"
      }
    }
  }
}
\`\`\`

## Installing a Plugin

\`\`\`bash
opentabs plugin search              # Browse available plugins
opentabs plugin install <name>      # Install (e.g., opentabs plugin install slack)
\`\`\`

After installing, open the target web app in Chrome (e.g., \`app.slack.com\` for Slack). The extension detects the matching tab and loads the plugin adapter.

## Plugin Review Flow

Plugins start with permission \`'off'\` and must be reviewed before use. When you call a tool on an unreviewed plugin, the error response guides you through the review:

1. Call \`plugin_inspect\` with the plugin name to retrieve the adapter source code and a review token
2. Review the code for security (the response includes review guidance)
3. If the code is safe, call \`plugin_mark_reviewed\` with the review token and desired permission (\`'ask'\` or \`'auto'\`)
4. The plugin is now active — its tools are available

When a plugin updates to a new version, its permission resets to \`'off'\` and requires re-review.

## Permission Model

Every tool has a 3-state permission:

| Permission | Behavior |
|------------|----------|
| \`'off'\` | Disabled — tool call returns an error |
| \`'ask'\` | Requires human approval via the side panel dialog |
| \`'auto'\` | Executes immediately without user confirmation |

Configure permissions via CLI:

\`\`\`bash
opentabs config set plugin-permission.<plugin> ask
opentabs config set tool-permission.<plugin>.<tool> auto
\`\`\`

To bypass all permission checks (development only):

\`\`\`bash
OPENTABS_DANGEROUSLY_SKIP_PERMISSIONS=1 opentabs start
\`\`\`

## Available Tool Categories

### Plugin Tools (\`<plugin>_<tool>\`)
Execute inside the web page context using the user's authenticated browser session. Each plugin exposes domain-specific tools (e.g., \`slack_send_message\`, \`github_create_issue\`).

### Browser Tools (\`browser_*\`) — 40 built-in tools
General-purpose tools organized by category:
- **Tab Management** — open, close, list, switch tabs
- **Content Retrieval** — read page content, HTML, take screenshots
- **DOM Interaction** — click elements, type text, query selectors
- **Scroll & Navigation** — scroll, navigate, go back/forward
- **Storage & Cookies** — read/write localStorage, sessionStorage, cookies
- **Network Capture** — capture and inspect network requests, WebSocket frames, HAR export
- **Console** — read browser console logs
- **Site Analysis** — comprehensive analysis of a web page for plugin development

### Extension Tools (\`extension_*\`)
Diagnostics: extension state, logs, adapter injection status, WebSocket connectivity.

## Multi-Tab Targeting

When multiple tabs match a plugin, use \`plugin_list_tabs\` to discover available tabs and their IDs. Pass the optional \`tabId\` parameter to any plugin tool to target a specific tab. Without \`tabId\`, the platform auto-selects the best-ranked tab.

## Verifying the Setup

\`\`\`bash
opentabs status    # Check server, extension, and plugin status
opentabs doctor    # Run diagnostics and suggest fixes
\`\`\`

From your AI client, you can also:
1. Fetch \`opentabs://status\` to get a JSON snapshot of the server state
2. Call \`extension_get_state\` to verify the Chrome extension is connected
3. Call \`plugin_list_tabs\` to see which plugin tabs are ready
`;

const PLUGIN_DEVELOPMENT_CONTENT = `# Plugin Development Guide

## Architecture

OpenTabs plugins run **in the browser page context**, not on the server. The MCP server discovers plugins, but tool execution happens inside the web page via an adapter IIFE injected by the Chrome extension. This means plugin code has full access to the page's DOM, JavaScript globals, cookies, localStorage, and authenticated fetch requests.

**Flow:** AI client → MCP server → Chrome extension (WebSocket) → adapter IIFE (page context) → tool handler → result back through the chain.

## Plugin Structure

A plugin is a standalone npm package with this structure:

\`\`\`
my-plugin/
├── package.json         # Must include "opentabs" field
├── src/
│   ├── plugin.ts        # OpenTabsPlugin subclass (entry point)
│   └── tools/
│       ├── get-data.ts  # One file per tool (convention)
│       └── send-msg.ts
├── dist/                # Built by opentabs-plugin build
│   ├── adapter.iife.js  # Injected into matching browser tabs
│   └── tools.json       # Tool schemas for MCP registration
└── tsconfig.json
\`\`\`

### package.json

\`\`\`json
{
  "name": "@scope/opentabs-plugin-myapp",
  "version": "1.0.0",
  "opentabs": {
    "name": "myapp",
    "displayName": "My App",
    "description": "Tools for My App",
    "urlPatterns": ["*://myapp.com/*"]
  },
  "main": "src/plugin.ts",
  "scripts": {
    "build": "opentabs-plugin build"
  },
  "dependencies": {
    "@opentabs-dev/plugin-sdk": "latest"
  },
  "devDependencies": {
    "@opentabs-dev/plugin-tools": "latest"
  }
}
\`\`\`

The \`opentabs.name\` field is the plugin identifier (lowercase, alphanumeric + hyphens). It becomes the tool name prefix (e.g., \`myapp_get_data\`).

## OpenTabsPlugin Base Class

Every plugin extends \`OpenTabsPlugin\` and exports an instance:

\`\`\`typescript
import { OpenTabsPlugin } from '@opentabs-dev/plugin-sdk';
import type { ToolDefinition } from '@opentabs-dev/plugin-sdk';
import { getDataTool } from './tools/get-data.js';
import { sendMsgTool } from './tools/send-msg.js';

class MyPlugin extends OpenTabsPlugin {
  readonly name = 'myapp';
  readonly displayName = 'My App';
  readonly description = 'Tools for My App';
  readonly urlPatterns = ['*://myapp.com/*'];
  readonly tools: ToolDefinition[] = [getDataTool, sendMsgTool];

  async isReady(): Promise<boolean> {
    // Return true when the user is authenticated and the app is loaded
    return document.querySelector('.logged-in-indicator') !== null;
  }
}

export default new MyPlugin();
\`\`\`

### Required Members

| Member | Type | Purpose |
|--------|------|---------|
| \`name\` | \`string\` | Unique identifier (lowercase alphanumeric + hyphens) |
| \`displayName\` | \`string\` | Human-readable name shown in side panel |
| \`description\` | \`string\` | Brief plugin description |
| \`urlPatterns\` | \`string[]\` | Chrome match patterns for tab injection |
| \`tools\` | \`ToolDefinition[]\` | Array of tool definitions |
| \`isReady()\` | \`() => Promise<boolean>\` | Readiness probe — returns true when tab is ready for tool calls |

### Tab State Machine

| State | Condition |
|-------|-----------|
| \`closed\` | No browser tab matches the plugin's URL patterns |
| \`unavailable\` | Tab matches URL patterns but \`isReady()\` returns false |
| \`ready\` | Tab matches URL patterns and \`isReady()\` returns true |

## defineTool Factory

Each tool is defined with \`defineTool\`, which provides type inference:

\`\`\`typescript
import { z } from 'zod';
import { defineTool, fetchJSON } from '@opentabs-dev/plugin-sdk';
import type { ToolHandlerContext } from '@opentabs-dev/plugin-sdk';

export const getDataTool = defineTool({
  name: 'get_data',
  displayName: 'Get Data',
  description: 'Retrieves data from the app. Returns the matching records.',
  summary: 'Retrieve app data',
  icon: 'database',
  group: 'Data',
  input: z.object({
    query: z.string().describe('Search query string'),
    limit: z.number().int().min(1).max(100).default(25).describe('Max results to return'),
  }),
  output: z.object({
    results: z.array(z.object({
      id: z.string(),
      title: z.string(),
    })),
    total: z.number(),
  }),
  async handle(params, context?: ToolHandlerContext) {
    const data = await fetchJSON<{ items: Array<{ id: string; title: string }>; total: number }>(
      \`/api/data?q=\${encodeURIComponent(params.query)}&limit=\${params.limit}\`
    );
    return { results: data?.items ?? [], total: data?.total ?? 0 };
  },
});
\`\`\`

### ToolDefinition Fields

| Field | Required | Description |
|-------|----------|-------------|
| \`name\` | Yes | Tool name (auto-prefixed with plugin name) |
| \`displayName\` | No | Human-readable name for side panel (auto-derived from name if omitted) |
| \`description\` | Yes | Shown to AI agents — be specific and include return value info |
| \`summary\` | No | Short UI summary (falls back to description) |
| \`icon\` | No | Lucide icon name in kebab-case (defaults to \`wrench\`) |
| \`group\` | No | Visual grouping in the side panel |
| \`input\` | Yes | Zod object schema for parameters |
| \`output\` | Yes | Zod schema for return value |
| \`handle\` | Yes | Async function — runs in page context. Second arg is optional \`ToolHandlerContext\` |

### Progress Reporting

Long-running tools can report progress via the optional \`context\` parameter:

\`\`\`typescript
async handle(params, context?: ToolHandlerContext) {
  const items = await getItemList();
  for (let i = 0; i < items.length; i++) {
    context?.reportProgress({ progress: i + 1, total: items.length, message: \`Processing \${items[i].name}\` });
    await processItem(items[i]);
  }
  return { processed: items.length };
}
\`\`\`

## SDK Utilities Reference

All utilities are imported from \`@opentabs-dev/plugin-sdk\`. They run in the page context.

### DOM

| Function | Signature | Description |
|----------|-----------|-------------|
| \`waitForSelector\` | \`<T extends Element>(selector, opts?) → Promise<T>\` | Waits for element to appear (MutationObserver, default 10s timeout) |
| \`waitForSelectorRemoval\` | \`(selector, opts?) → Promise<void>\` | Waits for element to be removed (default 10s timeout) |
| \`querySelectorAll\` | \`<T extends Element>(selector) → T[]\` | Returns real array instead of NodeList |
| \`getTextContent\` | \`(selector) → string \\| null\` | Trimmed textContent of first match |
| \`observeDOM\` | \`(selector, callback, opts?) → () => void\` | MutationObserver on element, returns cleanup function |

### Fetch

All fetch utilities use \`credentials: 'include'\` to leverage the page's authenticated session.

| Function | Signature | Description |
|----------|-----------|-------------|
| \`fetchFromPage\` | \`(url, init?) → Promise<Response>\` | Fetch with session cookies, 30s timeout, ToolError on non-ok |
| \`fetchJSON\` | \`<T>(url, init?, schema?) → Promise<T>\` | Fetch + JSON parse. Optional Zod schema validation |
| \`postJSON\` | \`<T>(url, body, init?, schema?) → Promise<T>\` | POST with JSON body + parse response |
| \`putJSON\` | \`<T>(url, body, init?, schema?) → Promise<T>\` | PUT with JSON body + parse response |
| \`patchJSON\` | \`<T>(url, body, init?, schema?) → Promise<T>\` | PATCH with JSON body + parse response |
| \`deleteJSON\` | \`<T>(url, init?, schema?) → Promise<T>\` | DELETE + parse response |
| \`postForm\` | \`<T>(url, body, init?, schema?) → Promise<T>\` | POST URL-encoded form (Record<string,string>) |
| \`postFormData\` | \`<T>(url, body, init?, schema?) → Promise<T>\` | POST multipart/form-data (FormData) |

### Storage

| Function | Signature | Description |
|----------|-----------|-------------|
| \`getLocalStorage\` | \`(key) → string \\| null\` | Safe localStorage read (null on SecurityError) |
| \`setLocalStorage\` | \`(key, value) → void\` | Safe localStorage write |
| \`removeLocalStorage\` | \`(key) → void\` | Safe localStorage remove |
| \`getSessionStorage\` | \`(key) → string \\| null\` | Safe sessionStorage read |
| \`setSessionStorage\` | \`(key, value) → void\` | Safe sessionStorage write |
| \`removeSessionStorage\` | \`(key) → void\` | Safe sessionStorage remove |
| \`getCookie\` | \`(name) → string \\| null\` | Parse cookie by name from document.cookie |

### Page State

| Function | Signature | Description |
|----------|-----------|-------------|
| \`getPageGlobal\` | \`(path) → unknown\` | Safe deep property access on globalThis via dot-notation |
| \`getCurrentUrl\` | \`() → string\` | Returns window.location.href |
| \`getPageTitle\` | \`() → string\` | Returns document.title |

### Timing

| Function | Signature | Description |
|----------|-----------|-------------|
| \`retry\` | \`<T>(fn, opts?) → Promise<T>\` | Retry with configurable attempts (3), delay (1s), backoff, AbortSignal |
| \`sleep\` | \`(ms, opts?) → Promise<void>\` | Promisified setTimeout with optional AbortSignal |
| \`waitUntil\` | \`(predicate, opts?) → Promise<void>\` | Poll predicate at interval (200ms) until true, timeout (10s) |

### Logging

| Function | Description |
|----------|-------------|
| \`log.debug(message, ...args)\` | Debug level |
| \`log.info(message, ...args)\` | Info level |
| \`log.warn(message, ...args)\` | Warning level |
| \`log.error(message, ...args)\` | Error level |

Log entries flow from the page context through the extension to the MCP server and connected clients. Falls back to \`console\` methods outside the adapter runtime.

## ToolError Factories

Use static factory methods for structured errors. The dispatch chain propagates metadata (category, retryable, retryAfterMs) to AI clients.

| Factory | Signature | Category | Retryable |
|---------|-----------|----------|-----------|
| \`ToolError.auth\` | \`(message, code?) → ToolError\` | \`auth\` | No |
| \`ToolError.notFound\` | \`(message, code?) → ToolError\` | \`not_found\` | No |
| \`ToolError.rateLimited\` | \`(message, retryAfterMs?, code?) → ToolError\` | \`rate_limit\` | Yes |
| \`ToolError.validation\` | \`(message, code?) → ToolError\` | \`validation\` | No |
| \`ToolError.timeout\` | \`(message, code?) → ToolError\` | \`timeout\` | Yes |
| \`ToolError.internal\` | \`(message, code?) → ToolError\` | \`internal\` | No |

\`\`\`typescript
import { ToolError, fetchJSON } from '@opentabs-dev/plugin-sdk';

// Auth errors are automatically thrown by fetchJSON on 401/403
// For manual auth checks:
const token = getPageGlobal('app.auth.token') as string | undefined;
if (!token) throw ToolError.auth('User is not logged in');

// For domain-specific errors with custom codes:
throw ToolError.notFound('Channel not found', 'CHANNEL_NOT_FOUND');
throw ToolError.rateLimited('Slow down', 5000, 'SLACK_RATE_LIMITED');
\`\`\`

## Zod Schema Rules

Schemas are serialized to JSON Schema via \`z.toJSONSchema()\` for MCP registration. Follow these rules:

1. **Never use \`.transform()\`** — transforms cannot be represented in JSON Schema. Normalize input in the handler.
2. **Avoid \`.pipe()\`, \`.preprocess()\`, and effects** — these are runtime-only and break serialization.
3. **\`.refine()\` callbacks must never throw** — Zod 4 runs refine even on invalid base values. Wrap throwing code in try-catch.
4. **Use \`.describe()\` on every field** — descriptions are shown to AI agents in the tool schema.
5. **Keep schemas declarative** — primitives, objects, arrays, unions, literals, enums, optional, default.

## Lifecycle Hooks

Optional methods on \`OpenTabsPlugin\` — implement only what you need:

| Hook | Signature | When Called |
|------|-----------|------------|
| \`onActivate\` | \`() → void\` | After adapter registered on \`globalThis.__openTabs.adapters\` |
| \`onDeactivate\` | \`() → void\` | Before adapter removal (fires before \`teardown\`) |
| \`onNavigate\` | \`(url: string) → void\` | On in-page URL changes (pushState, replaceState, popstate, hashchange) |
| \`onToolInvocationStart\` | \`(toolName: string) → void\` | Before each \`tool.handle()\` |
| \`onToolInvocationEnd\` | \`(toolName: string, success: boolean, durationMs: number) → void\` | After each \`tool.handle()\` |
| \`teardown\` | \`() → void\` | Before re-injection on plugin update |

Errors in hooks are caught and logged — they do not affect tool execution.

## isReady() Polling Pattern

The extension polls \`isReady()\` to determine tab state. Common patterns:

\`\`\`typescript
// DOM-based: check for a logged-in indicator
async isReady(): Promise<boolean> {
  return document.querySelector('[data-testid="user-menu"]') !== null;
}

// Global-based: check for auth token in window globals
async isReady(): Promise<boolean> {
  return getPageGlobal('app.auth.token') !== undefined;
}

// API-based: verify session with a lightweight request
async isReady(): Promise<boolean> {
  try {
    await fetchJSON('/api/me');
    return true;
  } catch {
    return false;
  }
}
\`\`\`

## Auth Token Extraction

Plugins extract auth from the page — never ask users for credentials.

\`\`\`typescript
// From window globals (Slack pattern)
const token = getPageGlobal('TS.boot_data.api_token') as string | undefined;
if (!token) throw ToolError.auth('Not logged in');

// From localStorage
const token = getLocalStorage('auth_token');
if (!token) throw ToolError.auth('No auth token found');

// From cookies (session-based auth)
const session = getCookie('session_id');
if (!session) throw ToolError.auth('No session cookie');

// Cache on globalThis to avoid repeated extraction
const CACHE_KEY = '__opentabs_myapp_token';
function getToken(): string {
  const cached = (globalThis as Record<string, unknown>)[CACHE_KEY] as string | undefined;
  if (cached) return cached;
  const token = getPageGlobal('app.token') as string | undefined;
  if (!token) throw ToolError.auth('Not authenticated');
  (globalThis as Record<string, unknown>)[CACHE_KEY] = token;
  return token;
}
\`\`\`

## Build and Test Workflow

\`\`\`bash
# Build the plugin (generates dist/adapter.iife.js and dist/tools.json)
npx opentabs-plugin build
# Or if installed globally:
opentabs-plugin build

# The build command notifies the running MCP server via POST /reload
# No server restart needed — plugin changes are picked up automatically
\`\`\`

### Testing During Development

1. Build the plugin: \`opentabs-plugin build\`
2. Open the target web app in Chrome
3. Verify plugin loaded: call \`plugin_list_tabs\` from your AI client
4. Test a tool: call any plugin tool (e.g., \`myapp_get_data\`)
5. Check logs: call \`extension_get_logs\` to see adapter injection and tool execution logs

### Scaffolding a New Plugin

\`\`\`bash
npx @opentabs-dev/create-plugin
# Or with the CLI installed:
opentabs plugin create
\`\`\`

## Publishing to npm

\`\`\`json
{
  "name": "@scope/opentabs-plugin-myapp",
  "opentabs": {
    "name": "myapp",
    "displayName": "My App",
    "description": "Tools for My App",
    "urlPatterns": ["*://myapp.com/*"]
  }
}
\`\`\`

Package naming convention: \`opentabs-plugin-<name>\` or \`@scope/opentabs-plugin-<name>\`. The MCP server auto-discovers packages matching these patterns in global node_modules.

\`\`\`bash
npm publish
# Users install with:
opentabs plugin install myapp
\`\`\`

## Common Patterns

### API Wrapper

\`\`\`typescript
const API_BASE = '/api/v1';

async function apiGet<T>(path: string): Promise<T> {
  const result = await fetchJSON<T>(\`\${API_BASE}\${path}\`);
  if (result === undefined) throw ToolError.internal(\`Unexpected empty response from \${path}\`);
  return result;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const result = await postJSON<T>(\`\${API_BASE}\${path}\`, body);
  if (result === undefined) throw ToolError.internal(\`Unexpected empty response from \${path}\`);
  return result;
}
\`\`\`

### Waiting for App State

\`\`\`typescript
import { waitForSelector, waitUntil, getPageGlobal } from '@opentabs-dev/plugin-sdk';

// Wait for the app to finish loading before executing
await waitForSelector('.app-loaded');

// Wait for a specific global to be set
await waitUntil(() => getPageGlobal('app.initialized') === true);
\`\`\`

### Retrying Flaky Operations

\`\`\`typescript
import { retry, ToolError } from '@opentabs-dev/plugin-sdk';

const result = await retry(
  () => fetchJSON<Data>('/api/flaky-endpoint'),
  { maxAttempts: 3, delay: 1000, backoff: true }
);
\`\`\`

## Core Principle: APIs Not DOM

Every tool must use the web app's own APIs — the same endpoints the web app calls internally. DOM scraping is never acceptable as a tool implementation strategy: it is fragile (breaks on UI changes), limited (only sees what's rendered), and slow (requires waiting for DOM mutations).

When an API is hard to discover, invest time reverse-engineering network traffic rather than falling back to DOM. The only acceptable DOM uses are:
- **\`isReady()\`** — checking auth indicators (e.g., a logged-in avatar)
- **URL hash navigation** — changing views via \`window.location.hash\`
- **Last-resort compose flows** — when no API exists for creating content (extremely rare)

## Token Persistence

Module-level variables (\`let cachedAuth = null\`) are reset when the Chrome extension reloads and re-injects the adapter IIFE. If the host app has already deleted the token from localStorage by this point, the plugin becomes unavailable.

Persist auth tokens to \`globalThis.__openTabs.tokenCache.<pluginName>\`, which survives adapter re-injection (the page itself is not reloaded — only the IIFE is re-executed).

\`\`\`typescript
const getPersistedToken = (): string | null => {
  try {
    const ns = (globalThis as Record<string, unknown>).__openTabs as
      | Record<string, unknown>
      | undefined;
    const cache = ns?.tokenCache as
      | Record<string, string | undefined>
      | undefined;
    return cache?.myPlugin ?? null;
  } catch {
    return null;
  }
};

const setPersistedToken = (token: string): void => {
  try {
    const g = globalThis as Record<string, unknown>;
    if (!g.__openTabs) g.__openTabs = {};
    const ns = g.__openTabs as Record<string, unknown>;
    if (!ns.tokenCache) ns.tokenCache = {};
    const cache = ns.tokenCache as Record<string, string | undefined>;
    cache.myPlugin = token;
  } catch {}
};

const clearPersistedToken = (): void => {
  try {
    const ns = (globalThis as Record<string, unknown>).__openTabs as
      | Record<string, unknown>
      | undefined;
    const cache = ns?.tokenCache as
      | Record<string, string | undefined>
      | undefined;
    if (cache) cache.myPlugin = undefined;
  } catch {}
};

// In getAuth():
const getAuth = (): Auth | null => {
  const persisted = getPersistedToken();
  if (persisted) return { token: persisted };

  const raw = readLocalStorage('token');
  if (!raw) return null;
  setPersistedToken(raw);
  return { token: raw };
};
\`\`\`

Always clear the persisted token on 401 responses to handle token rotation.

## Adapter Injection Timing

Adapters are injected at **two points** during page load:

1. **\`loading\`** — before page JavaScript runs. The adapter IIFE registers on \`globalThis.__openTabs\` and can read localStorage/cookies before the host app modifies them.
2. **\`complete\`** — after the page is fully loaded. The adapter is re-injected (idempotent) and \`isReady()\` is probed to determine tab state.

This means:
- \`isReady()\` may be called at both injection points. At \`loading\` time, page globals do not exist yet — return \`false\` gracefully. At \`complete\` time, everything is ready.
- Auth tokens from localStorage should be cached at \`loading\` time before the host app can delete them.

## Advanced Auth Patterns

### XHR/Fetch Interception

Some web apps use internal RPC endpoints or obfuscated API paths that are hard to discover via network capture. Monkey-patch \`XMLHttpRequest\` to intercept all API traffic and capture auth headers at runtime.

\`\`\`typescript
const origOpen = XMLHttpRequest.prototype.open;
const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
const origSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method: string, url: string) {
  (this as Record<string, unknown>)._url = url;
  (this as Record<string, unknown>)._method = method;
  return origOpen.apply(this, arguments as unknown as Parameters<typeof origOpen>);
};
XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string) {
  if (name.toLowerCase() === 'authorization') {
    setPersistedToken(value); // Capture auth header
  }
  return origSetHeader.apply(this, arguments as unknown as Parameters<typeof origSetHeader>);
};
\`\`\`

Install the interceptor at adapter load time to capture auth tokens from early boot requests. Store captured tokens on \`globalThis\` so they survive adapter re-injection.

### Cookie-Based Auth with CSRF

Many web apps use HttpOnly session cookies for auth but require a CSRF token for write operations. The CSRF token is typically in a non-HttpOnly cookie (e.g., \`csrftoken\`, \`sentry-sc\`).

\`\`\`typescript
const csrfToken = getCookie('csrftoken');
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': csrfToken ?? '',
  },
  body: JSON.stringify(payload),
  credentials: 'include', // HttpOnly cookies sent automatically
});
\`\`\`

Check \`window.__initialData.csrfCookieName\` or similar bootstrap globals to discover the cookie name. GET requests work without the CSRF token.

### Opaque Auth Headers

Some apps compute cryptographic auth tokens via obfuscated JavaScript. These tokens cannot be generated — only captured and replayed. Use the XHR interceptor pattern above to capture them, then implement a polling wait:

\`\`\`typescript
const waitForToken = async (): Promise<string> => {
  for (let i = 0; i < 50; i++) {
    const token = getPersistedToken();
    if (token) return token;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw ToolError.auth('Auth token not captured — try refreshing the page');
};
\`\`\`

If a write operation returns 200 but the action does not take effect, the cryptographic token may be missing or stale. Omit the tool rather than shipping one that silently fails.

## CSP Considerations

The adapter IIFE bypasses the page's Content Security Policy via file-based injection (\`chrome.scripting.executeScript({ files: [...] })\`). Plugin code runs as extension-origin code and is not subject to inline script restrictions.

**Trusted Types**: Some pages enforce Trusted Types CSP, which blocks \`innerHTML\`, \`outerHTML\`, and \`insertAdjacentHTML\`. If you need to extract text from HTML strings, use regex instead:

\`\`\`typescript
const text = html.replace(/<[^>]+>/g, '');
\`\`\`
`;

const TROUBLESHOOTING_CONTENT = `# Troubleshooting Guide

Common errors when using OpenTabs, their causes, and resolution steps.

## Quick Diagnosis

Before diving into specific errors, run these diagnostic commands:

\`\`\`bash
opentabs status      # Server, extension, and plugin state
opentabs doctor      # Comprehensive setup diagnostics
\`\`\`

From your AI client:
- Call \`extension_get_state\` — extension health and WebSocket status
- Call \`plugin_list_tabs\` — per-plugin tab readiness
- Fetch \`opentabs://status\` — full server state snapshot

## Error Reference

### Extension Not Connected

**Error:** \`Extension not connected. Please ensure the OpenTabs Chrome extension is running.\`

**Cause:** The Chrome extension WebSocket connection to the MCP server is not active.

**Resolution:**
1. Verify server is running: \`opentabs status\`
2. Check extension is loaded: open \`chrome://extensions\`, verify OpenTabs is enabled
3. Reload extension: click the refresh icon on the OpenTabs card in \`chrome://extensions\`
4. Close and reopen the side panel
5. If still failing, run \`opentabs doctor\` for full diagnostics
6. Check for stale auth secret: \`opentabs config rotate-secret --confirm\`, then reload extension

### Tab Closed

**Error:** \`Tab closed: <message>\`

**Cause:** No browser tab matches the plugin's URL patterns, or the matching tab was closed during dispatch.

**Resolution:**
1. Open the target web application in Chrome
2. Verify the URL matches the plugin's \`urlPatterns\` (\`opentabs status\` shows patterns)
3. Call \`plugin_list_tabs\` to verify the tab is detected
4. Retry the tool call

### Tab Unavailable

**Error:** \`Tab unavailable: <message>\`

**Cause:** A tab matches the plugin's URL patterns but \`isReady()\` returns false. The user is likely not logged in.

**Resolution:**
1. Log into the web application in the matching browser tab
2. Refresh the tab (Ctrl+R / Cmd+R)
3. Wait 5 seconds for the readiness probe to complete
4. Call \`plugin_list_tabs\` to check the \`ready\` field
5. Retry the tool call

### Plugin Not Reviewed

**Error:** \`Plugin "<name>" (v<version>) has not been reviewed yet.\`

**Cause:** New plugins start with permission \`'off'\` and require a security review before use.

**Resolution (AI client flow):**
1. Call \`plugin_inspect({"plugin": "<name>"})\` — retrieves adapter source code + review token
2. Review the code for security concerns (data exfiltration, credential access, suspicious network requests)
3. Share findings with the user
4. If approved, call \`plugin_mark_reviewed({"plugin": "<name>", "version": "<ver>", "reviewToken": "<token>", "permission": "auto"})\`

**Resolution (side panel):** Open the side panel, click the shield icon on the plugin card, and confirm.

### Plugin Updated — Re-Review Required

**Error:** \`Plugin "<name>" has been updated from v<old> to v<new> and needs re-review.\`

**Cause:** Plugin version changed since last review. Permission resets to \`'off'\` on version change.

**Resolution:** Same as "Plugin Not Reviewed" above — call \`plugin_inspect\` and re-review.

### Tool Disabled

**Error:** \`Tool "<name>" is currently disabled. Ask the user to enable it in the OpenTabs side panel.\`

**Cause:** The tool's permission is set to \`'off'\`.

**Resolution:**
- User enables in side panel, OR
- \`opentabs config set tool-permission.<plugin>.<tool> ask\`
- \`opentabs config set plugin-permission.<plugin> ask\`

### Permission Denied by User

**Error:** \`Tool "<name>" was denied by the user.\`

**Cause:** Tool permission is \`'ask'\` and the user clicked "Deny" in the approval dialog.

**Resolution:** Do NOT retry immediately. Ask the user if they want to approve the action. To skip future prompts: \`opentabs config set tool-permission.<plugin>.<tool> auto\`

### Too Many Concurrent Dispatches

**Error:** \`Too many concurrent dispatches for plugin "<name>" (limit: 5). Wait for in-flight requests to complete.\`

**Cause:** More than 5 simultaneous tool calls to the same plugin.

**Resolution:** Wait 100-500ms for in-flight dispatches to complete, then retry.

### Dispatch Timeout

**Error:** \`Dispatch <label> timed out after <ms>ms\`

**Cause:** Tool handler did not respond within 30 seconds (or 5 minutes with progress reporting).

**Resolution:**
1. Check if the tab is responsive (take a screenshot, check console logs)
2. Refresh the target tab if unresponsive
3. For legitimately long operations, the plugin should use \`context.reportProgress()\` to extend the timeout
4. Break long operations into multiple tool calls

**Timeout rules:**
- Default: 30s per dispatch
- Progress resets the timer: each \`reportProgress()\` call extends by 30s
- Absolute ceiling: 5 minutes regardless of progress

### Schema Validation Error

**Error:** \`Invalid arguments for tool "<name>": - <field>: <issue>\`

**Cause:** Tool arguments don't match the JSON Schema defined by the plugin.

**Resolution:** Check the tool's input schema via \`tools/list\` and ensure all required fields are provided with correct types.

### Tool Not Found

**Error:** \`Tool <name> not found\`

**Cause:** The prefixed tool name doesn't exist in the registry. Plugin may not be installed.

**Resolution:**
1. Run \`opentabs status\` to verify the plugin is installed
2. Check the tool name (format: \`<plugin>_<tool>\`, e.g., \`slack_send_message\`)
3. Reinstall: \`opentabs plugin install <name>\`

### Rate Limited

**Error:** Tool response includes \`retryable: true\` and \`retryAfterMs\`.

**Cause:** The target web application's API returned HTTP 429.

**Resolution:** Wait the specified \`retryAfterMs\` before retrying. The \`ToolError.rateLimited\` metadata includes the exact delay.

## Diagnostic Tools Reference

| Tool | What it checks |
|------|---------------|
| \`extension_get_state\` | WebSocket status, registered plugins, active captures |
| \`extension_get_logs\` | Extension background script logs, injection warnings |
| \`extension_check_adapter({"plugin": "<name>"})\` | Adapter injection status, hash match, isReady() result |
| \`plugin_list_tabs\` | Per-plugin tab matching and readiness |
| \`browser_get_console_logs\` | Browser console errors (requires network capture) |
| \`opentabs status\` | Server uptime, extension connection, plugin states |
| \`opentabs doctor\` | Full setup diagnostics with fix suggestions |
| \`opentabs logs --plugin <name>\` | Server-side plugin-specific logs |
`;

const SDK_API_CONTENT = `# SDK API Reference

All exports from \`@opentabs-dev/plugin-sdk\`. Utilities run in the browser page context.

## Core Classes

### OpenTabsPlugin

Abstract base class for all plugins. Extend and export a singleton instance.

\`\`\`typescript
abstract class OpenTabsPlugin {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly urlPatterns: string[];
  abstract readonly tools: ToolDefinition[];
  abstract isReady(): Promise<boolean>;

  // Optional lifecycle hooks
  teardown?(): void;
  onActivate?(): void;
  onDeactivate?(): void;
  onNavigate?(url: string): void;
  onToolInvocationStart?(toolName: string): void;
  onToolInvocationEnd?(toolName: string, success: boolean, durationMs: number): void;
}
\`\`\`

### defineTool

Type-safe factory for tool definitions:

\`\`\`typescript
function defineTool<TInput, TOutput>(config: ToolDefinition<TInput, TOutput>): ToolDefinition<TInput, TOutput>
\`\`\`

### ToolDefinition

\`\`\`typescript
interface ToolDefinition<TInput, TOutput> {
  name: string;
  displayName?: string;
  description: string;
  summary?: string;
  icon?: LucideIconName;   // Lucide icon in kebab-case (default: 'wrench')
  group?: string;
  input: TInput;           // Zod object schema
  output: TOutput;         // Zod schema
  handle(params: z.infer<TInput>, context?: ToolHandlerContext): Promise<z.infer<TOutput>>;
}
\`\`\`

### ToolHandlerContext

\`\`\`typescript
interface ToolHandlerContext {
  reportProgress(opts: { progress?: number; total?: number; message?: string }): void;
}
\`\`\`

## DOM Utilities

| Function | Signature | Description |
|----------|-----------|-------------|
| \`waitForSelector\` | \`<T extends Element>(selector, opts?) => Promise<T>\` | Wait for element to appear (MutationObserver, default 10s) |
| \`waitForSelectorRemoval\` | \`(selector, opts?) => Promise<void>\` | Wait for element to be removed (default 10s) |
| \`querySelectorAll\` | \`<T extends Element>(selector) => T[]\` | Returns real array (not NodeList) |
| \`getTextContent\` | \`(selector) => string \\| null\` | Trimmed textContent of first match |
| \`observeDOM\` | \`(selector, callback, opts?) => () => void\` | MutationObserver, returns cleanup function |

Options: \`{ timeout?: number; signal?: AbortSignal }\` for wait functions. \`{ childList?: boolean; attributes?: boolean; subtree?: boolean }\` for observeDOM.

## Fetch Utilities

All fetch utilities use \`credentials: 'include'\` to leverage the page's authenticated session. Default timeout: 30s.

| Function | Signature | Description |
|----------|-----------|-------------|
| \`fetchFromPage\` | \`(url, init?) => Promise<Response>\` | Fetch with session cookies, throws ToolError on non-ok |
| \`fetchJSON\` | \`<T>(url, init?, schema?) => Promise<T>\` | GET + JSON parse. Optional Zod validation |
| \`postJSON\` | \`<T>(url, body, init?, schema?) => Promise<T>\` | POST JSON body + parse response |
| \`putJSON\` | \`<T>(url, body, init?, schema?) => Promise<T>\` | PUT JSON body + parse response |
| \`patchJSON\` | \`<T>(url, body, init?, schema?) => Promise<T>\` | PATCH JSON body + parse response |
| \`deleteJSON\` | \`<T>(url, init?, schema?) => Promise<T>\` | DELETE + parse response |
| \`postForm\` | \`<T>(url, body, init?, schema?) => Promise<T>\` | POST URL-encoded form (Record<string,string>) |
| \`postFormData\` | \`<T>(url, body, init?, schema?) => Promise<T>\` | POST multipart/form-data (FormData) |

When a Zod schema is passed as the last argument, the response is validated against it.

Helper functions:
- \`httpStatusToToolError(response, message)\` — maps HTTP status to ToolError category
- \`parseRetryAfterMs(value)\` — parses Retry-After header to milliseconds

Options extend \`RequestInit\` with \`{ timeout?: number }\`.

## Storage Utilities

| Function | Signature | Description |
|----------|-----------|-------------|
| \`getLocalStorage\` | \`(key) => string \\| null\` | Safe localStorage read (null on SecurityError) |
| \`setLocalStorage\` | \`(key, value) => void\` | Safe localStorage write |
| \`removeLocalStorage\` | \`(key) => void\` | Safe localStorage remove |
| \`getSessionStorage\` | \`(key) => string \\| null\` | Safe sessionStorage read |
| \`setSessionStorage\` | \`(key, value) => void\` | Safe sessionStorage write |
| \`removeSessionStorage\` | \`(key) => void\` | Safe sessionStorage remove |
| \`getCookie\` | \`(name) => string \\| null\` | Parse cookie by name from document.cookie |

All storage functions catch SecurityError (sandboxed iframes) and return null / no-op silently.

## Page State Utilities

| Function | Signature | Description |
|----------|-----------|-------------|
| \`getPageGlobal\` | \`(path) => unknown\` | Deep property access on globalThis via dot-notation (e.g., \`'app.auth.token'\`) |
| \`getCurrentUrl\` | \`() => string\` | Returns window.location.href |
| \`getPageTitle\` | \`() => string\` | Returns document.title |

\`getPageGlobal\` blocks access to \`__proto__\`, \`constructor\`, \`prototype\`.

## Timing Utilities

| Function | Signature | Description |
|----------|-----------|-------------|
| \`sleep\` | \`(ms, opts?) => Promise<void>\` | Promisified setTimeout. Options: \`{ signal?: AbortSignal }\` |
| \`retry\` | \`<T>(fn, opts?) => Promise<T>\` | Retry with configurable attempts, delay, backoff |
| \`waitUntil\` | \`(predicate, opts?) => Promise<void>\` | Poll predicate at interval until true |

**retry options:** \`{ maxAttempts?: 3, delay?: 1000, backoff?: false, maxDelay?: 30000, signal?: AbortSignal }\`

**waitUntil options:** \`{ interval?: 200, timeout?: 10000, signal?: AbortSignal }\`

## Logging

\`\`\`typescript
import { log } from '@opentabs-dev/plugin-sdk';

log.debug(message, ...args);
log.info(message, ...args);
log.warn(message, ...args);
log.error(message, ...args);
\`\`\`

Log entries route through the extension to the MCP server and connected clients. Falls back to \`console\` methods outside the adapter runtime. Args are safely serialized (handles circular refs, DOM nodes, functions).

## Error Handling

### ToolError

Structured error class with metadata for AI clients:

\`\`\`typescript
class ToolError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfterMs: number | undefined;
  readonly category: ErrorCategory | undefined;

  static auth(message, code?): ToolError;           // category: 'auth', not retryable
  static notFound(message, code?): ToolError;        // category: 'not_found', not retryable
  static rateLimited(message, retryAfterMs?, code?): ToolError;  // category: 'rate_limit', retryable
  static validation(message, code?): ToolError;      // category: 'validation', not retryable
  static timeout(message, code?): ToolError;         // category: 'timeout', retryable
  static internal(message, code?): ToolError;        // category: 'internal', not retryable
}
\`\`\`

\`ErrorCategory\`: \`'auth' | 'rate_limit' | 'not_found' | 'validation' | 'internal' | 'timeout'\`

## Lifecycle Hooks

Optional methods on \`OpenTabsPlugin\`:

| Hook | When Called |
|------|------------|
| \`onActivate()\` | After adapter registered on \`globalThis.__openTabs.adapters\` |
| \`onDeactivate()\` | Before adapter removal |
| \`teardown()\` | Before re-injection on plugin update |
| \`onNavigate(url)\` | On in-page URL changes (pushState, replaceState, popstate, hashchange) |
| \`onToolInvocationStart(toolName)\` | Before each tool handler call |
| \`onToolInvocationEnd(toolName, success, durationMs)\` | After each tool handler call |

Errors in hooks are caught and logged — they do not affect tool execution.

## Re-exports from @opentabs-dev/shared

| Export | Description |
|--------|-------------|
| \`ManifestTool\` | Tool metadata type for plugin manifests |
| \`Manifest\` | Complete plugin manifest type (\`PluginManifest\`) |
| \`validatePluginName(name)\` | Validates plugin name against \`NAME_REGEX\` and \`RESERVED_NAMES\` |
| \`validateUrlPattern(pattern)\` | Validates Chrome match patterns |
| \`NAME_REGEX\` | Regex for valid plugin names |
| \`RESERVED_NAMES\` | Set of reserved plugin names |
| \`LucideIconName\` | String literal union of valid Lucide icon names |
| \`LUCIDE_ICON_NAMES\` | Array of all valid Lucide icon names |
`;

const CLI_CONTENT = `# CLI Reference

## opentabs CLI

User-facing CLI for managing the OpenTabs platform.

### Core Commands

| Command | Description |
|---------|-------------|
| \`opentabs start [options]\` | Start the MCP server |
| \`opentabs stop [options]\` | Stop the background MCP server |
| \`opentabs status [options]\` | Show server status, extension connection, and plugin states |
| \`opentabs logs [options]\` | Show recent MCP server log output |
| \`opentabs audit [options]\` | Show recent tool invocation history |
| \`opentabs doctor [options]\` | Diagnose your OpenTabs setup |
| \`opentabs update\` | Update CLI to the latest version |

### start

\`\`\`bash
opentabs start [--port <number>] [--background] [--show-config]
\`\`\`

- \`--port <number>\` — Server port (default: 9515)
- \`--background\` — Run as a background process (PID written to \`~/.opentabs/server.pid\`)
- \`--show-config\` — Print MCP client configuration blocks

On first run, creates \`~/.opentabs/\`, generates auth secret, and prints configuration.

### stop

\`\`\`bash
opentabs stop [--port <number>]
\`\`\`

Stops a background server started with \`opentabs start --background\`.

### status

\`\`\`bash
opentabs status [--port <number>] [--json]
\`\`\`

- \`--json\` — Output raw JSON from the health endpoint

Shows: server version, uptime, extension connection, plugin count, per-plugin details.

### logs

\`\`\`bash
opentabs logs [--lines <n>] [-f|--follow] [--plugin <name>]
\`\`\`

- \`--lines <n>\` — Number of lines (default: 50)
- \`-f, --follow\` — Tail the log (like \`tail -f\`)
- \`--plugin <name>\` — Filter logs by plugin name

### audit

\`\`\`bash
opentabs audit [--limit <n>] [--plugin <name>] [--tool <name>] [--since <duration>] [--json] [--file]
\`\`\`

- \`--limit <n>\` — Number of entries (default: 20)
- \`--plugin <name>\` — Filter by plugin name
- \`--tool <name>\` — Filter by tool name
- \`--since <duration>\` — Time range (e.g., \`30m\`, \`1h\`, \`2d\`)
- \`--file\` — Read from disk log (\`~/.opentabs/audit.log\`) instead of running server

### doctor

\`\`\`bash
opentabs doctor [--port <number>]
\`\`\`

Checks: runtime, browser, config file, auth secret, server health, extension status, extension version, MCP client config, local plugins, npm plugins.

### update

\`\`\`bash
opentabs update
\`\`\`

Checks npm for updates, warns if server is running, auto-restarts background servers after update.

## Configuration Commands

### config show (alias: config get)

\`\`\`bash
opentabs config show [--json] [--show-secret]
\`\`\`

- \`--json\` — Output as JSON
- \`--show-secret\` — Display auth secret and MCP client configurations

### config set

\`\`\`bash
opentabs config set <key> [value] [-f|--force]
\`\`\`

**Supported keys:**

| Key Format | Value | Example |
|------------|-------|---------|
| \`tool-permission.<plugin>.<tool>\` | \`off\\|ask\\|auto\` | \`opentabs config set tool-permission.slack.send_message auto\` |
| \`plugin-permission.<plugin>\` | \`off\\|ask\\|auto\` | \`opentabs config set plugin-permission.slack ask\` |
| \`port\` | \`1-65535\` | \`opentabs config set port 9515\` |
| \`localPlugins.add\` | path | \`opentabs config set localPlugins.add /path/to/plugin\` |
| \`localPlugins.remove\` | path | \`opentabs config set localPlugins.remove /path/to/plugin\` |

\`--force\` allows \`localPlugins.add\` even if the path doesn't exist yet.

### config path

\`\`\`bash
opentabs config path
\`\`\`

Prints the absolute path to \`~/.opentabs/config.json\`.

### config reset

\`\`\`bash
opentabs config reset [--confirm]
\`\`\`

Deletes the config file. Server regenerates defaults on next start.

### config rotate-secret

\`\`\`bash
opentabs config rotate-secret [--confirm]
\`\`\`

Generates new 256-bit auth secret, notifies running server, requires MCP clients to update.

## Plugin Management Commands

### plugin search

\`\`\`bash
opentabs plugin search [query]
\`\`\`

Search npm registry for OpenTabs plugins. Omit query to list all available plugins.

### plugin list (alias: plugin ls)

\`\`\`bash
opentabs plugin list [--port <number>] [--json] [-v|--verbose]
\`\`\`

- \`--json\` — Machine-readable JSON output
- \`-v, --verbose\` — Show tool names for each plugin

### plugin install (alias: plugin add)

\`\`\`bash
opentabs plugin install <name>
\`\`\`

Resolves shorthand names (e.g., \`slack\` → \`opentabs-plugin-slack\` or \`@opentabs-dev/opentabs-plugin-slack\`).

### plugin remove (alias: plugin rm)

\`\`\`bash
opentabs plugin remove <name> [-y|--confirm]
\`\`\`

### plugin create

\`\`\`bash
opentabs plugin create [name] [--domain <domain>] [--display <name>] [--description <desc>]
\`\`\`

Scaffolds a new plugin project. Interactive mode if arguments not provided.

## opentabs-plugin CLI

Plugin developer CLI for building and inspecting plugins.

### opentabs-plugin build

\`\`\`bash
opentabs-plugin build [--watch]
\`\`\`

- Generates \`dist/tools.json\` (tool schemas + SDK version)
- Bundles adapter as IIFE in \`dist/adapter.iife.js\`
- Auto-registers in \`~/.opentabs/config.json\` on first build
- Notifies running MCP server via \`POST /reload\`
- \`--watch\` — Rebuild on file changes

### opentabs-plugin inspect

\`\`\`bash
opentabs-plugin inspect [--json]
\`\`\`

Pretty-prints the built plugin manifest: name, version, SDK version, tool count, and detailed tool schemas.

## File Paths

| Path | Purpose |
|------|---------|
| \`~/.opentabs/config.json\` | Server and plugin configuration |
| \`~/.opentabs/extension/auth.json\` | WebSocket auth secret |
| \`~/.opentabs/server.log\` | Server log output |
| \`~/.opentabs/audit.log\` | Persistent audit log (NDJSON) |
| \`~/.opentabs/server.pid\` | Background server PID |
| \`~/.opentabs/extension/\` | Chrome extension files |
`;

const BROWSER_TOOLS_CONTENT = `# Browser Tools Reference

41 built-in tools organized by category. All browser tools are always available regardless of installed plugins.

## Tabs (6 tools)

| Tool | Description |
|------|-------------|
| \`browser_open_tab\` | Open a new browser tab with a URL. Returns the new tab ID |
| \`browser_list_tabs\` | List all open tabs with IDs, titles, URLs, and active status |
| \`browser_close_tab\` | Close a tab by ID |
| \`browser_navigate_tab\` | Navigate a tab to a new URL |
| \`browser_focus_tab\` | Focus a tab and bring its window to the foreground |
| \`browser_get_tab_info\` | Get tab details: loading status, URL, title, favicon, incognito |

## Page Interaction (7 tools)

| Tool | Description |
|------|-------------|
| \`browser_click_element\` | Click an element by CSS selector. Dispatches trusted mouse events via CDP |
| \`browser_type_text\` | Type text into an input/textarea. Focuses, optionally clears, sets value, dispatches events |
| \`browser_select_option\` | Select a \`<select>\` dropdown option by value or label |
| \`browser_press_key\` | Press a keyboard key (Enter, Escape, Tab, arrows, Ctrl+K, etc.) via CDP |
| \`browser_scroll\` | Scroll by selector (into view), direction (up/down/left/right), or absolute position |
| \`browser_hover_element\` | Hover over an element to trigger dropdowns, tooltips, and hover states |
| \`browser_handle_dialog\` | Handle JS dialogs (alert, confirm, prompt) that block page execution |

## Page Inspection (10 tools)

| Tool | Description |
|------|-------------|
| \`browser_get_tab_content\` | Extract visible text content from a page or element |
| \`browser_get_page_html\` | Get raw HTML (outerHTML) of a page or element |
| \`browser_screenshot_tab\` | Capture a screenshot as base64 PNG |
| \`browser_query_elements\` | Query elements by CSS selector, return tags, text, and attributes |
| \`browser_execute_script\` | Execute JavaScript in a tab's MAIN world with full DOM/window access |
| \`browser_get_console_logs\` | Get console messages (requires network capture active) |
| \`browser_clear_console_logs\` | Clear console log buffer without disabling capture |
| \`browser_list_resources\` | List all resources loaded by a page (scripts, CSS, images, fonts) |
| \`browser_get_resource_content\` | Read a resource's content from browser cache |
| \`browser_wait_for_element\` | Wait for an element to appear in the DOM (polls until found or timeout) |

## Storage & Cookies (5 tools)

| Tool | Description |
|------|-------------|
| \`browser_get_storage\` | Read localStorage or sessionStorage entries |
| \`browser_get_cookies\` | Get cookies for a URL (including HttpOnly) |
| \`browser_set_cookie\` | Set or overwrite a cookie |
| \`browser_delete_cookies\` | Delete a cookie by URL and name |

**Security note:** Storage and cookie tools expose sensitive auth data. Only use when the user directly requests it.

## Network (5 tools)

| Tool | Description |
|------|-------------|
| \`browser_enable_network_capture\` | Start capturing HTTP requests, responses, and WebSocket frames via CDP |
| \`browser_get_network_requests\` | Get captured requests with URLs, methods, headers, bodies, timing |
| \`browser_get_websocket_frames\` | Get captured WebSocket frames with direction, data, and timestamps |
| \`browser_export_har\` | Export captured traffic as a HAR 1.2 JSON file |
| \`browser_disable_network_capture\` | Stop capturing and release the CDP debugger |

Use \`urlFilter\` on \`browser_enable_network_capture\` to focus on API calls (e.g., "/api") and reduce noise.

**Security note:** Network capture records authorization headers and sensitive API traffic. Only use when the user directly requests it.

## Extension (6 tools)

| Tool | Description |
|------|-------------|
| \`extension_reload\` | Reload the Chrome extension (briefly disconnects) |
| \`extension_get_state\` | Get WebSocket status, registered plugins, active captures |
| \`extension_get_logs\` | Get extension background script and offscreen document logs |
| \`extension_get_side_panel\` | Get side panel React state and rendered HTML |
| \`extension_check_adapter\` | Diagnose adapter injection for a plugin across matching tabs |
| \`extension_force_reconnect\` | Force WebSocket disconnect and immediate reconnection |

## Plugins (2 tools)

| Tool | Description |
|------|-------------|
| \`plugin_list_tabs\` | List tabs matching a plugin's URL patterns with readiness status |
| \`plugin_analyze_site\` | Comprehensive site analysis for plugin development: auth, APIs, frameworks, storage, tool suggestions |

\`plugin_list_tabs\` reads from server-side state (no extension round-trip). Use it to discover tab IDs before targeting with \`tabId\`.

\`plugin_analyze_site\` opens the URL, captures network traffic, probes for frameworks/auth/APIs/storage, and returns concrete tool suggestions with implementation approaches.

## Platform Tools (always available, hidden from side panel)

| Tool | Description |
|------|-------------|
| \`plugin_inspect\` | Retrieve a plugin's adapter source code for security review + review token |
| \`plugin_mark_reviewed\` | Mark a plugin as reviewed and set its permission |

These bypass permission checks and are used in the plugin review flow.
`;

/** URI → content for static resources that have been written */
const CONTENT_MAP = new Map<string, string>([
  ['opentabs://guide/quick-start', QUICK_START_CONTENT],
  ['opentabs://guide/plugin-development', PLUGIN_DEVELOPMENT_CONTENT],
  ['opentabs://guide/troubleshooting', TROUBLESHOOTING_CONTENT],
  ['opentabs://reference/sdk-api', SDK_API_CONTENT],
  ['opentabs://reference/cli', CLI_CONTENT],
  ['opentabs://reference/browser-tools', BROWSER_TOOLS_CONTENT],
]);

/** Return all resource definitions for resources/list */
export const getAllResources = (_state: ServerState): ResourceDefinition[] =>
  RESOURCES.map(r => ({
    uri: r.uri,
    name: r.name,
    description: r.description,
    mimeType: r.mimeType,
  }));

/**
 * Resolve a resource by URI, returning its content.
 * Returns null if the URI is not recognized.
 */
export const resolveResource = (state: ServerState, uri: string): ResolvedResource | null => {
  const def = RESOURCE_MAP.get(uri);
  if (!def) return null;

  if (uri === 'opentabs://status') {
    return { uri, mimeType: 'application/json', text: buildStatusResource(state) };
  }

  const content = CONTENT_MAP.get(uri);
  if (content) {
    return { uri, mimeType: def.mimeType, text: content };
  }

  // Static resources without content yet return a placeholder
  return { uri, mimeType: def.mimeType, text: `# ${def.name}\n\nContent coming soon.` };
};

/** Build the dynamic status resource JSON from server state */
const buildStatusResource = (state: ServerState): string => {
  const plugins = [...state.registry.plugins.values()].map(p => ({
    name: p.name,
    displayName: p.displayName,
    toolCount: p.tools.length,
    tools: p.tools.map(t => `${p.name}_${t.name}`),
    tabState: state.tabMapping.get(p.name)?.state ?? 'closed',
    tabs: (state.tabMapping.get(p.name)?.tabs ?? []).map(t => ({
      tabId: t.tabId,
      url: t.url,
      title: t.title,
      ready: t.ready,
    })),
  }));

  return JSON.stringify(
    {
      extensionConnected: state.extensionWs !== null,
      plugins,
      failedPlugins: [...state.registry.failures],
      browserToolCount: state.cachedBrowserTools.length,
      pluginToolCount: [...state.registry.plugins.values()].reduce((sum, p) => sum + p.tools.length, 0),
      skipPermissions: state.skipPermissions,
      uptime: Math.round((Date.now() - state.startedAt) / 1000),
    },
    null,
    2,
  );
};
