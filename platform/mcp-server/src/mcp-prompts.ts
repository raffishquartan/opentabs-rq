/**
 * MCP prompt definitions for the OpenTabs server.
 *
 * Prompts are pre-built templates that help AI agents accomplish specific tasks.
 * Unlike instructions (sent on every session), prompts are pull-based — clients
 * fetch them on demand via `prompts/get` when the user invokes them.
 *
 * Current prompts:
 *   - `build_plugin`: Full workflow for building a new OpenTabs plugin
 *   - `troubleshoot`: Guided debugging workflow for diagnosing platform issues
 *   - `setup_plugin`: Step-by-step workflow for installing and configuring a plugin
 */

/** A single prompt argument definition */
interface PromptArgument {
  name: string;
  description: string;
  required?: boolean;
}

/** A prompt definition for MCP prompts/list */
export interface PromptDefinition {
  name: string;
  description: string;
  arguments: PromptArgument[];
}

/** A resolved prompt message for MCP prompts/get */
export interface PromptMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string };
}

/** Result of resolving a prompt */
export interface PromptResult {
  description: string;
  messages: PromptMessage[];
}

/** All registered prompts */
export const PROMPTS: PromptDefinition[] = [
  {
    name: 'build_plugin',
    description:
      'Step-by-step workflow for building a new OpenTabs plugin for a web application. ' +
      'Covers site analysis, auth discovery, API mapping, scaffolding, implementation, and testing. ' +
      'Use this when you want to create a plugin that gives AI agents access to a web app.',
    arguments: [
      {
        name: 'url',
        description: 'URL of the target web application (e.g., "https://app.example.com")',
        required: true,
      },
      {
        name: 'name',
        description: 'Plugin name in kebab-case (e.g., "my-app"). Derived from the URL if omitted.',
        required: false,
      },
    ],
  },
  {
    name: 'troubleshoot',
    description:
      'Guided debugging workflow for diagnosing OpenTabs platform issues. ' +
      'Walks through extension connectivity, plugin state, tab readiness, permissions, ' +
      'and common error scenarios with specific tool calls at each step. ' +
      'Use this when tools fail, the extension is disconnected, or the platform misbehaves.',
    arguments: [
      {
        name: 'error',
        description:
          'The error message or symptom to diagnose (e.g., "Extension not connected", "Tab closed"). ' +
          'If omitted, runs a general health check workflow.',
        required: false,
      },
    ],
  },
  {
    name: 'setup_plugin',
    description:
      'Step-by-step workflow for installing, configuring, reviewing, and testing an existing ' +
      'OpenTabs plugin from npm. Covers search, install, review flow, permission configuration, ' +
      'and verification. Use this when you want to add a plugin to the platform.',
    arguments: [
      {
        name: 'name',
        description: 'Plugin name or npm package name (e.g., "slack" or "@opentabs-dev/opentabs-plugin-slack")',
        required: true,
      },
    ],
  },
];

/** Prompt name → definition for O(1) lookup */
const PROMPT_MAP = new Map(PROMPTS.map(p => [p.name, p]));

/**
 * Resolve a prompt by name with the given arguments.
 * Returns null if the prompt name is not recognized.
 */
