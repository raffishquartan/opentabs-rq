/**
 * Analyze-site E2E test server — simulates web applications with various
 * authentication patterns, API protocols, and framework markers.
 *
 * Each scenario is served under a distinct path prefix (e.g., /cookie-session/).
 * The plugin_analyze_site browser tool opens the URL in a new tab, captures
 * network traffic, and probes the page — so these pages must simulate
 * realistic web app behavior including session cookies, CSRF tokens, API
 * calls from the client, and framework globals.
 *
 * Scenarios:
 *   /cookie-session/    — Cookie-based session auth with CSRF meta tag and REST APIs
 *   /jwt-localstorage/  — JWT token in localStorage with Bearer header API calls
 *   /graphql/           — GraphQL API endpoint with queries and a mutation
 *   /jsonrpc-app/       — JSON-RPC 2.0 API endpoint with methods
 *   /nextjs-app/        — Next.js-style SSR app with __NEXT_DATA__ and auth data in globals
 *
 * Start: `bun e2e/analyze-site-test-server.ts`
 * Default port: 0 (dynamic, override with PORT env var)
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface ServerState {
  startedAt: number;
}

const state: ServerState = {
  startedAt: Date.now(),
};

// ---------------------------------------------------------------------------
// Cookie-session scenario HTML
// ---------------------------------------------------------------------------

/**
 * Simulates a logged-in web app with:
 * - Session cookie (connect.sid) set via Set-Cookie on the page response
 * - CSRF meta tag in <head>
 * - REST API endpoints called by client-side JS on load
 * - A form with hidden CSRF input
 */
const COOKIE_SESSION_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="csrf-token" content="csrf-test-token-abc123" />
  <title>Cookie Session Test App</title>
</head>
<body>
  <div id="app">
    <h1>Dashboard</h1>
    <p id="status">Loading...</p>

    <form action="/cookie-session/api/update-profile" method="POST">
      <input type="hidden" name="authenticity_token" value="csrf-test-token-abc123" />
      <input type="text" name="display_name" placeholder="Display name" />
      <input type="email" name="email" placeholder="Email" />
      <button type="submit">Update Profile</button>
    </form>
  </div>

  <script>
    // Simulate client-side API calls that a real app would make on page load.
    // Uses relative URLs so the page works on any port.
    (async function() {
      try {
        var profileRes = await fetch('/cookie-session/api/profile', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        var itemsRes = await fetch('/cookie-session/api/items', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        var profile = await profileRes.json();
        var items = await itemsRes.json();

        document.getElementById('status').textContent =
          'Loaded: ' + profile.user.name + ', ' + items.items.length + ' items';

        // Also make a POST request to test POST detection
        await fetch('/cookie-session/api/items', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'New Item', description: 'Test item' })
        });
      } catch (e) {
        document.getElementById('status').textContent = 'Error: ' + e.message;
      }
    })();
  </script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// JWT localStorage scenario HTML
// ---------------------------------------------------------------------------

/**
 * A valid JWT structure (base64url header.payload.signature).
 * The payload contains user info for realistic detection.
 */
const JWT_TOKEN = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJzdWIiOiJ1c2VyLTEiLCJuYW1lIjoiVGVzdCBVc2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzA5MDAwMDAwLCJleHAiOjE3MDkwODY0MDB9',
  'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
].join('.');

/**
 * Simulates a logged-in SPA with:
 * - JWT stored in localStorage (key: "auth_token")
 * - API calls with Authorization: Bearer <jwt> header
 * - REST API endpoints for profile and items
 */
