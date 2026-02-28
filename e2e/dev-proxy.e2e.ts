/**
 * Dev proxy E2E tests — HTTP buffering, timeout, and restart behavior.
 *
 * These tests verify the dev proxy's request buffering and forwarding
 * mechanisms during worker restarts. The proxy buffers incoming HTTP
 * requests via `whenReady()` while the worker is restarting and drains
 * them once the new worker reports ready via IPC.
 *
 * All tests use dynamic ports and isolated config directories.
 */

import { test, expect, startMcpServer, createTestConfigDir, cleanupTestConfigDir } from './fixtures.js';
import { waitForLog } from './helpers.js';

test.describe('Dev proxy request buffering', () => {
  test('HTTP request during worker restart is buffered and succeeds after drain', async () => {
    const configDir = createTestConfigDir();
    const server = await startMcpServer(configDir, true);

    try {
      // Verify server is healthy before triggering hot reload
      const initialHealth = await server.health();
      expect(initialHealth).not.toBeNull();
      if (!initialHealth) throw new Error('health returned null');
      expect(initialHealth.status).toBe('ok');

      // Clear logs to isolate hot-reload output
      server.logs.length = 0;

      // Trigger hot reload — the proxy kills the old worker and forks a new one.
      // During the restart window, workerPort is null and requests are buffered
      // in the pending[] array via whenReady().
      server.triggerHotReload();

      // Immediately fire a health request BEFORE the worker reports ready.
      // The proxy's whenReady() buffers this request and forwards it once
      // the new worker sends the IPC 'ready' message with its port.
      const headers: Record<string, string> = {};
      if (server.secret) headers['Authorization'] = `Bearer ${server.secret}`;

      const response = await fetch(`http://localhost:${server.port}/health`, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });

      // The request should succeed — the proxy buffered it during the restart
      // window and forwarded it to the new worker after drain.
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const body = (await response.json()) as { status: string };
      expect(body.status).toBe('ok');

      // Verify the hot reload actually completed (the request wasn't just
      // served by the old worker before it died)
      await waitForLog(server, 'Hot reload complete', 10_000);
    } finally {
      await server.kill();
      cleanupTestConfigDir(configDir);
    }
  });
});
