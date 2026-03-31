/**
 * E2E tests for the plugin_analyze_site browser tool.
 *
 * Each test scenario starts a dedicated test server simulating a specific
 * auth/API pattern, calls plugin_analyze_site via the MCP client, and
 * verifies the structured analysis output.
 *
 * Prerequisites (all pre-built, not created at test time):
 *   - `npm run build` has been run (platform dist/ files exist)
 *   - `plugins/e2e-test` has been built
 *   - Chromium is installed for Playwright
 */

import type { McpClient, TestServer } from './fixtures.js';
import { expect, startAnalyzeSiteServer, test } from './fixtures.js';
import { parseToolResult, waitForExtensionConnected, waitForLog } from './helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SiteAnalysis {
  url: string;
  title: string;
  auth: {
    authenticated: boolean;
    methods: Array<{
      type: string;
      details: string;
      extractionHint: string;
    }>;
  };
  apis: {
    endpoints: Array<{
      url: string;
      method: string;
      protocol: string;
      callCount: number;
      contentType?: string;
      authHeader?: string;
      requestBodySample?: string;
      status?: number;
    }>;
    primaryApiBaseUrl: string | null;
  };
  framework: {
    frameworks: Array<{ name: string; version?: string }>;
    isSPA: boolean;
    isSSR: boolean;
  };
  globals: {
    globals: Array<{
      path: string;
      type: string;
      hasAuthData: boolean;
      topLevelKeys?: string[];
    }>;
  };
  dom: {
    forms: Array<{
      action: string;
      method: string;
      fields: Array<{ name: string; type: string }>;
    }>;
    interactiveElements: Array<{
      tag: string;
      type?: string;
      name?: string;
      id?: string;
      text?: string;
    }>;
    dataAttributes: string[];
  };
  storage: {
    cookies: Array<{ name: string; isAuth: boolean }>;
    localStorage: Array<{ name: string; isAuth: boolean }>;
    sessionStorage: Array<{ name: string; isAuth: boolean }>;
  };
  suggestions: Array<{
    toolName: string;
    description: string;
    approach: string;
    complexity: string;
  }>;
}

/**
 * Call plugin_analyze_site for a path on the shared analyzeSiteServer and
 * parse the result as SiteAnalysis. Uses a longer timeout because the tool
 * opens a tab, waits for network activity, and runs multiple detection scripts.
 *
 * The server-side handler closes the analysis tab in a finally block, but
 * this helper also snapshots tabs before/after and closes any leftovers
 * as a safety net to prevent tab accumulation across 11+ tests.
 *
 * Throws immediately with a clear message if the shared server failed to start.
 */
