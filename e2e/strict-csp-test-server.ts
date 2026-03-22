/**
 * Strict-CSP test web server for E2E tests.
 *
 * Identical purpose to test-server.ts but applies the most restrictive
 * Content Security Policy and security headers possible. The CSP uses
 * `script-src 'none'` which blocks ALL JavaScript execution on the page —
 * no inline scripts, no external scripts, no eval, no blob URLs.
 *
 * This proves that the Chrome extension's chrome.scripting.executeScript
 * injection bypasses page CSP entirely, because it runs in a privileged
 * extension context rather than being subject to the page's CSP.
 *
 * The page HTML is purely static (no <script> tags) since they would be
 * blocked by CSP anyway. API endpoints are a subset of test-server.ts
 * (auth.check, echo, greet, status) — sufficient to prove the full flow.
 * CORS is intentionally NOT allowed — the plugin adapter runs in MAIN
 * world same-origin, so it doesn't need CORS.
 *
 * Three categories of endpoints:
 *
 * 1. **Page** — serves the HTML "app" at `/` with strict security headers.
 * 2. **Internal API** — endpoints the plugin calls via same-origin fetch:
 *      POST /api/auth.check   — readiness probe (isReady)
 *      POST /api/echo         — echo a message back
 *      POST /api/greet        — compute a greeting
 *      POST /api/status       — return server status (zero-input)
 * 3. **Control** — endpoints the test harness uses to toggle behaviour:
 *      POST /control/set-auth        — { authenticated: boolean }
 *      POST /control/set-connect-src — { connectSrcNone: boolean }
 *      POST /control/reset           — reset all state to defaults
 *      GET  /control/health          — simple health check
 *      GET  /control/invocations     — list of all API calls received
 *
 * Start: `npx tsx e2e/strict-csp-test-server.ts`
 * Default port: 9517 (override with PORT env var, use PORT=0 for dynamic)
 */

import './orphan-guard.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import http from 'node:http';
import type { Invocation } from './test-server-utils.js';

// ---------------------------------------------------------------------------
// State — mutated by /control endpoints, read by /api endpoints
// ---------------------------------------------------------------------------

interface ServerState {
  authenticated: boolean;
  connectSrcNone: boolean;
  invocations: Invocation[];
  startedAt: number;
}

const createDefaultState = (): ServerState => ({
  authenticated: true,
  connectSrcNone: false,
  invocations: [],
  startedAt: Date.now(),
});

let state = createDefaultState();

// ---------------------------------------------------------------------------
// Helpers — node:http request/response utilities
// ---------------------------------------------------------------------------

const readBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
  new Promise(resolve => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: unknown) => {
      if (Buffer.isBuffer(chunk)) chunks.push(chunk);
      else if (typeof chunk === 'string') chunks.push(Buffer.from(chunk));
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString();
        resolve(text ? (JSON.parse(text) as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
  });

const sendJson = (res: ServerResponse, data: unknown, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const recordInvocation = (req: IncomingMessage, path: string, body: unknown) => {
  state.invocations.push({
    ts: Date.now(),
    method: req.method ?? 'GET',
    path,
    body,
  });
};

/**
 * If not authenticated, send an auth error and return true.
 * Returns false if authenticated and the request should continue.
 */
const requireAuth = (res: ServerResponse): boolean => {
  if (!state.authenticated) {
    sendJson(res, {
      ok: false,
      error: 'not_authed',
      error_message: 'Not authenticated',
    });
    return true;
  }
  return false;
};

// ---------------------------------------------------------------------------
// Strict security headers applied to the page response
// ---------------------------------------------------------------------------

const buildSecurityHeaders = (): Record<string, string> => ({
  'Content-Security-Policy': [
    "default-src 'none'",
    "script-src 'none'",
    "style-src 'unsafe-inline'",
    state.connectSrcNone ? "connect-src 'none'" : "connect-src 'self'",
    "img-src 'none'",
    "font-src 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
});

// ---------------------------------------------------------------------------
// Page HTML — purely static, NO scripts (blocked by CSP anyway)
// ---------------------------------------------------------------------------

const PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Strict CSP Test App</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #333; }
    .info { padding: 8px 16px; border-radius: 6px; display: inline-block; margin: 4px 0; background: #fff3cd; color: #856404; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Strict CSP Test App</h1>
  <p>This page has the most restrictive Content Security Policy possible:</p>
  <p><code>script-src 'none'</code> — ALL JavaScript execution is blocked.</p>
  <p class="info">No scripts can run on this page via normal means.</p>
  <p>The OpenTabs extension injects adapters via <code>chrome.scripting.executeScript</code>,
     which bypasses page CSP entirely.</p>
  <p>Auth status cannot be displayed (no JS). Use the control API to check.</p>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const PORT = process.env.PORT !== undefined ? Number(process.env.PORT) : 9517;

const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;

  // --- Page ---
  if (path === '/' || path === '/index.html') {
    res.writeHead(200, {
      'Content-Type': 'text/html',
      ...buildSecurityHeaders(),
    });
    res.end(PAGE_HTML);
    return;
  }

  // =======================================================================
  // Control endpoints (called by the test harness, not by the plugin)
  // =======================================================================

  if (path === '/control/set-auth' && req.method === 'POST') {
    const body = await readBody(req);
    state.authenticated = body.authenticated === true;
    sendJson(res, { ok: true, authenticated: state.authenticated });
    return;
  }

  if (path === '/control/set-connect-src' && req.method === 'POST') {
    const body = await readBody(req);
    state.connectSrcNone = body.connectSrcNone === true;
    sendJson(res, { ok: true, connectSrcNone: state.connectSrcNone });
    return;
  }

  if (path === '/control/reset' && req.method === 'POST') {
    state = createDefaultState();
    sendJson(res, { ok: true });
    return;
  }

  if (path === '/control/health' && req.method === 'GET') {
    sendJson(res, {
      ok: true,
      port: PORT,
      uptime: (Date.now() - state.startedAt) / 1000,
    });
    return;
  }

  if (path === '/control/invocations' && req.method === 'GET') {
    sendJson(res, { ok: true, invocations: state.invocations });
    return;
  }

  // =======================================================================
  // Internal API endpoints (called by the plugin via same-origin fetch)
  // =======================================================================

  // --- Auth check (used by isReady) ---
  if (path === '/api/auth.check' && req.method === 'POST') {
    const body = await readBody(req);
    recordInvocation(req, path, body);
    sendJson(res, { ok: state.authenticated });
    return;
  }

  // --- Echo ---
  if (path === '/api/echo' && req.method === 'POST') {
    const body = await readBody(req);
    recordInvocation(req, path, body);
    if (requireAuth(res)) return;
    sendJson(res, { ok: true, message: body.message ?? '' });
    return;
  }

  // --- Greet ---
  if (path === '/api/greet' && req.method === 'POST') {
    const body = await readBody(req);
    recordInvocation(req, path, body);
    if (requireAuth(res)) return;
    const name = typeof body.name === 'string' ? body.name : 'World';
    sendJson(res, { ok: true, greeting: `Hello, ${name}!` });
    return;
  }

  // --- Status ---
  if (path === '/api/status' && req.method === 'POST') {
    const body = await readBody(req);
    recordInvocation(req, path, body);
    sendJson(res, {
      ok: true,
      authenticated: state.authenticated,
      uptime: Math.floor((Date.now() - state.startedAt) / 1000),
      version: '1.0.0-test',
    });
    return;
  }

  // --- 404 ---
  res.writeHead(404);
  res.end('Not found');
};

const server = http.createServer((req, res) => {
  handler(req, res).catch((err: unknown) => {
    console.error('[strict-csp-test-server] Handler error:', err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  });
});

server.listen(PORT, () => {
  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr !== null ? addr.port : PORT;
  console.log(`[strict-csp-test-server] Listening on http://localhost:${String(actualPort)}`);
});

// Ensure the process exits on SIGTERM/SIGINT so parent kill() calls
// reliably terminate the subprocess.
const shutdown = () => {
  server.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export type { Invocation, ServerState };
// Export for programmatic use in tests
export { server, state };