export const resolvePrompt = (name: string, args: Record<string, string>): PromptResult | null => {
  const def = PROMPT_MAP.get(name);
  if (!def) return null;

  switch (name) {
    case 'build_plugin':
      return resolveBuildPlugin(args);
    case 'troubleshoot':
      return resolveTroubleshoot(args);
    case 'setup_plugin':
      return resolveSetupPlugin(args);
    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// build_plugin prompt
// ---------------------------------------------------------------------------

const resolveBuildPlugin = (args: Record<string, string>): PromptResult => {
  const url = args.url ?? 'https://example.com';
  const name = args.name ?? '';

  return {
    description: `Build an OpenTabs plugin for ${url}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: buildPluginPromptText(url, name),
        },
      },
    ],
  };
};

const buildPluginPromptText = (url: string, name: string): string => {
  const nameClause = name ? `The plugin name should be \`${name}\`.` : '';

  return `Build a production-ready OpenTabs plugin for ${url}. ${nameClause}

Follow the complete workflow below. Each phase builds on the previous one — do not skip phases.

---

## Prerequisites

- The user has the target web app open in a browser tab at ${url}
- The MCP server is running (you are connected to it)
- You have access to the filesystem for creating plugin source files

### Browser Tool Permissions

Plugin development requires heavy use of browser tools (\`browser_execute_script\`, \`browser_navigate_tab\`, \`browser_get_tab_content\`, etc.). By default, tools have permission \`'off'\` (disabled) or \`'ask'\` (requires human approval).

Ask the user if they want to enable \`skipPermissions\` to bypass approval prompts during development. Set the env var: \`OPENTABS_DANGEROUSLY_SKIP_PERMISSIONS=1\`. Warn them this bypasses human approval and should only be used during active plugin development.

---

## Core Principle: Use the Real APIs, Never the DOM

Every plugin tool must use the web app's own APIs — the same HTTP endpoints, WebSocket channels, or internal RPC methods that the web app's JavaScript calls. DOM scraping is never acceptable as a tool implementation strategy. It is fragile (breaks on any UI change), limited (cannot access data not rendered on screen), and slow (parsing HTML is orders of magnitude slower than a JSON API call).

When an API is hard to discover, spend time reverse-engineering it (network capture, XHR interception, source code reading). Do not fall back to DOM scraping because it is faster to implement.

**Only three uses of the DOM are acceptable:**
1. \`isReady()\` — checking authentication signals (meta tags, page globals, indicator cookies)
2. URL hash navigation — triggering client-side route changes
3. Last-resort compose flows — when the app has no API for creating content and the UI is the only path (rare)

---

## Phase 1: Research the Codebase

Before writing any code, study the existing plugin infrastructure using the filesystem:

1. **Study the Plugin SDK** — read \`platform/plugin-sdk/CLAUDE.md\` and key source files (\`src/index.ts\`, \`src/plugin.ts\`, \`src/tool.ts\`). Understand:
   - \`OpenTabsPlugin\` abstract base class (name, displayName, description, urlPatterns, tools, isReady)
   - \`defineTool({ name, displayName, description, icon, input, output, handle })\` factory
   - \`ToolError\` static factories: \`.auth()\`, \`.notFound()\`, \`.rateLimited()\`, \`.timeout()\`, \`.validation()\`, \`.internal()\`
   - SDK utilities: \`fetchJSON\`, \`postJSON\`, \`getLocalStorage\`, \`waitForSelector\`, \`retry\`, \`sleep\`, \`log\`
   - All plugin code runs in the **browser page context** (not server-side)

2. **Study an existing plugin** (e.g., \`plugins/slack/\`) as the canonical reference:
   - \`src/index.ts\` — plugin class, imports all tools
   - \`src/slack-api.ts\` — API wrapper with auth extraction + error classification
   - \`src/tools/\` — one file per tool, shared schemas
   - \`package.json\` — the opentabs field, dependency versions, scripts

3. **Study \`plugins/CLAUDE.md\`** — plugin isolation rules and conventions

---

## Phase 2: Explore the Target Web App

This is the most critical phase. Use browser tools to understand how the web app works.

### Step 1: Find the Tab

\`\`\`
plugin_list_tabs  or  browser_list_tabs  →  find the tab for ${url}
\`\`\`

### Step 2: Analyze the Site

\`\`\`
plugin_analyze_site(url: "${url}")
\`\`\`

This gives you a comprehensive report: auth methods, API endpoints, framework detection, storage keys, and concrete tool suggestions.

### Step 3: Enable Network Capture and Explore

\`\`\`
browser_enable_network_capture(tabId, urlFilter: "/api")
\`\`\`

Navigate around in the app to trigger API calls, then read them:

\`\`\`
browser_get_network_requests(tabId)
\`\`\`

Study the captured traffic to understand:
- API base URL
- Whether the API is same-origin or cross-origin (critical for CORS)
- Request format (JSON body vs form-encoded)
- Required headers (content-type, custom headers)
- Response shapes for each endpoint
- Error response format

### Step 4: Check CORS Policy (for Cross-Origin APIs)

If the API is on a different subdomain, verify CORS behavior:

\`\`\`bash
curl -sI -X OPTIONS https://api.example.com/endpoint \\
  -H "Origin: ${url}" \\
  -H "Access-Control-Request-Method: GET" \\
  -H "Access-Control-Request-Headers: Authorization,Content-Type" \\
  | grep -i "access-control"
\`\`\`

### Step 5: Discover Auth Token

**First, always check cookies with \`browser_get_cookies\`** to understand the auth model. Then probe the page:

- **localStorage**: Direct access or iframe fallback if the app deletes \`window.localStorage\`
- **Page globals**: \`window.__APP_STATE__\`, \`window.boot_data\`, \`window.__NEXT_DATA__\`
- **Webpack module stores**: For React/webpack SPAs
- **Cookies**: \`document.cookie\` for non-HttpOnly tokens
- **Script tags**: Inline \`<script>\` tags with embedded config

### Step 6: Test the API

Once you have the token, make a test API call with \`browser_execute_script\`:

\`\`\`javascript
const resp = await fetch('https://example.com/api/v2/me', {
  headers: { Authorization: 'Bearer ' + token },
  credentials: 'include',
});
const data = await resp.json();
return data;
\`\`\`

### Step 7: Intercept Internal API Traffic (for apps without clean REST APIs)

Some web apps do not expose clean REST or GraphQL APIs. Instead they use internal RPC endpoints, obfuscated paths, or proprietary protocols that are hard to discover via network capture alone. For these apps, monkey-patch \`XMLHttpRequest\` and \`fetch\` to intercept all API traffic and capture auth headers at runtime.

Install the interceptor at adapter load time to capture auth tokens from early boot requests. Store captured data on \`globalThis\` so it survives adapter re-injection.

\`\`\`javascript
// XHR interceptor — captures internal API requests and auth headers
const captured = { authHeader: null, requests: [] };

const origOpen = XMLHttpRequest.prototype.open;
const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
const origSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method, url) {
  this._method = method;
  this._url = url;
  return origOpen.apply(this, arguments);
};

XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
  if (/auth|token|x-api|x-csrf/i.test(name)) {
    captured.authHeader = { name, value };
  }
  return origSetHeader.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function (body) {
  captured.requests.push({ method: this._method, url: this._url });
  return origSend.apply(this, arguments);
};
\`\`\`

Use this when:
- The app uses internal RPC endpoints not visible in standard network capture
- Auth tokens are computed by obfuscated JavaScript and cannot be extracted from storage
- You need to discover which headers the app sends on its own API calls

### Step 8: Map the API Surface

Discover the key endpoints: user/profile, list resources, get single resource, create/update/delete, search, messaging, reactions.

---

## Phase 3: Scaffold the Plugin

\`\`\`bash
cd plugins/
opentabs plugin create <name> --domain <domain> --display <DisplayName> --description "OpenTabs plugin for <DisplayName>"
\`\`\`

After scaffolding, compare \`package.json\` with an existing plugin (e.g., \`plugins/slack/package.json\`) and align:
- Package name: \`@opentabs-dev/opentabs-plugin-<name>\` for official plugins
- Version: Match the current platform version
- Add: \`publishConfig\`, \`check\` script
- Dependency versions: Match \`@opentabs-dev/plugin-sdk\` and \`@opentabs-dev/plugin-tools\` versions

---

## Phase 4: Implement

### File Structure

\`\`\`
src/
  index.ts              # Plugin class — imports all tools, implements isReady()
  <name>-api.ts         # API wrapper — auth extraction + error classification
  tools/
    schemas.ts          # Shared Zod schemas + defensive mappers
    send-message.ts     # One file per tool
    ...
\`\`\`

### API Wrapper Pattern (\`<name>-api.ts\`)

The API wrapper handles auth extraction, request construction, and error classification:

\`\`\`typescript
import { ToolError } from '@opentabs-dev/plugin-sdk';

interface AppAuth {
  token: string;
}

const getAuth = (): AppAuth | null => {
  // Check globalThis persistence first (survives adapter re-injection)
  // Then try localStorage, page globals, cookies
  // Return null if not authenticated
};

export const isAuthenticated = (): boolean => getAuth() !== null;

export const waitForAuth = (): Promise<boolean> =>
  new Promise((resolve) => {
    let elapsed = 0;
    const interval = 500;
    const maxWait = 5000;
    const timer = setInterval(() => {
      elapsed += interval;
      if (isAuthenticated()) { clearInterval(timer); resolve(true); return; }
      if (elapsed >= maxWait) { clearInterval(timer); resolve(false); }
    }, interval);
  });

export const api = async <T extends Record<string, unknown>>(
  endpoint: string,
  options: { method?: string; body?: Record<string, unknown>; query?: Record<string, string | number | boolean | undefined> } = {},
): Promise<T> => {
  const auth = getAuth();
  if (!auth) throw ToolError.auth('Not authenticated — please log in.');

  let url = \\\`https://example.com/api\\\${endpoint}\\\`;
  if (options.query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) params.append(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += \\\`?\\\${qs}\\\`;
  }

  const headers: Record<string, string> = { Authorization: \\\`Bearer \\\${auth.token}\\\` };
  let fetchBody: string | undefined;
  if (options.body) {
    headers['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET', headers, body: fetchBody,
      credentials: 'include', signal: AbortSignal.timeout(30_000),
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'TimeoutError')
      throw ToolError.timeout(\\\`API request timed out: \\\${endpoint}\\\`);
    throw new ToolError(
      \\\`Network error: \\\${err instanceof Error ? err.message : String(err)}\\\`,
      'network_error', { category: 'internal', retryable: true },
    );
  }

  if (!response.ok) {
    const errorBody = (await response.text().catch(() => '')).substring(0, 512);
    if (response.status === 429) throw ToolError.rateLimited(\\\`Rate limited: \\\${endpoint}\\\`);
    if (response.status === 401 || response.status === 403)
      throw ToolError.auth(\\\`Auth error (\\\${response.status}): \\\${errorBody}\\\`);
    if (response.status === 404) throw ToolError.notFound(\\\`Not found: \\\${endpoint}\\\`);
    throw ToolError.internal(\\\`API error (\\\${response.status}): \\\${endpoint} — \\\${errorBody}\\\`);
  }

  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
};
\`\`\`

### Tool Pattern (one file per tool)

\`\`\`typescript
import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { api } from '../<name>-api.js';

export const sendMessage = defineTool({
  name: 'send_message',
  displayName: 'Send Message',
  description: 'Send a message to a channel. Supports markdown formatting.',
  summary: 'Send a message to a channel',
  icon: 'send',
  input: z.object({
    channel: z.string().describe('Channel ID to send the message to'),
    content: z.string().describe('Message text content'),
  }),
  output: z.object({
    id: z.string().describe('Message ID'),
  }),
  handle: async (params) => {
    const data = await api<Record<string, unknown>>(
      '/channels/' + params.channel + '/messages',
      { method: 'POST', body: { content: params.content } },
    );
    return { id: (data.id as string) ?? '' };
  },
});
\`\`\`

### Plugin Class Pattern (\`index.ts\`)

\`\`\`typescript
import { OpenTabsPlugin } from '@opentabs-dev/plugin-sdk';
import type { ToolDefinition } from '@opentabs-dev/plugin-sdk';
import { isAuthenticated, waitForAuth } from './<name>-api.js';
import { sendMessage } from './tools/send-message.js';

class MyPlugin extends OpenTabsPlugin {
  readonly name = '<name>';
  readonly description = 'OpenTabs plugin for <DisplayName>';
  override readonly displayName = '<DisplayName>';
  readonly urlPatterns = ['*://*.example.com/*'];
  readonly tools: ToolDefinition[] = [sendMessage];

  async isReady(): Promise<boolean> {
    if (isAuthenticated()) return true;
    return waitForAuth();
  }
}

export default new MyPlugin();
\`\`\`

---

## Phase 5: Build and Test

### Build

\`\`\`bash
cd plugins/<name>
npm install
npm run build
\`\`\`

### Verify Plugin Loaded

\`\`\`
plugin_list_tabs(plugin: "<name>")
\`\`\`

Must show \`state: "ready"\` for the matching tab.

### Test Each Tool

Systematically test read-only tools first (list, get, search), then write tools (send, create, delete). Test error cases: invalid IDs, missing permissions.

### Full Check Suite

\`\`\`bash
npm run check  # build + type-check + lint + format:check
\`\`\`

---

## Key Conventions

- **One file per tool** in \`src/tools/\`
- **Every Zod field gets \`.describe()\`** — this is what AI agents see in the tool schema
- **\`description\` is for AI clients** — detailed, informative. \`summary\` is for humans — short, under 80 chars
- **Defensive mapping** with fallback defaults (\`data.field ?? ''\`) — never trust API shapes
- **Error classification is critical** — use \`ToolError\` factories, never throw raw errors
- **\`credentials: 'include'\`** on all fetch calls
- **30-second timeout** via \`AbortSignal.timeout(30_000)\`
- **\`.js\` extension** on all imports (ESM requirement)
- **No \`.transform()\`/\`.pipe()\`/\`.preprocess()\`** in Zod schemas (breaks JSON Schema serialization)

---

## Common Gotchas

1. **All plugin code runs in the browser** — no Node.js APIs
2. **SPAs hydrate asynchronously** — \`isReady()\` must poll (500ms interval, 5s max)
3. **Some apps delete browser APIs** — use iframe fallback for \`localStorage\`
4. **Tokens must persist on \`globalThis.__openTabs.tokenCache.<pluginName>\`** — module-level variables reset on extension reload
5. **HttpOnly cookies are invisible to plugin code** — use \`credentials: 'include'\` for the browser to send them automatically, detect auth status from DOM signals
6. **Parse error response bodies before classifying by HTTP status** — many apps reuse 403 for both auth and permission errors
7. **Cross-origin API + cookies: check CORS before choosing fetch strategy**
8. **Always run \`npm run format\` after writing code** — Biome config uses single quotes`;
};

// ---------------------------------------------------------------------------
// troubleshoot prompt
// ---------------------------------------------------------------------------

const resolveTroubleshoot = (args: Record<string, string>): PromptResult => {
  const error = args.error ?? '';

  return {
    description: error ? `Troubleshoot OpenTabs issue: ${error}` : 'Run a general OpenTabs health check',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: troubleshootPromptText(error),
        },
      },
    ],
  };
};

