/**
 * MCP session persistence E2E tests — verifies that MCP client connections
 * survive dev proxy hot reloads without requiring client-side re-initialization.
 *
 * The dev proxy assigns stable proxy session IDs to MCP clients and
 * transparently re-initializes sessions with new workers on hot reload.
 * These tests verify that the proxy session bridging works end-to-end:
 * tools remain callable, session IDs remain stable, and multi-client
 * scenarios work correctly after one or more hot reloads.
 */

import {
  test,
  expect,
  startMcpServer,
  createTestConfigDir,
  cleanupTestConfigDir,
  createMcpClient,
  readPluginToolNames,
} from './fixtures.js';
import { waitForLog, waitForExtensionConnected, waitForToolResult, parseToolResult, setupToolTest } from './helpers.js';

test.describe('MCP session persistence across hot reload', () => {
  test('MCP client retains tool access after a single hot reload without re-initialization', async () => {
    const configDir = createTestConfigDir();
    const server = await startMcpServer(configDir, true);

    try {
      // Initialize an MCP client session
      const client = createMcpClient(server.port, server.secret);
      await client.initialize();

      // Verify tools are available before the reload
      const toolsBefore = await client.listTools();
      const expectedToolNames = readPluginToolNames();
      for (const name of expectedToolNames) {
        expect(toolsBefore.some(t => t.name === name)).toBe(true);
      }

      // Clear logs to isolate hot-reload output
      server.logs.length = 0;

      // Trigger hot reload — the proxy kills the old worker and starts a new one.
      // The proxy should re-initialize the MCP session transparently.
      server.triggerHotReload();

      // Wait for the reload to complete
      await waitForLog(server, 'Hot reload complete', 15_000);

      // Verify the proxy re-initialized the session with the new worker
      expect(server.logs.join('\n')).toContain('Re-initializing');

      // List tools again — should succeed without client-side re-initialization.
      // The proxy mapped the stable session ID to the new worker's session ID.
      const toolsAfter = await client.listTools();
      for (const name of expectedToolNames) {
        expect(toolsAfter.some(t => t.name === name)).toBe(true);
      }

      await client.close();
    } finally {
      await server.kill();
      cleanupTestConfigDir(configDir);
    }
  });

  test('MCP client survives multiple sequential hot reloads', async () => {
    const configDir = createTestConfigDir();
    const server = await startMcpServer(configDir, true);

    try {
      const client = createMcpClient(server.port, server.secret);
      await client.initialize();

      // Verify baseline tool access
      const expectedToolNames = readPluginToolNames();
      const toolsBefore = await client.listTools();
      for (const name of expectedToolNames) {
        expect(toolsBefore.some(t => t.name === name)).toBe(true);
      }

      // Perform 3 sequential hot reloads, verifying tool access after each
      for (let i = 1; i <= 3; i++) {
        server.logs.length = 0;
        server.triggerHotReload();
        await waitForLog(server, 'Hot reload complete', 15_000);

        // Verify tools are still accessible after each reload
        const tools = await client.listTools();
        for (const name of expectedToolNames) {
          expect(tools.some(t => t.name === name)).toBe(true);
        }
      }

      await client.close();
    } finally {
      await server.kill();
      cleanupTestConfigDir(configDir);
    }
  });

  test('multiple MCP clients each retain tool access after hot reload', async () => {
    const configDir = createTestConfigDir();
    const server = await startMcpServer(configDir, true);

    try {
      // Create two independent MCP client sessions
      const client1 = createMcpClient(server.port, server.secret);
      const client2 = createMcpClient(server.port, server.secret);
      await client1.initialize();
      await client2.initialize();

      const expectedToolNames = readPluginToolNames();

      // Verify both clients have tool access before reload
      const tools1Before = await client1.listTools();
      const tools2Before = await client2.listTools();
      for (const name of expectedToolNames) {
        expect(tools1Before.some(t => t.name === name)).toBe(true);
        expect(tools2Before.some(t => t.name === name)).toBe(true);
      }

      // Trigger hot reload
      server.logs.length = 0;
      server.triggerHotReload();
      await waitForLog(server, 'Hot reload complete', 15_000);

      // Verify the proxy re-initialized both sessions
      const reinitLog = server.logs.find(l => l.includes('Re-initializing'));
      expect(reinitLog).toBeDefined();
      expect(reinitLog).toContain('2 MCP session');

      // Both clients should retain tool access
      const tools1After = await client1.listTools();
      const tools2After = await client2.listTools();
      for (const name of expectedToolNames) {
        expect(tools1After.some(t => t.name === name)).toBe(true);
        expect(tools2After.some(t => t.name === name)).toBe(true);
      }

      await client1.close();
      await client2.close();
    } finally {
      await server.kill();
      cleanupTestConfigDir(configDir);
    }
  });
});