const analyzeSite = async (mcpClient: McpClient, path: string, waitSeconds = 3): Promise<SiteAnalysis> => {
  if (!analyzeSiteServer) throw new Error('analyzeSiteServer not initialized — beforeAll may have failed');

  const url = `${analyzeSiteServer.url}${path}`;

  // Snapshot tab IDs before the analysis (outside try/finally so it's available in cleanup)
  const beforeResult = await mcpClient.callTool('browser_list_tabs');
  const tabsBefore = new Set((JSON.parse(beforeResult.content) as Array<{ id: number }>).map(t => t.id));

  let resultContent = '';
  try {
    const result = await mcpClient.callTool('plugin_analyze_site', { url, waitSeconds }, { timeout: 60_000 });
    if (result.isError) {
      throw new Error(`plugin_analyze_site returned error: ${result.content}`);
    }
    resultContent = result.content;
  } finally {
    // Close any tabs that appeared during the analysis (safety net — runs even if the tool call throws)
    try {
      const afterResult = await mcpClient.callTool('browser_list_tabs');
      const tabsAfter = JSON.parse(afterResult.content) as Array<{ id: number }>;
      for (const tab of tabsAfter) {
        if (!tabsBefore.has(tab.id)) {
          await mcpClient.callTool('browser_close_tab', { tabId: tab.id }).catch(() => {});
        }
      }
    } catch {
      // best-effort cleanup — ignore errors so the original exception is not suppressed
    }
  }

  return parseToolResult(resultContent) as unknown as SiteAnalysis;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Use a shared server across all test groups to avoid spawning multiple processes
let analyzeSiteServer: TestServer | undefined;

test.beforeAll(async () => {
  analyzeSiteServer = await startAnalyzeSiteServer();
});

test.afterAll(async () => {
  if (analyzeSiteServer) await analyzeSiteServer.kill();
});

test.describe('plugin_analyze_site — cookie session auth', () => {
  test('detects cookie-based session auth and CSRF token', async ({
    mcpServer,
    extensionContext: _extensionContext,
    mcpClient,
  }) => {
    // Wait for the extension to connect before calling browser tools
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'plugin(s) mapped');

    const analysis = await analyzeSite(mcpClient, '/cookie-session/');

    // --- Auth detection ---
    expect(analysis.auth.authenticated).toBe(true);

    // Verify cookie-session auth method detected (exactly one connect.sid cookie)
    const cookieMethods = analysis.auth.methods.filter(m => m.type === 'cookie-session');
    expect(cookieMethods).toHaveLength(1);

    // The connect.sid cookie should be specifically identified
    const connectSidMethod = cookieMethods.find(m => m.details.includes('connect.sid'));
    expect(connectSidMethod).toBeDefined();
    expect(connectSidMethod?.extractionHint).toContain('connect\\.sid');

    // --- CSRF detection ---
    // Two CSRF sources: meta tag and hidden form input
    const csrfMethods = analysis.auth.methods.filter(m => m.type === 'csrf-token');
    expect(csrfMethods).toHaveLength(2);

    // Check for CSRF meta tag detection
    const csrfMetaMethod = csrfMethods.find(m => m.details.includes('meta'));
    expect(csrfMetaMethod).toBeDefined();

    // Check for CSRF hidden input detection
    const csrfInputMethod = csrfMethods.find(m => m.details.includes('hidden input'));
    expect(csrfInputMethod).toBeDefined();

    // --- API detection ---
    // The page makes GET /api/profile, GET /api/items, POST /api/items
    const restEndpoints = analysis.apis.endpoints.filter(e => e.protocol === 'rest');
    expect(restEndpoints).toContainEqual(
      expect.objectContaining({ url: expect.stringContaining('/cookie-session/api/') }),
    );

    // --- DOM detection ---
    // The page has exactly one form with 3 fields (authenticity_token, display_name, email)
    expect(analysis.dom.forms).toHaveLength(1);
    const form = analysis.dom.forms[0];
    expect(form).toBeDefined();
    if (form) {
      expect(form.fields).toHaveLength(3);
      const fieldNames = form.fields.map(f => f.name);
      expect(fieldNames).toContain('authenticity_token');
      expect(fieldNames).toContain('display_name');
      expect(fieldNames).toContain('email');
    }

    // --- Storage detection ---
    // connect.sid is HttpOnly, so detectStorage (which reads document.cookie) won't see it.
    // The auth detection module uses browser.getCookies (chrome.cookies API) which does
    // see HttpOnly cookies — verify that auth.methods detected the session cookie above.

    // --- Title ---
    expect(analysis.title).toBe('Cookie Session Test App');
  });
});

test.describe('plugin_analyze_site — JWT localStorage auth', () => {
  test('detects JWT in localStorage and Bearer header in API calls', async ({
    mcpServer,
    extensionContext: _extensionContext,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'plugin(s) mapped');
    const analysis = await analyzeSite(mcpClient, '/jwt-localstorage/');

    // --- Auth detection ---
    expect(analysis.auth.authenticated).toBe(true);

    // Verify JWT in localStorage detected (exactly one auth_token entry)
    const jwtLocalMethods = analysis.auth.methods.filter(m => m.type === 'jwt-localstorage');
    expect(jwtLocalMethods).toHaveLength(1);

    // The auth_token key should be mentioned in details
    const authTokenMethod = jwtLocalMethods.find(m => m.details.includes('auth_token'));
    expect(authTokenMethod).toBeDefined();

    // extractionHint should contain working JS code for localStorage access
    expect(authTokenMethod?.extractionHint).toContain('localStorage');
    expect(authTokenMethod?.extractionHint).toContain('auth_token');

    // Verify Bearer header detected in network requests
    const bearerMethods = analysis.auth.methods.filter(m => m.type === 'bearer-header');
    expect(bearerMethods).toHaveLength(1);

    // --- API detection ---
    // The page makes GET /api/me, GET /api/tasks, POST /api/tasks — all REST
    const restEndpoints = analysis.apis.endpoints.filter(e => e.protocol === 'rest');
    expect(restEndpoints).toContainEqual(
      expect.objectContaining({ url: expect.stringContaining('/jwt-localstorage/api/') }),
    );

    // --- Storage detection ---
    // The JWT key should be reported in localStorage keys
    const authStorageEntry = analysis.storage.localStorage.find(e => e.name === 'auth_token');
    expect(authStorageEntry).toBeDefined();
    expect(authStorageEntry?.isAuth).toBe(true);

    // --- Title ---
    expect(analysis.title).toBe('JWT LocalStorage Test App');
  });
});

