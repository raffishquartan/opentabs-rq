/**
 * Dev proxy for hot reload without Bun.
 *
 * Listens on the configured port. Forks the MCP server (dist/index.js) on
 * an ephemeral port (PORT=0). The worker reports its actual port to the proxy
 * via IPC once it is listening. Forwards HTTP and WebSocket traffic to the
 * current worker. Restarts the worker when .js files in the dist/ directory
 * change (debounced). Incoming HTTP requests are buffered during restarts and
 * drained once the new worker is ready (up to 5 seconds, then 503).
 */

import { DEFAULT_PORT } from '@opentabs-dev/shared';
import { WebSocket, WebSocketServer } from 'ws';
import { fork } from 'node:child_process';
import { watch } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { resolve } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';

const WORKER_JS = resolve(import.meta.dirname, 'index.js');
const DIST_DIR = resolve(import.meta.dirname);
const PROXY_PORT = Number(process.env['PORT'] ?? DEFAULT_PORT);
const DEBOUNCE_MS = 300;
const READY_TIMEOUT_MS = 5000;

let workerPort: number | null = null;
let worker: ChildProcess | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const pending: Array<() => void> = [];

/** Drain all buffered requests now that the worker is ready. */
const drainPending = (): void => {
  for (const fn of pending.splice(0)) fn();
};

/**
 * Start (or restart) the worker. Kills the previous worker if running,
 * forks a new one with PORT=0 and OPENTABS_PROXY=1, then waits for the
 * 'ready' IPC message containing the worker's actual ephemeral port.
 */
const startWorker = (): void => {
  if (worker) {
    worker.kill('SIGTERM');
    worker = null;
    workerPort = null;
  }

  const child = fork(WORKER_JS, ['--dev'], {
    env: { ...process.env, PORT: '0', OPENTABS_PROXY: '1' },
  });
  worker = child;

  child.on('message', (msg: unknown) => {
    if (
      typeof msg === 'object' &&
      msg !== null &&
      (msg as { type?: unknown }).type === 'ready' &&
      typeof (msg as { port?: unknown }).port === 'number'
    ) {
      workerPort = (msg as { type: string; port: number }).port;
      console.log(`[proxy] Worker ready on port ${workerPort}`);
      drainPending();
    }
  });

  child.on('exit', code => {
    if (worker === child) {
      worker = null;
      workerPort = null;
      console.log(`[proxy] Worker exited (code ${code ?? 'null'})`);
    }
  });
};

/**
 * Run fn when the worker is ready. Runs immediately if already ready.
 * Otherwise buffers fn until the worker reports ready via IPC, calling
 * onTimeout if the worker does not become ready within READY_TIMEOUT_MS.
 */
const whenReady = (fn: () => void, onTimeout: () => void): void => {
  if (workerPort !== null) {
    fn();
    return;
  }

  // settled prevents double-invocation if the timeout fires concurrently
  // with drainPending (single-threaded, but both check settled).
  let settled = false;

  const timer = setTimeout(() => {
    if (!settled) {
      settled = true;
      onTimeout();
    }
  }, READY_TIMEOUT_MS);

  pending.push(() => {
    if (!settled) {
      settled = true;
      clearTimeout(timer);
      fn();
    }
  });
};

/** Forward an HTTP request to the worker via node:http. */
const proxyHttp = (req: IncomingMessage, res: ServerResponse, port: number): void => {
  const proxyReq = httpRequest(
    { hostname: '127.0.0.1', port, path: req.url ?? '/', method: req.method, headers: req.headers },
    proxyRes => {
      res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
      proxyRes.pipe(res);
      res.on('close', () => proxyRes.destroy());
    },
  );
  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end('Bad Gateway');
    }
  });
  req.pipe(proxyReq);
};

// WebSocketServer in noServer mode — used only to complete client-side upgrades.
// The 'headers' event injects the Sec-WebSocket-Protocol echo from the worker.
const wss = new WebSocketServer({ noServer: true });
let pendingWsProtocol: string | null = null;
wss.on('headers', (headers: string[]) => {
  if (pendingWsProtocol !== null) {
    headers.push(`Sec-WebSocket-Protocol: ${pendingWsProtocol}`);
    pendingWsProtocol = null;
  }
});

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  whenReady(
    () => {
      if (workerPort !== null) {
        proxyHttp(req, res, workerPort);
      } else {
        res.writeHead(503);
        res.end('Service Unavailable');
      }
    },
    () => {
      res.writeHead(503);
      res.end('Service Unavailable');
    },
  );
});

/** Forward a WebSocket upgrade to the worker. */
httpServer.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
  if (workerPort === null) {
    socket.destroy();
    return;
  }

  const port = workerPort;
  const upstream = new WebSocket(`ws://127.0.0.1:${port}${req.url ?? '/'}`, {
    headers: req.headers as Record<string, string>,
  });

  upstream.on('open', () => {
    // Forward the Sec-WebSocket-Protocol echo from the worker to the client.
    if (upstream.protocol) {
      pendingWsProtocol = upstream.protocol;
    }
    wss.handleUpgrade(req, socket, head, client => {
      client.on('message', (data, isBinary) => {
        if (upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary: isBinary });
      });
      upstream.on('message', (data, isBinary) => {
        if (client.readyState === WebSocket.OPEN) client.send(data, { binary: isBinary });
      });
      client.on('close', () => upstream.close());
      upstream.on('close', () => client.close());
      upstream.on('error', () => client.terminate());
      client.on('error', () => upstream.terminate());
    });
  });

  upstream.on('error', err => {
    console.error(`[proxy] WebSocket upstream error: ${err.message}`);
    socket.destroy();
  });
});

httpServer.listen(PROXY_PORT, '127.0.0.1', () => {
  console.log(`[proxy] Dev proxy listening on http://localhost:${PROXY_PORT}`);
  startWorker();
});

// Watch dist/ for .js file changes (excluding dev-proxy.js itself) and restart
// the worker, debounced to handle tsc writing multiple files in one compilation.
watch(DIST_DIR, { recursive: true }, (_event, filename) => {
  if (typeof filename === 'string' && filename.endsWith('.js') && filename !== 'dev-proxy.js') {
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      console.log('[proxy] Code change detected, restarting worker...');
      startWorker();
    }, DEBOUNCE_MS);
  }
});

// Graceful shutdown: kill the worker when the proxy exits.
process.on('SIGTERM', () => {
  worker?.kill('SIGTERM');
  process.exit(0);
});
process.on('SIGINT', () => {
  worker?.kill('SIGTERM');
  process.exit(0);
});