const troubleshootPromptText = (error: string): string => {
  const errorClause = error
    ? `The user is experiencing this issue: "${error}"\n\nDiagnose this specific problem using the workflow below.`
    : 'Run a general health check of the OpenTabs platform using the workflow below.';

  return `${errorClause}

---

## Step 1: Check Extension Connectivity

\`\`\`
extension_get_state
\`\`\`

Verify the response shows the WebSocket is connected. Key fields to check:
- \`connected\`: must be \`true\`
- \`tabCount\`: number of tracked tabs
- \`injectedAdapters\`: plugins with adapters injected into tabs

**If the extension is not connected:**
1. Verify the Chrome extension is loaded: the user should check \`chrome://extensions/\` and confirm OpenTabs is enabled
2. Verify the MCP server is running: \`opentabs status\`
3. Check if the extension needs to be reloaded: the user should click the refresh icon on the OpenTabs extension card at \`chrome://extensions/\`
4. Check if the side panel is open — opening the OpenTabs side panel triggers the WebSocket connection
5. If the extension was recently updated, the user needs to reload it and reopen the side panel

---

## Step 2: Check Plugin State and Tab Readiness

\`\`\`
plugin_list_tabs
\`\`\`

This returns all loaded plugins with their tab states. For each plugin, verify:
- **state**: \`ready\` means a matching tab is open and the plugin's \`isReady()\` returned true
- **state**: \`unavailable\` means a matching tab exists but \`isReady()\` returned false (auth issue, page still loading)
- **state**: \`closed\` means no tab matches the plugin's URL patterns

**If the target plugin is not listed:**
- The plugin may not be installed: \`opentabs plugin list\`
- The plugin may have failed to load: check \`opentabs logs\` for discovery errors

**If state is \`closed\`:**
- The user needs to open the web app in a browser tab
- The URL must match the plugin's URL patterns

**If state is \`unavailable\`:**
- The user may not be logged in to the web app
- The page may still be loading — wait a few seconds and re-check
- The plugin's \`isReady()\` function may have a bug

---

## Step 3: Check Plugin Permissions

If the error mentions "not reviewed" or "permission":

**Plugin not reviewed (permission is \`off\`):**
1. Call \`plugin_inspect\` with the plugin name to retrieve the adapter source code and a review token
2. Review the code for security concerns (network requests, data access, DOM manipulation)
3. Ask the user to confirm the review
4. Call \`plugin_mark_reviewed\` with the plugin name, version, review token, and desired permission (\`ask\` or \`auto\`)

**Permission denied (user rejected approval):**
- In \`ask\` mode, the user sees an approval dialog for each tool call. If they click "Deny", the tool returns a permission error
- To avoid repeated prompts, the user can set the permission to \`auto\`:
  \`\`\`bash
  opentabs config set plugin-permission.<plugin> auto
  \`\`\`
- Or set per-tool permissions:
  \`\`\`bash
  opentabs config set tool-permission.<plugin>.<tool> auto
  \`\`\`

---

## Step 4: Check for Timeout Issues

If the error mentions "timeout" or "timed out":

- The default dispatch timeout is 30 seconds. Tools that report progress get an extended window (timeout resets on each progress update, up to 5 minutes max)
- Check if the tool is a long-running operation (e.g., large data export, file upload)
- Check if the target web app is slow to respond — use \`browser_get_network_requests\` to inspect API latency
- Check if the extension adapter is responsive:
  \`\`\`
  extension_check_adapter(plugin: "<plugin-name>")
  \`\`\`

---

## Step 5: Check for Rate Limiting

If the error mentions "rate limit" or includes \`retryAfterMs\`:

- The target web app's API is throttling requests
- Wait for the \`retryAfterMs\` duration before retrying
- Reduce the frequency of tool calls to the affected plugin
- Check if the web app has a rate limit dashboard or API usage page

---

## Step 6: Check for Tool Not Found

If the error mentions "tool not found" or "unknown tool":

- Verify the tool name uses the correct prefix: \`<plugin>_<tool>\` (e.g., \`slack_send_message\`)
- Check if the plugin is installed and loaded: \`plugin_list_tabs\`
- The plugin may have been updated and the tool renamed — check the plugin's tool list

---

## Step 7: Inspect Server and Extension Logs

For deeper diagnosis, check the logs:

\`\`\`
extension_get_logs
\`\`\`

This returns recent extension logs including adapter injection events, WebSocket messages, and errors. Look for:
- Adapter injection failures (CSP violations, script errors)
- WebSocket disconnection events
- Tool dispatch errors

Also check the MCP server logs:
\`\`\`bash
opentabs logs
\`\`\`

---

## Step 8: Browser-Level Diagnostics

If the issue persists, use browser tools for deeper investigation:

\`\`\`
browser_get_console_logs(tabId: <tabId>)
\`\`\`

Check for JavaScript errors in the target web app's console.

\`\`\`
browser_enable_network_capture(tabId: <tabId>, urlFilter: "/api")
\`\`\`

Then reproduce the issue and check captured network requests:

\`\`\`
browser_get_network_requests(tabId: <tabId>)
\`\`\`

Look for failed API calls (4xx/5xx responses), CORS errors, or network timeouts.

---

## Quick Reference: Common Errors

| Error | Likely Cause | Resolution |
|-------|-------------|------------|
| Extension not connected | Extension not loaded or side panel closed | Reload extension, open side panel |
| Tab closed | No matching tab open | Open the web app in a browser tab |
| Tab unavailable | User not logged in or page loading | Log in, wait, re-check |
| Plugin not reviewed | Permission is \`off\` | Run the review flow (inspect → review → mark reviewed) |
| Permission denied | User rejected approval dialog | Set permission to \`auto\` via CLI |
| Dispatch timeout | Tool or API too slow | Check network, increase timeout, check adapter |
| Rate limited | API throttling | Wait for retryAfterMs, reduce call frequency |
| Tool not found | Wrong name or plugin not loaded | Verify plugin installed and tool name correct |
| Concurrent dispatch limit | 5 active dispatches per plugin | Wait for in-flight tools to complete |`;
};