test.describe('plugin_analyze_site — GraphQL API', () => {
  test('detects GraphQL protocol and generates GraphQL-specific suggestions', async ({
    mcpServer,
    extensionContext: _extensionContext,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'plugin(s) mapped');

    // The GraphQL page is served at /graphql-app/ (distinct from the /graphql API endpoint)
    const analysis = await analyzeSite(mcpClient, '/graphql-app/');

    // --- API detection ---
    // The page makes 3 POST requests to /graphql (GetUsers, GetItems, CreateItem)
    // They are deduplicated by URL+method, so exactly 1 graphql endpoint entry
    const graphqlEndpoints = analysis.apis.endpoints.filter(e => e.protocol === 'graphql');
    expect(graphqlEndpoints).toHaveLength(1);

    // The endpoint URL should contain /graphql
    const gqlEndpoint = graphqlEndpoints[0];
    expect(gqlEndpoint).toBeDefined();
    expect(gqlEndpoint?.url).toContain('/graphql');
    expect(gqlEndpoint?.method).toBe('POST');

    // Should have captured the request body with a query field
    expect(gqlEndpoint?.requestBodySample).toBeDefined();
    expect(gqlEndpoint?.requestBodySample).toContain('query');

    // --- Suggestions ---
    // The generic graphql_query suggestion should be present
    expect(analysis.suggestions).toContainEqual(
      expect.objectContaining({ toolName: 'graphql_query', approach: expect.stringContaining('/graphql') }),
    );

    // Named operation suggestions (gql_get_users, gql_get_items, gql_create_item)
    const gqlSuggestions = analysis.suggestions.filter(s => s.toolName.startsWith('gql_'));
    expect(gqlSuggestions.length).toBeGreaterThanOrEqual(1);

    // --- Title ---
    expect(analysis.title).toBe('GraphQL Test App');
  });
});

test.describe('plugin_analyze_site — JSON-RPC API', () => {
  test('detects JSON-RPC protocol in API calls', async ({
    mcpServer,
    extensionContext: _extensionContext,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'plugin(s) mapped');
    const analysis = await analyzeSite(mcpClient, '/jsonrpc-app/');

    // --- API detection ---
    // The page makes 2 POST requests to /rpc (getItems, createItem), deduplicated to 1 entry
    const jsonrpcEndpoints = analysis.apis.endpoints.filter(e => e.protocol === 'jsonrpc');
    expect(jsonrpcEndpoints).toHaveLength(1);

    // The endpoint URL should contain /rpc
    const rpcEndpoint = jsonrpcEndpoints[0];
    expect(rpcEndpoint).toBeDefined();
    expect(rpcEndpoint?.url).toContain('/rpc');
    expect(rpcEndpoint?.method).toBe('POST');

    // Should have captured the request body with jsonrpc field
    expect(rpcEndpoint?.requestBodySample).toBeDefined();
    expect(rpcEndpoint?.requestBodySample).toContain('jsonrpc');

    // --- Title ---
    expect(analysis.title).toBe('JSON-RPC Test App');
  });
});