const JWT_LOCALSTORAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JWT LocalStorage Test App</title>
</head>
<body>
  <div id="app">
    <h1>JWT Dashboard</h1>
    <p id="status">Loading...</p>
  </div>

  <script>
    // Simulate post-login state: store JWT in localStorage
    var jwtToken = '${JWT_TOKEN}';
    localStorage.setItem('auth_token', jwtToken);

    // Delay API calls to allow the analyze-site orchestrator to enable
    // network capture after opening the tab. Without this delay, the fetch
    // calls fire before the CDP Network.enable command completes and are
    // missed by the capture.
    setTimeout(function() {
      (async function() {
        try {
          var profileRes = await fetch('/jwt-localstorage/api/me', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + jwtToken
            }
          });
          var tasksRes = await fetch('/jwt-localstorage/api/tasks', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + jwtToken
            }
          });

          var profile = await profileRes.json();
          var tasks = await tasksRes.json();

          document.getElementById('status').textContent =
            'Loaded: ' + profile.user.name + ', ' + tasks.tasks.length + ' tasks';

          // POST request with Bearer auth
          await fetch('/jwt-localstorage/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + jwtToken
            },
            body: JSON.stringify({ title: 'New Task', done: false })
          });
        } catch (e) {
          document.getElementById('status').textContent = 'Error: ' + e.message;
        }
      })();
    }, 1500);
  </script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// GraphQL scenario HTML
// ---------------------------------------------------------------------------

/**
 * Simulates a web app backed by a GraphQL API:
 * - POST /graphql endpoint accepting { query, variables }
 * - Client-side JS fires 2 queries and 1 mutation on load
 * - Queries: GetUsers, GetItems; Mutation: CreateItem
 */
const GRAPHQL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GraphQL Test App</title>
</head>
<body>
  <div id="app">
    <h1>GraphQL Dashboard</h1>
    <p id="status">Loading...</p>
  </div>

  <script>
    // Delay API calls so the orchestrator's network capture is active
    setTimeout(function() {
      (async function() {
        try {
          // Query 1: GetUsers
          var usersRes = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'query GetUsers { users { id name email } }',
              variables: {}
            })
          });
          var usersData = await usersRes.json();

          // Query 2: GetItems
          var itemsRes = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'query GetItems { items { id title price } }',
              variables: {}
            })
          });
          var itemsData = await itemsRes.json();

          // Mutation: CreateItem
          var createRes = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'mutation CreateItem($title: String!, $price: Float!) { createItem(title: $title, price: $price) { id title price } }',
              variables: { title: 'New Widget', price: 29.99 }
            })
          });
          var createData = await createRes.json();

          document.getElementById('status').textContent =
            'Loaded: ' + usersData.data.users.length + ' users, ' +
            itemsData.data.items.length + ' items, created: ' +
            createData.data.createItem.title;
        } catch (e) {
          document.getElementById('status').textContent = 'Error: ' + e.message;
        }
      })();
    }, 1500);
  </script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// JSON-RPC scenario HTML
// ---------------------------------------------------------------------------

/**
 * Simulates a web app backed by a JSON-RPC 2.0 API:
 * - POST /rpc endpoint accepting { jsonrpc: '2.0', method, params, id }
 * - Client-side JS fires 2 RPC calls on load: getItems and createItem
 */
const JSONRPC_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JSON-RPC Test App</title>
</head>
<body>
  <div id="app">
    <h1>JSON-RPC Dashboard</h1>
    <p id="status">Loading...</p>
  </div>

  <script>
    // Delay API calls so the orchestrator's network capture is active
    setTimeout(function() {
      (async function() {
        try {
          // RPC call 1: getItems
          var itemsRes = await fetch('/rpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'getItems',
              params: { limit: 10 },
              id: 1
            })
          });
          var itemsData = await itemsRes.json();

          // RPC call 2: createItem
          var createRes = await fetch('/rpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'createItem',
              params: { title: 'New Item', description: 'Created via JSON-RPC' },
              id: 2
            })
          });
          var createData = await createRes.json();

          document.getElementById('status').textContent =
            'Loaded: ' + itemsData.result.items.length + ' items, created: ' +
            createData.result.item.title;
        } catch (e) {
          document.getElementById('status').textContent = 'Error: ' + e.message;
        }
      })();
    }, 1500);
  </script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Next.js SSR scenario HTML
// ---------------------------------------------------------------------------