// ---------------------------------------------------------------------------
// setup_plugin prompt
// ---------------------------------------------------------------------------

const resolveSetupPlugin = (args: Record<string, string>): PromptResult => {
  const name = args.name ?? 'my-plugin';

  return {
    description: `Set up the ${name} OpenTabs plugin`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: setupPluginPromptText(name),
        },
      },
    ],
  };
};

const setupPluginPromptText = (name: string): string => {
  const isFullPackageName = name.includes('/') || name.startsWith('opentabs-plugin-');
  const packageName = isFullPackageName ? name : `opentabs-plugin-${name}`;
  const pluginName = isFullPackageName ? name.replace(/^@[^/]+\//, '').replace(/^opentabs-plugin-/, '') : name;

  return `Set up the **${pluginName}** OpenTabs plugin. Follow each step below.

---

## Step 1: Search for the Plugin

Search npm to find the plugin package:

\`\`\`bash
opentabs plugin search ${pluginName}
\`\`\`

This lists matching packages with their descriptions and versions. Look for the official package (usually \`@opentabs-dev/${packageName}\` or \`${packageName}\`).

If the search returns no results, the plugin may not be published to npm. Check if the user has a local plugin directory to add instead.

---

## Step 2: Install the Plugin

Install the plugin via the CLI:

\`\`\`bash
opentabs plugin install ${packageName}
\`\`\`

This installs the package globally and triggers plugin rediscovery. The MCP server picks it up automatically (no restart needed).

**If the install fails:**
- Check the package name is correct
- Check npm registry access: \`npm ping\`
- For scoped packages, ensure the user is authenticated: \`npm whoami\`

For local plugins (under active development), add the path instead:

\`\`\`bash
opentabs config set localPlugins.add /path/to/plugin
\`\`\`

---

## Step 3: Open the Target Web App

The user needs to open the web app that the plugin targets in a Chrome browser tab. The plugin's URL patterns determine which tabs it matches.

Ask the user to navigate to the appropriate URL in their browser.

---

## Step 4: Verify Plugin Loaded

Check that the plugin was discovered and a matching tab is ready:

\`\`\`
plugin_list_tabs(plugin: "${pluginName}")
\`\`\`

Expected result:
- The plugin appears in the list
- \`state\` is \`ready\` (the tab matches and the plugin's \`isReady()\` returned true)
- At least one tab is shown with \`ready: true\`

**If the plugin is not listed:**
- Check the server logs: \`opentabs logs\`
- The plugin may have failed to load (missing \`dist/adapter.iife.js\`, invalid \`package.json\`, etc.)

**If state is \`unavailable\`:**
- The user may need to log in to the web app first
- Wait a few seconds for the page to finish loading, then re-check

**If state is \`closed\`:**
- No open tab matches the plugin's URL patterns
- Ask the user to open the correct URL

---

## Step 5: Review the Plugin

New plugins start with permission \`off\` (disabled) and must be reviewed before use. This is a security measure — the plugin adapter runs code in the user's authenticated browser session.

### 5a. Inspect the plugin's adapter code:

\`\`\`
plugin_inspect(plugin: "${pluginName}")
\`\`\`

This returns the full adapter IIFE source code, metadata (name, version, author, line count), and a review token.

### 5b. Review the code for security concerns:

Check for:
- **Network requests**: Are they only to the expected API domains? No exfiltration to third-party servers?
- **Data access**: Does it only read data relevant to its tools? No excessive localStorage/cookie reading?
- **DOM manipulation**: Does it only interact with the target web app's UI? No injecting external scripts?
- **Permissions**: Does it request only the capabilities it needs?

### 5c. Mark the plugin as reviewed:

After reviewing and confirming with the user:

\`\`\`
plugin_mark_reviewed(
  plugin: "${pluginName}",
  version: "<version from inspect>",
  reviewToken: "<token from inspect>",
  permission: "ask"
)
\`\`\`

Use \`ask\` permission initially — this requires user approval for each tool call. The user can upgrade to \`auto\` later if they trust the plugin.

---

## Step 6: Test the Plugin

Call a read-only tool first to verify everything works end-to-end:

1. Check which tools are available — they are prefixed with \`${pluginName}_\` (e.g., \`${pluginName}_list_channels\`, \`${pluginName}_get_profile\`)
2. Call a simple read-only tool (list, get, search) to verify:
   - The tool dispatches to the browser tab
   - The adapter extracts auth correctly
   - The API call succeeds
   - The response is well-formatted

If the tool call fails, use the \`troubleshoot\` prompt for guided debugging.

---

## Step 7: Configure Permissions

Once the plugin is working, help the user set permissions based on their trust level:

### Plugin-level permission (applies to all tools):

\`\`\`bash
# Require approval for every tool call (default after review)
opentabs config set plugin-permission.${pluginName} ask

# Auto-approve all tool calls (skip approval dialogs)
opentabs config set plugin-permission.${pluginName} auto

# Disable the plugin
opentabs config set plugin-permission.${pluginName} off
\`\`\`

### Per-tool permissions (override the plugin-level default):

\`\`\`bash
# Auto-approve read-only tools, require approval for write tools
opentabs config set tool-permission.${pluginName}.list_channels auto
opentabs config set tool-permission.${pluginName}.send_message ask
\`\`\`

### Permission resolution order:
1. \`skipPermissions\` env var (bypasses everything — development only)
2. Per-tool override (\`tool-permission.<plugin>.<tool>\`)
3. Plugin default (\`plugin-permission.<plugin>\`)
4. Global default: \`off\`

---

## Summary

After completing all steps, the plugin is:
- Installed and discovered by the MCP server
- Loaded with a matching browser tab in \`ready\` state
- Reviewed and approved with the appropriate permission level
- Tested with at least one successful tool call
- Configured with the user's preferred permission settings

The plugin's tools are now available for use in your AI workflow.`;
};