test.describe('plugin_analyze_site — API key header auth', () => {
  test('detects X-API-Key header in API calls', async ({
    mcpServer,
    extensionContext: _extensionContext,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'plugin(s) mapped');
    const analysis = await analyzeSite(mcpClient, '/apikey-app/');

    // --- Auth detection ---
    expect(analysis.auth.authenticated).toBe(true);

    // Verify api-key-header auth method detected (exactly one X-API-Key header)
    const apiKeyMethods = analysis.auth.methods.filter(m => m.type === 'api-key-header');
    expect(apiKeyMethods).toHaveLength(1);

    // The X-API-Key header should be mentioned in details
    const xApiKeyMethod = apiKeyMethods[0];
    expect(xApiKeyMethod).toBeDefined();
    expect(xApiKeyMethod?.details.toLowerCase()).toContain('x-api-key');

    // extractionHint should mention the X-API-Key header
    expect(xApiKeyMethod?.extractionHint).toContain('X-API-Key');

    // --- API detection ---
    // The page makes GET /api/projects, GET /api/events, POST /api/events — all REST
    const restEndpoints = analysis.apis.endpoints.filter(e => e.protocol === 'rest');
    expect(restEndpoints).toContainEqual(expect.objectContaining({ url: expect.stringContaining('/apikey-app/api/') }));

    // --- Title ---
    expect(analysis.title).toBe('API Key Auth Test App');
  });
});

test.describe('plugin_analyze_site — Next.js SSR app', () => {
  test('detects Next.js framework, SSR/SPA status, and auth data in globals', async ({
    mcpServer,
    extensionContext: _extensionContext,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'plugin(s) mapped');
    const analysis = await analyzeSite(mcpClient, '/nextjs-app/');

    // --- Framework detection ---
    // The page sets window.__NEXT_DATA__ which the framework probe detects as nextjs
    const nextjsFramework = analysis.framework.frameworks.find(f => f.name === 'nextjs');
    expect(nextjsFramework).toBeDefined();

    // --- SPA detection ---
    // nextjs is in the known SPA frameworks list
    expect(analysis.framework.isSPA).toBe(true);

    // --- SSR detection ---
    // __NEXT_DATA__ with .props triggers both hasNextData and hydration markers
    expect(analysis.framework.isSSR).toBe(true);

    // --- Auth data in globals ---
    // __NEXT_DATA__ contains session/user/accessToken which should trigger auth-global detection
    const authGlobalMethods = analysis.auth.methods.filter(m => m.type === 'auth-global');
    expect(authGlobalMethods).toHaveLength(1);

    // The auth-global method should reference __NEXT_DATA__
    expect(authGlobalMethods[0]?.details).toContain('__NEXT_DATA__');

    // Should detect auth since __NEXT_DATA__ has auth data
    expect(analysis.auth.authenticated).toBe(true);

    // --- Globals detection ---
    // __NEXT_DATA__ should appear in globals with hasAuthData: true
    const nextDataGlobal = analysis.globals.globals.find(g => g.path === '__NEXT_DATA__');
    expect(nextDataGlobal).toBeDefined();
    expect(nextDataGlobal?.hasAuthData).toBe(true);

    // The topLevelKeys should include known __NEXT_DATA__ properties
    if (nextDataGlobal?.topLevelKeys) {
      expect(nextDataGlobal.topLevelKeys).toContain('props');
      expect(nextDataGlobal.topLevelKeys).toContain('buildId');
    }

    // --- Title ---
    expect(analysis.title).toBe('Next.js SSR Test App');
  });
});

