/**
 * Approval wait E2E tests — verifies the optional approval timeout for plugin
 * tools and the withdrawal of settled prompts across browser profiles:
 *
 *   - An unattended plugin 'ask' call fails with the approval timeout error
 *     once approvalTimeoutSeconds elapses, and its dialog disappears.
 *   - When the real profile allows a prompt, a second profile (simulated by a
 *     raw WebSocket) receives confirmation.cancel for the same id.
 *
 * Badge and side panel removal on confirmation.cancel are covered by the
 * browser extension unit tests.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import type { McpClient, McpServer } from './fixtures.js';
import {
  cleanupTestConfigDir,
  createMcpClient,
  createRawWsConnection,
  createTestConfigDir,
  launchExtensionContext,
  readTestConfig,
  startMcpServer,
  symlinkCrossPlatform,
  writeTestConfig,
} from './fixtures.js';
import { openSidePanel, setupAdapterSymlink, waitForExtensionConnected, waitForLog } from './helpers.js';

// ---------------------------------------------------------------------------
// Fixtures — MCP server with permission prompts enabled
// ---------------------------------------------------------------------------

interface ApprovalWaitFixtures {
  /** MCP server started WITHOUT OPENTABS_DANGEROUSLY_SKIP_PERMISSIONS. */
  mcpServer: McpServer;
  /** Chromium browser context with the extension loaded. */
  extensionContext: BrowserContext;
  /** MCP client pointed at this test's server. */
  mcpClient: McpClient;
}

const test = base.extend<ApprovalWaitFixtures>({
  mcpServer: async ({ browserName: _ }, use) => {
    const configDir = createTestConfigDir();
    // The bypass check is `=== '1'`, so an empty string keeps prompts enabled.
    const server = await startMcpServer(configDir, true, undefined, {
      OPENTABS_DANGEROUSLY_SKIP_PERMISSIONS: '',
    });
    try {
      await use(server);
    } finally {
      await server.kill();
      cleanupTestConfigDir(configDir);
    }
  },

  extensionContext: async ({ mcpServer }, use) => {
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(mcpServer.port, mcpServer.secret);
    setupAdapterSymlink(mcpServer.configDir, extensionDir);

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
// Helpers
// ---------------------------------------------------------------------------

/** Set the e2e-test plugin to 'ask' with the given approval timeout, then reload the server. */
const configureAskWithTimeout = async (mcpServer: McpServer, approvalTimeoutSeconds: number): Promise<void> => {
  const config = readTestConfig(mcpServer.configDir);
  config.permissions = { ...config.permissions, 'e2e-test': { permission: 'ask' } };
  config.approvalTimeoutSeconds = approvalTimeoutSeconds;
  writeTestConfig(mcpServer.configDir, config);

  mcpServer.logs.length = 0;
  mcpServer.triggerHotReload();
  await waitForLog(mcpServer, 'Hot reload complete', 20_000);
  await waitForExtensionConnected(mcpServer);
  await waitForLog(mcpServer, 'plugin(s) mapped');
};

const confirmationDialog = (sidePanel: Page) => sidePanel.locator('[role="dialog"]');

/** Wait for a raw WebSocket to receive a JSON-RPC message matching a predicate. */
const waitForWsMessage = (
  ws: WebSocket,
  predicate: (msg: Record<string, unknown>) => boolean,
  timeoutMs = 15_000,
): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeEventListener('message', handler);
      reject(new Error(`waitForWsMessage timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    const handler = (event: MessageEvent): void => {
      const data = JSON.parse(String(event.data)) as Record<string, unknown>;
      if (predicate(data)) {
        clearTimeout(timer);
        ws.removeEventListener('message', handler);
        resolve(data);
      }
    };
    ws.addEventListener('message', handler);
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Approval timeout', () => {
  test('unattended plugin ask call returns the timeout error and the dialog disappears', async ({
    mcpServer,
    extensionContext,
    mcpClient,
  }) => {
    await configureAskWithTimeout(mcpServer, 2);
    const sidePanel = await openSidePanel(extensionContext);

    const [result] = await Promise.all([
      mcpClient.callTool('e2e-test__echo', { message: 'unattended' }, { timeout: 35_000 }),
      confirmationDialog(sidePanel).waitFor({ state: 'visible', timeout: 15_000 }),
    ]);

    expect(result.isError).toBe(true);
    expect(result.content).toContain('was not approved within 2s; it did not run');
    expect(result.content).not.toContain('denied');
    expect(result.content).not.toContain('not connected');

    await expect(confirmationDialog(sidePanel)).toBeHidden({ timeout: 10_000 });
  });
});

test.describe('Prompt withdrawal across profiles', () => {
  test('allowing in the real profile sends confirmation.cancel to the other profile', async ({
    mcpServer,
    extensionContext,
    mcpClient,
  }) => {
    await configureAskWithTimeout(mcpServer, 0);
    const sidePanel = await openSidePanel(extensionContext);

    const otherProfile = await createRawWsConnection(mcpServer.port, mcpServer.secret, 'conn-other-profile');
    try {
      await mcpServer.waitForHealth(h => h.extensionConnections >= 2, 10_000);

      const requestSeen = waitForWsMessage(otherProfile, msg => msg.method === 'confirmation.request');
      const toolCall = mcpClient.callTool('e2e-test__echo', { message: 'withdrawn' }, { timeout: 35_000 });

      const request = await requestSeen;
      const id = (request.params as { id: string }).id;
      const cancelSeen = waitForWsMessage(otherProfile, msg => msg.method === 'confirmation.cancel');

      await confirmationDialog(sidePanel).waitFor({ state: 'visible', timeout: 15_000 });
      await sidePanel.getByRole('button', { name: 'Allow' }).click();

      const cancel = await cancelSeen;
      expect(cancel.params).toEqual({ id });

      // The call was approved, so whatever it returns is not an approval failure.
      const result = await toolCall;
      expect(result.content).not.toContain('denied by the user');
      expect(result.content).not.toContain('was not approved within');
    } finally {
      otherProfile.close();
    }
  });
});