test.describe.serial('MCP session persistence with extension and tool dispatch', () => {
  test('end-to-end tool dispatch works after hot reload via persistent session', async ({
    mcpServer,
    testServer,
    extensionContext,
    mcpClient,
  }) => {
    test.slow();

    const page = await setupToolTest(mcpServer, testServer, extensionContext, mcpClient);

    try {
      // Verify end-to-end tool dispatch works before reload
      const beforeResult = await mcpClient.callTool('e2e-test_echo', { message: 'before-reload' });
      expect(beforeResult.isError).toBe(false);
      expect(parseToolResult(beforeResult.content).message).toBe('before-reload');

      // Trigger hot reload
      mcpServer.logs.length = 0;
      mcpServer.triggerHotReload();

      // Wait for reload to complete and extension to reconnect
      await waitForLog(mcpServer, 'Hot reload complete', 20_000);
      await waitForExtensionConnected(mcpServer, 30_000);
      await waitForLog(mcpServer, 'tab.syncAll received', 20_000);

      // Poll until the tool is callable through the extension (tab state = ready)
      await waitForToolResult(mcpClient, 'e2e-test_echo', { message: 'poll-check' }, { isError: false }, 20_000);

      // Verify full end-to-end tool dispatch: MCP client → proxy → worker → extension → adapter
      const afterResult = await mcpClient.callTool('e2e-test_echo', { message: 'after-reload' });
      expect(afterResult.isError).toBe(false);
      expect(parseToolResult(afterResult.content).message).toBe('after-reload');
    } finally {
      await page.close();
    }
  });

  test('tool call in-flight during hot reload recovers and subsequent calls succeed', async ({
    mcpServer,
    testServer,
    extensionContext,
    mcpClient,
  }) => {
    test.slow();

    const page = await setupToolTest(mcpServer, testServer, extensionContext, mcpClient);

    try {
      // Verify baseline tool dispatch
      const baseline = await mcpClient.callTool('e2e-test_echo', { message: 'baseline' });
      expect(baseline.isError).toBe(false);

      // Start a slow tool call and trigger hot reload while it's in-flight
      const slowCallPromise = mcpClient.callToolWithProgress(
        'e2e-test_slow_with_progress',
        { durationMs: 5_000, steps: 10 },
        { timeout: 30_000 },
      );

      // Wait for the tool call to reach the worker, then trigger reload
      await new Promise(r => setTimeout(r, 1_000));
      mcpServer.logs.length = 0;
      mcpServer.triggerHotReload();

      // The in-flight call may complete, error, or be interrupted — all acceptable
      try {
        const slowResult = await slowCallPromise;
        if (!slowResult.isError) {
          const output = parseToolResult(slowResult.content);
          expect(output.completed).toBe(true);
        }
      } catch {
        // Expected: 502, connection reset, or partial response during worker restart
      }

      // Wait for the system to stabilize after reload
      await waitForLog(mcpServer, 'Hot reload complete', 20_000);
      await waitForExtensionConnected(mcpServer, 30_000);
      await waitForLog(mcpServer, 'tab.syncAll received', 20_000);

      // Poll until the tool is callable again
      await waitForToolResult(mcpClient, 'e2e-test_echo', { message: 'poll-check' }, { isError: false }, 20_000);

      // Verify subsequent tool calls succeed after the interrupted call
      const afterResult = await mcpClient.callTool('e2e-test_echo', { message: 'after-inflight-reload' });
      expect(afterResult.isError).toBe(false);
      expect(parseToolResult(afterResult.content).message).toBe('after-inflight-reload');
    } finally {
      await page.close();
    }
  });
});