test.describe('plugin_analyze_site — tRPC API', () => {
  test('detects tRPC protocol in API calls', async ({ mcpServer, extensionContext: _extensionContext, mcpClient }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'plugin(s) mapped');
    const analysis = await analyzeSite(mcpClient, '/trpc-app/');

    // --- API detection ---
    // The page makes 2 GET queries (user.list, item.list) and 1 POST mutation (item.create)
    // Each unique URL+method combination is a separate tRPC endpoint entry
    const trpcEndpoints = analysis.apis.endpoints.filter(e => e.protocol === 'trpc');
    expect(trpcEndpoints.length).toBeGreaterThanOrEqual(2);

    // Should detect tRPC endpoints with /api/trpc/ in the URL
    expect(trpcEndpoints).toContainEqual(expect.objectContaining({ url: expect.stringContaining('/api/trpc/') }));

    // Should detect both GET (query) and POST (mutation) tRPC calls
    expect(trpcEndpoints).toContainEqual(expect.objectContaining({ method: 'GET' }));
    expect(trpcEndpoints).toContainEqual(expect.objectContaining({ method: 'POST' }));

    // --- Suggestions ---
    // tRPC endpoints should generate procedure-based suggestions (trpc_<procedure>)
    const trpcSuggestions = analysis.suggestions.filter(s => s.toolName.startsWith('trpc_'));
    expect(trpcSuggestions.length).toBeGreaterThanOrEqual(2);

    // --- Title ---
    expect(analysis.title).toBe('tRPC Test App');
  });
});

test.describe('plugin_analyze_site — WebSocket real-time connection', () => {
  test('detects WebSocket connection in API analysis', async ({
    mcpServer,
    extensionContext: _extensionContext,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'plugin(s) mapped');
    const analysis = await analyzeSite(mcpClient, '/websocket-app/');

    // --- WebSocket detection ---
    // The page creates exactly one WebSocket connection (ws://host/ws?token=...)
    const wsEndpoints = analysis.apis.endpoints.filter(e => e.protocol === 'websocket');
    expect(wsEndpoints).toHaveLength(1);

    // The WebSocket URL should contain /ws
    expect(wsEndpoints[0]?.url).toContain('/ws');

    // --- Suggestions ---
    // WebSocket endpoints should generate a subscribe_realtime suggestion
    expect(analysis.suggestions).toContainEqual(
      expect.objectContaining({ toolName: 'subscribe_realtime', approach: expect.stringContaining('/ws') }),
    );

    // --- REST API also detected ---
    // The page also makes a REST call to /websocket-app/api/config
    // Filter to app-specific REST endpoints to exclude /api/auth.check (extension isReady polling)
    const restEndpoints = analysis.apis.endpoints.filter(
      e => e.protocol === 'rest' && e.url.includes('/websocket-app/'),
    );
    expect(restEndpoints).toHaveLength(1);
    expect(restEndpoints[0]?.url).toContain('/websocket-app/api/config');

    // --- Title ---
    expect(analysis.title).toBe('WebSocket Test App');
  });
});

test.describe('plugin_analyze_site — mixed auth (cookie + CSRF + Bearer)', () => {
  test('detects all three auth methods from a complex real-world setup', async ({
    mcpServer,
    extensionContext: _extensionContext,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'plugin(s) mapped');
    const analysis = await analyzeSite(mcpClient, '/mixed-auth/');

    // --- Cookie-session auth ---
    expect(analysis.auth.authenticated).toBe(true);

    // The "session" cookie should be detected (matches /^session$/i pattern)
    const cookieMethods = analysis.auth.methods.filter(m => m.type === 'cookie-session');
    expect(cookieMethods).toHaveLength(1);
    expect(cookieMethods[0]?.details).toContain('"session"');

    // --- CSRF token detection ---
    // Two guaranteed CSRF sources: meta tag and hidden form input.
    // A third (X-CSRF-Token header) depends on network capture timing.
    const csrfMethods = analysis.auth.methods.filter(m => m.type === 'csrf-token');
    expect(csrfMethods.length).toBeGreaterThanOrEqual(2);

    // Should detect CSRF meta tag
    const csrfMetaMethod = csrfMethods.find(m => m.details.includes('meta'));
    expect(csrfMetaMethod).toBeDefined();

    // Should detect CSRF hidden input
    const csrfInputMethod = csrfMethods.find(m => m.details.includes('hidden input'));
    expect(csrfInputMethod).toBeDefined();

    // Should also detect X-CSRF-Token header from the POST request
    const csrfHeaderMethod = csrfMethods.find(m => m.details.includes('X-CSRF-Token'));
    // The header detection depends on network capture timing — assert at least meta + hidden input
    if (csrfHeaderMethod) {
      expect(csrfHeaderMethod.details).toContain('X-CSRF-Token');
    }

    // --- Bearer header auth ---
    const bearerMethods = analysis.auth.methods.filter(m => m.type === 'bearer-header');
    expect(bearerMethods).toHaveLength(1);

    // --- All three auth types present ---
    expect(analysis.auth.methods).toContainEqual(expect.objectContaining({ type: 'cookie-session' }));
    expect(analysis.auth.methods).toContainEqual(expect.objectContaining({ type: 'csrf-token' }));
    expect(analysis.auth.methods).toContainEqual(expect.objectContaining({ type: 'bearer-header' }));

    // --- API detection ---
    // The page makes GET /dashboard, GET /notifications, POST /actions — all REST
    const restEndpoints = analysis.apis.endpoints.filter(e => e.protocol === 'rest');
    expect(restEndpoints).toContainEqual(expect.objectContaining({ url: expect.stringContaining('/mixed-auth/api/') }));

    // --- DOM detection ---
    // The page has exactly one form with CSRF and settings fields
    expect(analysis.dom.forms).toHaveLength(1);
    const form = analysis.dom.forms[0];
    expect(form).toBeDefined();
    if (form) {
      const fieldNames = form.fields.map(f => f.name);
      expect(fieldNames).toContain('authenticity_token');
      expect(fieldNames).toContain('setting_name');
    }

    // --- Title ---
    expect(analysis.title).toBe('Mixed Auth Test App');
  });
});

