/**
 * E2E tests for security protections: DNS rebinding (Host header validation),
 * CORS/Origin protection, concurrency limits, rate limiting, and more.
 */

import http from 'node:http';
import { cleanupTestConfigDir, createTestConfigDir, expect, startMcpServer, test } from './fixtures.js';

// ---------------------------------------------------------------------------
// Helper: HTTP request with custom Host header
// ---------------------------------------------------------------------------

/**
 * Send an HTTP request using `node:http` so we can override the Host header.
 * Node.js `fetch` treats Host as a forbidden header and silently ignores it.
 */
function requestWithHost(
  port: number,
  pathname: string,
  hostHeader: string,
): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: pathname,
        method: 'GET',
        headers: { Host: hostHeader },
      },
      res => {
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, body, headers: res.headers });
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(5_000, () => {
      req.destroy(new Error('Request timed out'));
    });
    req.end();
  });
}

// ---------------------------------------------------------------------------
// US-001: DNS rebinding protection rejects non-localhost Host headers
// ---------------------------------------------------------------------------

test.describe('DNS rebinding protection — Host header validation', () => {
  let configDir = '';

  test.beforeEach(() => {
    configDir = createTestConfigDir();
  });

  test.afterEach(() => {
    if (configDir) cleanupTestConfigDir(configDir);
  });

  test('rejects requests with evil Host headers (403)', async () => {
    const server = await startMcpServer(configDir, true);
    try {
      await server.waitForHealth(h => h.status === 'ok');

      const evilHosts = ['evil.com', 'localhost.evil.com', 'evil.com:8080'];

      for (const host of evilHosts) {
        const res = await requestWithHost(server.port, '/health', host);
        expect(res.status, `Host: ${host} should be rejected`).toBe(403);
        expect(res.body).toContain('invalid Host header');
      }
    } finally {
      await server.kill();
    }
  });

  test('accepts requests with valid localhost Host headers', async () => {
    const server = await startMcpServer(configDir, true);
    try {
      await server.waitForHealth(h => h.status === 'ok');

      const validHosts = [
        'localhost',
        `localhost:${server.port}`,
        '127.0.0.1',
        `127.0.0.1:${server.port}`,
        `[::1]:${server.port}`,
      ];

      for (const host of validHosts) {
        const res = await requestWithHost(server.port, '/health', host);
        expect(res.status, `Host: ${host} should be accepted`).toBe(200);
      }
    } finally {
      await server.kill();
    }
  });

  test('rejects requests with IPv6-like malicious hosts', async () => {
    const server = await startMcpServer(configDir, true);
    try {
      await server.waitForHealth(h => h.status === 'ok');

      // Malformed IPv6 and non-localhost IPv6 addresses
      const maliciousHosts = ['[::2]:8080', '[evil'];

      for (const host of maliciousHosts) {
        const res = await requestWithHost(server.port, '/health', host);
        expect(res.status, `Host: ${host} should be rejected`).toBe(403);
        expect(res.body).toContain('invalid Host header');
      }
    } finally {
      await server.kill();
    }
  });

  test('accepts IPv4-mapped IPv6 localhost address', async () => {
    const server = await startMcpServer(configDir, true);
    try {
      await server.waitForHealth(h => h.status === 'ok');

      const res = await requestWithHost(server.port, '/health', `[::ffff:127.0.0.1]:${server.port}`);
      expect(res.status).toBe(200);
    } finally {
      await server.kill();
    }
  });
});
