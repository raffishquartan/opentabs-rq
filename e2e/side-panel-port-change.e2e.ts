/**
 * Side panel port change E2E test — verifies the footer's NumberStepper
 * port editor triggers a WebSocket reconnect to a different MCP server.
 *
 * Flow: change port in side panel → chrome.storage.local update →
 * port-changed message → offscreen reconnects WebSocket to new port.
 *
 * Uses manual setup (two MCP servers on different ports sharing the same
 * config dir / auth secret) instead of the standard extensionContext fixture.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Page } from '@playwright/test';
import type { McpServer } from './fixtures.js';
import {
  cleanupTestConfigDir,
  E2E_TEST_PLUGIN_DIR,
  expect,
  launchExtensionContext,
  readPluginToolNames,
  startMcpServer,
  test,
  writeTestConfig,
} from './fixtures.js';
import { openSidePanel, setupAdapterSymlink, waitForExtensionConnected } from './helpers.js';

test.describe('Side panel port change', () => {
  test('changing port in footer reconnects extension to new server', async () => {
    // 1. Set up config dir with e2e-test plugin
    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const prefixedToolNames = readPluginToolNames();
    const tools: Record<string, boolean> = {};
    for (const t of prefixedToolNames) {
      tools[t] = true;
    }

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-port-'));
    writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });

    // 2. Start server A on an ephemeral port
    const serverA = await startMcpServer(configDir, true);
    let serverB: McpServer | null = null;

    const { context, cleanupDir, extensionDir } = await launchExtensionContext(serverA.port, serverA.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      // 3. Wait for extension to connect to server A
      await waitForExtensionConnected(serverA);

      // 4. Open side panel and verify connected state (plugin card visible)
      const sidePanelPage = await openSidePanel(context);
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      // 5. Start server B on a different ephemeral port (same config dir → same auth secret)
      serverB = await startMcpServer(configDir, true);

      // 6. Change the port in the side panel's NumberStepper to server B's port.
      // The NumberStepper commits its value on blur or Enter key.
      const portInput = sidePanelPage.getByLabel('Server port');
      await portInput.fill(String(serverB.port));
      await portInput.press('Enter');

      // 7. Wait for extension to connect to server B
      await waitForExtensionConnected(serverB, 45_000);

      // 8. Verify server B /health shows extensionConnected === true
      const healthB = await serverB.health();
      expect(healthB).not.toBeNull();
      if (!healthB) throw new Error('healthB returned null');
      expect(healthB.extensionConnected).toBe(true);

      await sidePanelPage.close();
    } finally {
      await context.close().catch(() => {});
      await serverA.kill();
      if (serverB) await serverB.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });
});

test.describe('Side panel port stress', () => {
  const tick = (ms = 100) => new Promise(r => setTimeout(r, ms));
  const collectPageErrors = (page: Page): string[] => {
    const errors: string[] = [];
    page.on('pageerror', (err: Error) => errors.push(err.message));
    return errors;
  };

  test('boundary values are clamped by NumberStepper', async () => {
    test.slow();

    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const prefixedToolNames = readPluginToolNames();
    const tools: Record<string, boolean> = {};
    for (const t of prefixedToolNames) {
      tools[t] = true;
    }

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-port-boundary-'));
    writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });

    const server = await startMcpServer(configDir, true);
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);

      const sp = await openSidePanel(context);
      const pageErrors = collectPageErrors(sp);

      await expect(sp.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      const portInput = sp.getByLabel('Server port');
      const originalPort = await portInput.inputValue();

      // Fill 0 → should clamp to >= 1 on blur
      await portInput.fill('0');
      await portInput.blur();
      await tick(200);
      const clampedLow = Number(await portInput.inputValue());
      expect(clampedLow).toBeGreaterThanOrEqual(1);

      // Fill 99999 → should clamp to <= 65535 on blur
      await portInput.fill('99999');
      await portInput.blur();
      await tick(200);
      const clampedHigh = Number(await portInput.inputValue());
      expect(clampedHigh).toBeLessThanOrEqual(65535);

      // Restore original port to maintain connection
      await portInput.fill(originalPort);
      await portInput.press('Enter');
      await tick(500);

      // Verify the extension is still connected after restoring the port
      await expect(sp.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      expect(pageErrors).toEqual([]);

      await sp.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });

  test('entering same port does not cause unnecessary reconnect', async () => {
    test.slow();

    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const prefixedToolNames = readPluginToolNames();
    const tools: Record<string, boolean> = {};
    for (const t of prefixedToolNames) {
      tools[t] = true;
    }

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-port-same-'));
    writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });

    const server = await startMcpServer(configDir, true);
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);

      const sp = await openSidePanel(context);
      const pageErrors = collectPageErrors(sp);

      await expect(sp.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      const portInput = sp.getByLabel('Server port');
      const currentPort = await portInput.inputValue();

      // Fill the same port value and blur
      await portInput.fill(currentPort);
      await portInput.blur();
      await tick(500);

      // Verify no disconnect — plugin cards still visible, no error state
      await expect(sp.getByText('E2E Test')).toBeVisible();
      await expect(sp.getByText('Cannot Reach MCP Server')).not.toBeVisible();

      expect(pageErrors).toEqual([]);

      await sp.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });
});