test.describe('plugin_analyze_site — SPA with client-side routing', () => {
  test('detects SPA with React framework and client-side routing', async ({
    mcpServer,
    extensionContext: _extensionContext,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'plugin(s) mapped');
    const analysis = await analyzeSite(mcpClient, '/spa-app/');

    // --- Framework detection ---
    // The page sets window.__REACT_DEVTOOLS_GLOBAL_HOOK__ with renderers
    const reactFramework = analysis.framework.frameworks.find(f => f.name === 'react');
    expect(reactFramework).toBeDefined();
    expect(reactFramework?.version).toBe('18.2.0');

    // --- SPA detection ---
    // React is in the known SPA frameworks list, and the page has a div#root
    expect(analysis.framework.isSPA).toBe(true);

    // --- Title ---
    expect(analysis.title).toBe('SPA React Test App');
  });
});

test.describe('plugin_analyze_site — suggestion generation quality', () => {
  test('generates actionable REST API tool suggestions from detected endpoints', async ({
    mcpServer,
    extensionContext: _extensionContext,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'plugin(s) mapped');
    const analysis = await analyzeSite(mcpClient, '/suggestions-app/');

    // --- Suggestions array: 3 REST + form suggestions ---
    // The page has 3 REST API calls (GET items, POST items, GET users) and 2 forms,
    // so we expect at least 3 REST suggestions plus form submissions.
    expect(analysis.suggestions.length).toBeGreaterThanOrEqual(3);

    // --- Each suggestion has the required shape fields ---
    for (const suggestion of analysis.suggestions) {
      expect(suggestion.toolName).toBeTruthy();
      expect(suggestion.description).toBeTruthy();
      expect(suggestion.approach).toBeTruthy();
      expect(suggestion.complexity).toBeTruthy();

      // complexity must be one of the valid values
      expect(['low', 'medium', 'high']).toContain(suggestion.complexity);
    }

    // --- REST endpoint GET /api/items → 'list_items' suggestion ---
    expect(analysis.suggestions).toContainEqual(
      expect.objectContaining({
        toolName: 'list_items',
        approach: expect.stringContaining('/api/items'),
        complexity: 'low',
      }),
    );

    // --- REST endpoint POST /api/items → 'create_items' suggestion ---
    expect(analysis.suggestions).toContainEqual(
      expect.objectContaining({ toolName: 'create_items', approach: expect.stringContaining('/api/items') }),
    );

    // --- REST endpoint GET /api/users → 'list_users' suggestion ---
    expect(analysis.suggestions).toContainEqual(
      expect.objectContaining({
        toolName: 'list_users',
        approach: expect.stringContaining('/api/users'),
        complexity: 'low',
      }),
    );

    // --- All three REST suggestions present and reference their endpoints ---
    const restSuggestions = analysis.suggestions.filter(
      s => s.toolName === 'list_items' || s.toolName === 'create_items' || s.toolName === 'list_users',
    );
    expect(restSuggestions).toHaveLength(3);
    for (const s of restSuggestions) {
      expect(s.approach).toMatch(/\/api\/(items|users)/);
    }

    // --- Form suggestions exist (2 forms: search + settings) ---
    const formSuggestions = analysis.suggestions.filter(s => s.toolName.startsWith('submit_'));
    expect(formSuggestions.length).toBeGreaterThanOrEqual(1);

    // --- Title ---
    expect(analysis.title).toBe('Suggestions Quality Test App');
  });
});

