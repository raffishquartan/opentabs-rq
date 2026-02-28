/**
 * Permission system E2E tests — verifies that the browser tool permission
 * tier system evaluates correctly:
 *
 *   - Observe-tier tools (e.g. browser_list_tabs) auto-allow without confirmation
 *   - Interact/sensitive-tier tools on non-trusted domains trigger confirmation
 *     and block until a human responds in the side panel
 *
 * These tests start the MCP server WITHOUT skipConfirmation (overriding the
 * default E2E fixture that sets OPENTABS_SKIP_CONFIRMATION=1) and use
 * 127.0.0.2 as a non-trusted domain to exercise the confirmation flow.
 *
 * The default trustedDomains are ['localhost', '127.0.0.1'], so 127.0.0.2
 * is not trusted and interact/sensitive tools will require confirmation.
 */

import {
  createTestConfigDir,
  cleanupTestConfigDir,
  startMcpServer,
  startTestServer,
  launchExtensionContext,
  createMcpClient,
  symlinkCrossPlatform,
} from './fixtures.js';
import { waitForExtensionConnected, waitForLog, setupAdapterSymlink } from './helpers.js';
import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { McpClient, McpServer, TestServer } from './fixtures.js';
import type { BrowserContext } from '@playwright/test';

// ---------------------------------------------------------------------------
// Custom fixture — MCP server without skipConfirmation
// ---------------------------------------------------------------------------

interface PermissionFixtures {
  /** MCP server started WITHOUT OPENTABS_SKIP_CONFIRMATION. */
  mcpServer: McpServer;
  /** Controllable test web server (bound to 0.0.0.0 so 127.0.0.2 works). */
  testServer: TestServer;
  /** Chromium browser context with the extension loaded. */
  extensionContext: BrowserContext;
  /** MCP client pointed at this test's server. */
  mcpClient: McpClient;
}

const test = base.extend<PermissionFixtures>({
  mcpServer: async ({ browserName: _ }, use) => {
    const configDir = createTestConfigDir();
    // Start server with OPENTABS_SKIP_CONFIRMATION set to empty string
    // to disable the bypass. The check is `=== '1'`, so '' disables it.
    const server = await startMcpServer(configDir, true, undefined, {
      OPENTABS_SKIP_CONFIRMATION: '',
    });
    try {
      await use(server);
    } finally {
      await server.kill();
      cleanupTestConfigDir(configDir);
    }
  },

  testServer: async ({ browserName: _ }, use) => {
    const srv = await startTestServer();
    try {
      await use(srv);
    } finally {
      await srv.kill();
    }
  },

  extensionContext: async ({ mcpServer }, use) => {
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(mcpServer.port, mcpServer.secret);
    setupAdapterSymlink(mcpServer.configDir, extensionDir);

    // Symlink auth.json so the extension copy always sees the latest secret.
    const serverAuthJson = path.join(mcpServer.configDir, 'extension', 'auth.json');
    const extensionAuthJson = path.join(extensionDir, 'auth.json');
    fs.rmSync(extensionAuthJson, { force: true });
    symlinkCrossPlatform(serverAuthJson, extensionAuthJson, 'file');

    await use(context);
    await context.close();
    try {
      fs.rmSync(cleanupDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  },

  mcpClient: async ({ mcpServer }, use) => {
    const client = createMcpClient(mcpServer.port, mcpServer.secret);
    await client.initialize();
    await use(client);
    await client.close();
  },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Permission evaluation', () => {
  test('observe-tier tool (browser_list_tabs) succeeds without confirmation', async ({
    mcpServer,
    extensionContext: _ctx,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'tab.syncAll received');

    // browser_list_tabs is observe tier — should auto-allow even without
    // skipConfirmation, regardless of the domain.
    const result = await mcpClient.callTool('browser_list_tabs', {});
    expect(result.isError).toBe(false);
    // The result should contain a list of tabs (at least the blank tab)
    const parsed = JSON.parse(result.content) as unknown[];
    expect(Array.isArray(parsed)).toBe(true);
  });

  test('interact-tier tool on non-trusted domain triggers confirmation progress notification', async ({
    mcpServer,
    testServer,
    extensionContext: _ctx,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'tab.syncAll received');

    // Open a tab on the test server via 127.0.0.2 (non-trusted domain).
    // The test server listens on 0.0.0.0 via PORT=0, so 127.0.0.2 works.
    const nonTrustedUrl = testServer.url.replace('localhost', '127.0.0.2');
    const openResult = await mcpClient.callTool('browser_open_tab', { url: nonTrustedUrl });
    expect(openResult.isError).toBe(false);
    const tabInfo = JSON.parse(openResult.content) as { id: number };
    const tabId = tabInfo.id;

    // Wait for the page to load
    await new Promise(r => setTimeout(r, 1_000));

    // Call an interact-tier tool (browser_navigate_tab) on the non-trusted
    // domain. This should trigger the confirmation flow and send a progress
    // notification with 'approval' while waiting for human response.
    // The confirmation will time out after 30s, but we use callToolWithProgress
    // to capture the progress notification before that happens.
    const result = await mcpClient.callToolWithProgress(
      'browser_navigate_tab',
      { tabId, url: `${nonTrustedUrl}/interactive` },
      { timeout: 35_000 },
    );

    // The tool should have either timed out (CONFIRMATION_TIMEOUT) or
    // returned an error since no one responded to the confirmation dialog.
    expect(result.isError).toBe(true);
    expect(result.content).toContain('CONFIRMATION_TIMEOUT');

    // The MCP client should have received a progress notification
    // mentioning "approval" while the tool was pending confirmation.
    expect(result.progressNotifications.length).toBeGreaterThanOrEqual(1);
    const approvalNotif = result.progressNotifications.find(n => n.message?.toLowerCase().includes('approval'));
    expect(approvalNotif).toBeDefined();
  });
});
