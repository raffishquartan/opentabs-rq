/**
 * E2E tests for the plugin logging pipeline.
 *
 * Verifies the full flow: sdk.log in adapter → postMessage → ISOLATED relay →
 * chrome.runtime.sendMessage → background → WebSocket → MCP server → log buffer
 * → console (server.log) → MCP clients (sendLoggingMessage).
 *
 * Uses the e2e-test plugin's `log_levels` tool, which emits one log entry at
 * each level (debug, info, warning, error) with a unique prefix for isolation.
 */

import { test, expect, fetchHealth } from './fixtures.js';
import { setupToolTest, callToolExpectSuccess, waitForLog, waitFor } from './helpers.js';

test.describe('Plugin logging — full pipeline', () => {
  test('log_levels tool emits log entries that arrive at MCP server', async ({
    mcpServer,
    testServer,
    extensionContext,
    mcpClient,
  }) => {
    const page = await setupToolTest(mcpServer, testServer, extensionContext, mcpClient);

    const prefix = `e2e-log-${Date.now()}`;
    const output = await callToolExpectSuccess(mcpClient, mcpServer, 'e2e-test_log_levels', { prefix });
    expect(output.ok).toBe(true);
    expect(output.levels).toEqual(['debug', 'info', 'warning', 'error']);

    // Wait for log entries to propagate through the pipeline (batched every 100ms,
    // then relayed via WebSocket, then processed by MCP server)
    await waitForLog(mcpServer, `${prefix} error-message`, 15_000);

    // Verify all four log levels appeared in server logs
    const allLogs = mcpServer.logs.join('\n');
    expect(allLogs).toContain(`[plugin:e2e-test]`);
    expect(allLogs).toContain(`${prefix} debug-message`);
    expect(allLogs).toContain(`${prefix} info-message`);
    expect(allLogs).toContain(`${prefix} warning-message`);
    expect(allLogs).toContain(`${prefix} error-message`);

    // Verify log level tags appear in server log output
    expect(allLogs).toContain('DEBUG');
    expect(allLogs).toContain('INFO');
    expect(allLogs).toContain('WARNING');
    expect(allLogs).toContain('ERROR');

    await page.close();
  });

  test('log buffer count increases after log_levels tool call', async ({
    mcpServer,
    testServer,
    extensionContext,
    mcpClient,
  }) => {
    const page = await setupToolTest(mcpServer, testServer, extensionContext, mcpClient);

    // Check initial log buffer size
    const healthBefore = await fetchHealth(mcpServer.port, mcpServer.secret);
    const pluginBefore = healthBefore?.pluginDetails?.find(p => p.name === 'e2e-test');
    const initialBufferSize = pluginBefore?.logBufferSize ?? 0;

    // Call log_levels tool
    const prefix = `e2e-buf-${Date.now()}`;
    await callToolExpectSuccess(mcpClient, mcpServer, 'e2e-test_log_levels', { prefix });

    // Wait for logs to arrive at the server's log buffer
    await waitFor(
      async () => {
        const h = await fetchHealth(mcpServer.port, mcpServer.secret);
        const pluginDetail = h?.pluginDetails?.find(p => p.name === 'e2e-test');
        return (pluginDetail?.logBufferSize ?? 0) >= initialBufferSize + 4;
      },
      15_000,
      500,
      'log buffer size to increase by at least 4',
    );

    // Verify final buffer size
    const healthAfter = await fetchHealth(mcpServer.port, mcpServer.secret);
    const pluginAfter = healthAfter?.pluginDetails?.find(p => p.name === 'e2e-test');
    expect(pluginAfter?.logBufferSize).toBeGreaterThanOrEqual(initialBufferSize + 4);

    await page.close();
  });

  test('log entries include correct plugin name in logger field', async ({
    mcpServer,
    testServer,
    extensionContext,
    mcpClient,
  }) => {
    const page = await setupToolTest(mcpServer, testServer, extensionContext, mcpClient);

    const prefix = `e2e-logger-${Date.now()}`;
    await callToolExpectSuccess(mcpClient, mcpServer, 'e2e-test_log_levels', { prefix });

    // Wait for the log with the error level (last to be emitted)
    await waitForLog(mcpServer, `${prefix} error-message`, 15_000);

    // Every log line from the plugin should contain [plugin:e2e-test]
    const logLines = mcpServer.logs.filter(line => line.includes(prefix));
    expect(logLines.length).toBeGreaterThanOrEqual(4);
    for (const line of logLines) {
      expect(line).toContain('[plugin:e2e-test]');
    }

    await page.close();
  });

  test('multiple log_levels invocations accumulate in buffer', async ({
    mcpServer,
    testServer,
    extensionContext,
    mcpClient,
  }) => {
    const page = await setupToolTest(mcpServer, testServer, extensionContext, mcpClient);

    // First invocation
    const prefix1 = `e2e-multi1-${Date.now()}`;
    await callToolExpectSuccess(mcpClient, mcpServer, 'e2e-test_log_levels', { prefix: prefix1 });
    await waitForLog(mcpServer, `${prefix1} error-message`, 15_000);

    // Second invocation
    const prefix2 = `e2e-multi2-${Date.now()}`;
    await callToolExpectSuccess(mcpClient, mcpServer, 'e2e-test_log_levels', { prefix: prefix2 });
    await waitForLog(mcpServer, `${prefix2} error-message`, 15_000);

    // Both invocations' logs should be present
    const allLogs = mcpServer.logs.join('\n');
    expect(allLogs).toContain(`${prefix1} debug-message`);
    expect(allLogs).toContain(`${prefix2} debug-message`);

    // Buffer should contain entries from both invocations (at least 8 entries)
    await waitFor(
      async () => {
        const h = await fetchHealth(mcpServer.port, mcpServer.secret);
        const pluginDetail = h?.pluginDetails?.find(p => p.name === 'e2e-test');
        return (pluginDetail?.logBufferSize ?? 0) >= 8;
      },
      10_000,
      500,
      'log buffer to contain at least 8 entries',
    );

    await page.close();
  });
});