/**
 * Simulates a Next.js-style SSR app with:
 * - window.__NEXT_DATA__ containing session/user data and a buildId
 * - div#__next root element (triggers SPA detection via known container IDs)
 * - __NEXT_DATA__.props triggers hydration marker detection
 * - Auth-related keys (session, user, accessToken) nested in __NEXT_DATA__
 */
const NEXTJS_SSR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Next.js SSR Test App</title>
</head>
<body>
  <div id="__next">
    <div class="layout">
      <h1>Next.js Dashboard</h1>
      <p id="status">Server-rendered content</p>
    </div>
  </div>

  <script>
    // Simulate Next.js SSR hydration data.
    // Top-level 'session' key ensures globals detection flags hasAuthData.
    // The nested props.pageProps.session is the realistic Next.js pattern
    // for auth data (NextAuth.js style).
    window.__NEXT_DATA__ = {
      buildId: 'test-build-123',
      session: {
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com'
        },
        accessToken: 'fake-next-token-abc123',
        expires: '2099-12-31T23:59:59.999Z'
      },
      props: {
        pageProps: {
          session: {
            user: {
              id: 'user-1',
              name: 'Test User',
              email: 'test@example.com'
            },
            accessToken: 'fake-next-token-abc123',
            expires: '2099-12-31T23:59:59.999Z'
          },
          items: [
            { id: 'item-1', title: 'Alpha' },
            { id: 'item-2', title: 'Bravo' }
          ]
        }
      },
      page: '/dashboard',
      query: {}
    };
  </script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const PORT = process.env.PORT !== undefined ? Number(process.env.PORT) : 0;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // --- CORS preflight ---
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // --- Health check ---
    if (path === '/control/health') {
      return new Response(JSON.stringify({ ok: true, port: PORT, uptime: (Date.now() - state.startedAt) / 1000 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ===================================================================
    // Cookie-session scenario
    // ===================================================================

    // Page — serves HTML with Set-Cookie header
    if (path === '/cookie-session/' || path === '/cookie-session') {
      return new Response(COOKIE_SESSION_HTML, {
        headers: {
          'Content-Type': 'text/html',
          'Set-Cookie': 'connect.sid=s%3Afake-session-id-12345.sig; Path=/; HttpOnly',
        },
      });
    }

    // REST API — GET /cookie-session/api/profile
    if (path === '/cookie-session/api/profile' && req.method === 'GET') {
      return new Response(
        JSON.stringify({
          ok: true,
          user: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // REST API — GET /cookie-session/api/items
    if (path === '/cookie-session/api/items' && req.method === 'GET') {
      return new Response(
        JSON.stringify({
          ok: true,
          items: [
            { id: 'item-1', name: 'Alpha', description: 'First item' },
            { id: 'item-2', name: 'Bravo', description: 'Second item' },
            { id: 'item-3', name: 'Charlie', description: 'Third item' },
          ],
          total: 3,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // REST API — POST /cookie-session/api/items
    if (path === '/cookie-session/api/items' && req.method === 'POST') {
      let body: Record<string, unknown> = {};
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        // ignore parse errors
      }
      return new Response(
        JSON.stringify({
          ok: true,
          item: {
            id: 'item-new',
            name: body.name ?? 'Unnamed',
            description: body.description ?? '',
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // REST API — POST /cookie-session/api/update-profile (form target)
    if (path === '/cookie-session/api/update-profile' && req.method === 'POST') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ===================================================================
    // JWT localStorage scenario
    // ===================================================================

    // Page — serves HTML (JWT is stored client-side via localStorage)
    if (path === '/jwt-localstorage/' || path === '/jwt-localstorage') {
      return new Response(JWT_LOCALSTORAGE_HTML, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // REST API — GET /jwt-localstorage/api/me (requires Bearer token)
    if (path === '/jwt-localstorage/api/me' && req.method === 'GET') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          ok: true,
          user: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // REST API — GET /jwt-localstorage/api/tasks
    if (path === '/jwt-localstorage/api/tasks' && req.method === 'GET') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          ok: true,
          tasks: [
            { id: 'task-1', title: 'Review PR', done: false },
            { id: 'task-2', title: 'Deploy staging', done: true },
          ],
          total: 2,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // REST API — POST /jwt-localstorage/api/tasks
    if (path === '/jwt-localstorage/api/tasks' && req.method === 'POST') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      let body: Record<string, unknown> = {};
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        // ignore parse errors
      }
      return new Response(
        JSON.stringify({
          ok: true,
          task: {
            id: 'task-new',
            title: body.title ?? 'Untitled',
            done: body.done ?? false,
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ===================================================================
    // GraphQL scenario
    // ===================================================================

    // Page — serves HTML
    if (path === '/graphql/' || path === '/graphql-app' || path === '/graphql-app/') {
      return new Response(GRAPHQL_HTML, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // GraphQL API — POST /graphql
    if (path === '/graphql' && req.method === 'POST') {
      let body: Record<string, unknown> = {};
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        return new Response(JSON.stringify({ errors: [{ message: 'Invalid JSON' }] }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const query = typeof body.query === 'string' ? body.query : '';
      const variables = (body.variables ?? {}) as Record<string, unknown>;

      // Minimal GraphQL resolver
      if (query.includes('GetUsers') || query.includes('users')) {
        return new Response(
          JSON.stringify({
            data: {
              users: [
                { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
                { id: 'user-2', name: 'Bob', email: 'bob@example.com' },
              ],
            },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (query.includes('GetItems') || (query.includes('items') && !query.includes('createItem'))) {
        return new Response(
          JSON.stringify({
            data: {
              items: [
                { id: 'item-1', title: 'Widget A', price: 9.99 },
                { id: 'item-2', title: 'Widget B', price: 19.99 },
                { id: 'item-3', title: 'Widget C', price: 29.99 },
              ],
            },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (query.includes('createItem') || query.includes('CreateItem')) {
        return new Response(
          JSON.stringify({
            data: {
              createItem: {
                id: 'item-new',
                title: variables.title ?? 'Unnamed',
                price: variables.price ?? 0,
              },
            },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }

      // Fallback for unknown queries
      return new Response(
        JSON.stringify({
          data: null,
          errors: [{ message: `Unknown query: ${query.slice(0, 100)}` }],
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ===================================================================
    // JSON-RPC scenario
    // ===================================================================

    // Page — serves HTML
    if (path === '/jsonrpc-app/' || path === '/jsonrpc-app') {
      return new Response(JSONRPC_HTML, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // JSON-RPC API — POST /rpc
    if (path === '/rpc' && req.method === 'POST') {
      let body: Record<string, unknown> = {};
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        return new Response(
          JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const method = typeof body.method === 'string' ? body.method : '';
      const id = body.id ?? null;
      const params = (body.params ?? {}) as Record<string, unknown>;

      if (method === 'getItems') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            result: {
              items: [
                { id: 'item-1', title: 'Widget A', description: 'First widget' },
                { id: 'item-2', title: 'Widget B', description: 'Second widget' },
                { id: 'item-3', title: 'Widget C', description: 'Third widget' },
              ],
              total: 3,
            },
            id,
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (method === 'createItem') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            result: {
              item: {
                id: 'item-new',
                title: params.title ?? 'Unnamed',
                description: params.description ?? '',
              },
            },
            id,
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }

      // Unknown method
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32601, message: `Method not found: ${method}` },
          id,
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ===================================================================
    // Next.js SSR scenario
    // ===================================================================

    // Page — serves HTML with __NEXT_DATA__ global
    if (path === '/nextjs-app/' || path === '/nextjs-app') {
      return new Response(NEXTJS_SSR_HTML, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // --- 404 ---
    return new Response('Not found', { status: 404 });
  },
});

console.log(`[analyze-site-test-server] Listening on http://localhost:${String(server.port)}`);

// Ensure the process exits on SIGTERM/SIGINT
const shutdown = () => {
  void server.stop();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { server, state };