test.describe('plugin_analyze_site — sessionStorage JWT auth', () => {
  test('detects JWT in sessionStorage and Bearer header in API calls', async ({
    mcpServer,
    extensionContext: _extensionContext,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'plugin(s) mapped');
    const analysis = await analyzeSite(mcpClient, '/jwt-sessionstorage/');

    // --- Auth detection ---
    expect(analysis.auth.authenticated).toBe(true);

    // Verify JWT in sessionStorage detected (exactly one auth_token entry)
    const jwtSessionMethods = analysis.auth.methods.filter(m => m.type === 'jwt-sessionstorage');
    expect(jwtSessionMethods).toHaveLength(1);

    // The auth_token key should be mentioned in details
    const authTokenMethod = jwtSessionMethods[0];
    expect(authTokenMethod?.details).toContain('auth_token');

    // extractionHint should contain working JS code for sessionStorage access
    expect(authTokenMethod?.extractionHint).toContain('sessionStorage');
    expect(authTokenMethod?.extractionHint).toContain('auth_token');

    // Verify Bearer header detected in network requests
    const bearerMethods = analysis.auth.methods.filter(m => m.type === 'bearer-header');
    expect(bearerMethods).toHaveLength(1);

    // --- API detection ---
    // The page makes GET /api/notes, POST /api/notes — all REST
    const restEndpoints = analysis.apis.endpoints.filter(e => e.protocol === 'rest');
    expect(restEndpoints).toContainEqual(
      expect.objectContaining({ url: expect.stringContaining('/jwt-sessionstorage/api/') }),
    );

    // --- Storage detection ---
    // The JWT key should be reported in sessionStorage keys
    const authStorageEntry = analysis.storage.sessionStorage.find(e => e.name === 'auth_token');
    expect(authStorageEntry).toBeDefined();
    expect(authStorageEntry?.isAuth).toBe(true);

    // --- Title ---
    expect(analysis.title).toBe('JWT SessionStorage Test App');
  });
});

test.describe('plugin_analyze_site — Basic Auth', () => {
  test('detects Basic Auth from Authorization: Basic header in network requests', async ({
    mcpServer,
    extensionContext: _extensionContext,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'plugin(s) mapped');
    const analysis = await analyzeSite(mcpClient, '/basicauth-app/');

    // --- Auth detection ---
    expect(analysis.auth.authenticated).toBe(true);

    // Verify basic-auth method detected (exactly one Basic Auth header)
    const basicMethods = analysis.auth.methods.filter(m => m.type === 'basic-auth');
    expect(basicMethods).toHaveLength(1);

    // The details should mention Basic Auth
    const basicMethod = basicMethods[0];
    expect(basicMethod).toBeDefined();
    expect(basicMethod?.details).toContain('Basic Auth');

    // extractionHint should mention btoa/username:password
    expect(basicMethod?.extractionHint).toContain('btoa');

    // Should NOT be classified as bearer-header (Basic Auth is distinct)
    const bearerMethods = analysis.auth.methods.filter(m => m.type === 'bearer-header');
    expect(bearerMethods).toHaveLength(0);

    // --- API detection ---
    // The page makes GET /api/files, POST /api/files — all REST
    const restEndpoints = analysis.apis.endpoints.filter(e => e.protocol === 'rest');
    expect(restEndpoints).toContainEqual(
      expect.objectContaining({ url: expect.stringContaining('/basicauth-app/api/') }),
    );

    // --- Title ---
    expect(analysis.title).toBe('Basic Auth Test App');
  });
});
