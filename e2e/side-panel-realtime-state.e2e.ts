/**
 * Side panel real-time state propagation E2E tests — verify state changes
 * propagate to the side panel in real-time via push notifications, without
 * requiring a side panel reload.
 *
 * These tests exercise the background-only communication architecture where:
 *   1. Tool config change via config reload → plugins.changed → side panel updates
 *   2. Tab state changes (auth, close) → tab.stateChanged → side panel updates
 *   3. Browser tool policy change via config reload → plugins.changed → side panel updates
 *   4. Server disconnect/reconnect → side panel recovers all states
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  cleanupTestConfigDir,
  createMcpClient,
  E2E_TEST_PLUGIN_DIR,
  expect,
  launchExtensionContext,
  readPluginToolNames,
  readTestConfig,
  startMcpServer,
  startTestServer,
  test,
  writeTestConfig,
} from './fixtures.js';
import {
  BROWSER_TOOL_NAMES,
  openSidePanel,
  setupAdapterSymlink,
  waitForExtensionConnected,
  waitForLog,
} from './helpers.js';

/** Build a tools map from the e2e-test plugin's prefixed tool names. */
const buildToolsMap = (): Record<string, boolean> => {
  const tools: Record<string, boolean> = {};
  for (const t of readPluginToolNames()) {
    tools[t] = true;
  }
  return tools;
};

// ---------------------------------------------------------------------------
// Real-time state propagation tests
// ---------------------------------------------------------------------------

test.describe('Side panel real-time state propagation', () => {
  test('tool config change reflects in side panel without reload', async () => {
    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const tools = buildToolsMap();

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-realtime-tool-'));
    writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });

    const server = await startMcpServer(configDir, true);
    const mcpClient = createMcpClient(server.port, server.secret);
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);
      await waitForLog(server, 'tab.syncAll received', 15_000);
      await waitForLog(server, 'Config watcher: Watching', 10_000);
      await mcpClient.initialize();

      // Open side panel and expand the plugin card
      const sidePanelPage = await openSidePanel(context);
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      const pluginCard = sidePanelPage.locator('button[aria-expanded]').filter({ hasText: 'E2E Test' });
      await pluginCard.click();

      // Verify echo tool toggle is initially enabled
      const echoToggle = sidePanelPage.locator('button[role="switch"][aria-label="Toggle echo tool"]');
      await expect(echoToggle).toBeVisible({ timeout: 5_000 });
      await expect(echoToggle).toHaveAttribute('aria-checked', 'true', { timeout: 5_000 });

      // Disable the echo tool by modifying config.json and triggering reload.
      // This sends plugins.changed to the extension → background updates cache →
      // side panel receives the push and updates without reload.
      const disabledTools = { ...tools, 'e2e-test_echo': false };
      writeTestConfig(configDir, { localPlugins: [absPluginPath], tools: disabledTools });
      await waitForLog(server, 'Config reload complete', 10_000);

      // Verify the side panel toggle reflects disabled state WITHOUT reloading
      await expect(echoToggle).toHaveAttribute('aria-checked', 'false', { timeout: 10_000 });

      // Verify the MCP server also sees it as disabled via tools/list
      await expect
        .poll(
          async () => {
            const toolList = await mcpClient.listTools();
            return toolList.some(t => t.name === 'e2e-test_echo');
          },
          { timeout: 15_000, message: 'MCP server did not reflect echo tool as disabled' },
        )
        .toBe(false);

      // Re-enable the tool via config change
      writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });
      server.logs.length = 0;
      await waitForLog(server, 'Config reload complete', 10_000);

      // Verify the side panel toggle reflects re-enabled state WITHOUT reloading
      await expect(echoToggle).toHaveAttribute('aria-checked', 'true', { timeout: 10_000 });

      await sidePanelPage.close();
    } finally {
      await mcpClient.close().catch(() => {});
      await context.close().catch(() => {});
      await server.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });

  test('auth off then tab reload shows amber dot without side panel reload', async () => {
    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const tools = buildToolsMap();

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-realtime-auth-'));
    writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });

    const server = await startMcpServer(configDir, true);
    const testServer = await startTestServer();
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);
      await waitForLog(server, 'tab.syncAll received', 15_000);

      // Open side panel
      const sidePanelPage = await openSidePanel(context);
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      const e2ePluginCard = sidePanelPage.locator('button[aria-expanded]').filter({ hasText: 'E2E Test' });

      // Open a matching tab (auth is ON by default → ready state)
      const appTab = await context.newPage();
      await appTab.goto(testServer.url, { waitUntil: 'load' });

      // Wait for the green dot (ready state) to appear via real-time push
      await expect(e2ePluginCard.locator('.bg-success')).toBeVisible({ timeout: 30_000 });

      // Toggle auth OFF on the test server
      await testServer.setAuth(false);

      // Reload the app tab to trigger a tab state recheck
      await appTab.reload({ waitUntil: 'load' });

      // Verify the amber dot (unavailable state) appears WITHOUT reloading the side panel.
      // The background pushes tab.stateChanged → side panel updates instantly.
      await expect(e2ePluginCard.locator('.bg-primary.rounded-full')).toBeVisible({
        timeout: 10_000,
      });

      // Toggle auth back ON and verify recovery to green dot
      await testServer.setAuth(true);
      await appTab.reload({ waitUntil: 'load' });

      await expect(e2ePluginCard.locator('.bg-success')).toBeVisible({ timeout: 10_000 });

      await sidePanelPage.close();
      await appTab.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      await testServer.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });

  test('closing matching tab removes dot without side panel reload', async () => {
    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const tools = buildToolsMap();

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-realtime-close-'));
    writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });

    const server = await startMcpServer(configDir, true);
    const testServer = await startTestServer();
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);
      await waitForLog(server, 'tab.syncAll received', 15_000);

      // Open side panel
      const sidePanelPage = await openSidePanel(context);
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      const e2ePluginCard = sidePanelPage.locator('button[aria-expanded]').filter({ hasText: 'E2E Test' });

      // Verify no dot initially (no matching tab)
      await expect(e2ePluginCard.locator('.bg-success')).toBeHidden({ timeout: 5_000 });

      // Open a matching tab → green dot appears via real-time push
      const appTab = await context.newPage();
      await appTab.goto(testServer.url, { waitUntil: 'load' });

      await expect(e2ePluginCard.locator('.bg-success')).toBeVisible({ timeout: 30_000 });

      // Close the matching tab → dot should disappear WITHOUT reloading side panel
      await appTab.close();

      await expect(e2ePluginCard.locator('.bg-success')).toBeHidden({ timeout: 10_000 });

      await sidePanelPage.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      await testServer.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });

  test('browser tool policy change reflects in side panel without reload', async () => {
    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const tools = buildToolsMap();

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-realtime-btool-'));
    writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });

    const server = await startMcpServer(configDir, true);
    const mcpClient = createMcpClient(server.port, server.secret);
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);
      await waitForLog(server, 'tab.syncAll received', 15_000);
      await waitForLog(server, 'Config watcher: Watching', 10_000);
      await mcpClient.initialize();

      // Open side panel and expand the Browser tools card
      const sidePanelPage = await openSidePanel(context);
      await expect(sidePanelPage.getByText('Browser')).toBeVisible({ timeout: 30_000 });

      const browserCard = sidePanelPage.locator('button[aria-expanded]').filter({ hasText: 'Browser' });
      await browserCard.click();

      // Pick a browser tool to toggle
      const targetBrowserTool = BROWSER_TOOL_NAMES[0] ?? 'browser_list_tabs';
      const toolToggle = sidePanelPage.locator(`button[role="switch"][aria-label="Toggle ${targetBrowserTool} tool"]`);
      await expect(toolToggle).toBeVisible({ timeout: 5_000 });
      await expect(toolToggle).toHaveAttribute('aria-checked', 'true', { timeout: 5_000 });

      // Disable the browser tool by writing browserToolPolicy to config.json
      const config = readTestConfig(configDir);
      const configWithPolicy = {
        ...config,
        browserToolPolicy: { [targetBrowserTool]: false },
      };
      writeTestConfig(configDir, configWithPolicy as typeof config);
      await waitForLog(server, 'Config reload complete', 10_000);

      // Verify the side panel toggle reflects disabled state WITHOUT reloading
      await expect(toolToggle).toHaveAttribute('aria-checked', 'false', { timeout: 10_000 });

      // Verify the tool is also removed from MCP tools/list
      await expect
        .poll(
          async () => {
            const toolList = await mcpClient.listTools();
            return toolList.some(t => t.name === targetBrowserTool);
          },
          { timeout: 15_000, message: `MCP server did not reflect ${targetBrowserTool} as disabled` },
        )
        .toBe(false);

      // Re-enable the browser tool by removing the policy
      const configWithoutPolicy = { ...config };
      delete (configWithoutPolicy as Record<string, unknown>).browserToolPolicy;
      writeTestConfig(configDir, configWithoutPolicy as typeof config);
      server.logs.length = 0;
      await waitForLog(server, 'Config reload complete', 10_000);

      // Verify the side panel toggle reflects re-enabled state WITHOUT reloading
      await expect(toolToggle).toHaveAttribute('aria-checked', 'true', { timeout: 10_000 });

      await sidePanelPage.close();
    } finally {
      await mcpClient.close().catch(() => {});
      await context.close().catch(() => {});
      await server.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });

  test('server disconnect and reconnect recovers all states', async () => {
    test.slow();

    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const tools = buildToolsMap();

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-realtime-reconn-'));
    writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });

    const server = await startMcpServer(configDir, true);
    const testServer = await startTestServer();
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);
      await waitForLog(server, 'tab.syncAll received', 15_000);

      // Open a matching tab and wait for ready state
      const appTab = await context.newPage();
      await appTab.goto(testServer.url, { waitUntil: 'load' });

      // Open side panel and verify plugin card with green dot
      const sidePanelPage = await openSidePanel(context);
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      const e2ePluginCard = sidePanelPage.locator('button[aria-expanded]').filter({ hasText: 'E2E Test' });
      await expect(e2ePluginCard.locator('.bg-success')).toBeVisible({ timeout: 30_000 });

      // Trigger hot reload (simulates server disconnect/reconnect)
      server.logs.length = 0;
      server.triggerHotReload();

      // Verify disconnect state appears during the reload window.
      // The side panel should show "Cannot Reach MCP Server" when the WebSocket drops.
      await expect(sidePanelPage.getByText('Cannot Reach MCP Server')).toBeVisible({
        timeout: 30_000,
      });

      await waitForLog(server, 'Hot reload complete', 20_000);
      await waitForExtensionConnected(server, 30_000);

      // After reconnect, verify plugin card reappears (from sync.full → plugins.changed)
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      // Verify green dot recovers (from sendTabSyncAll → tab.stateChanged push)
      await expect(e2ePluginCard.locator('.bg-success')).toBeVisible({ timeout: 30_000 });

      // Expand plugin card and verify tool toggles are correct
      await e2ePluginCard.click();
      const echoToggle = sidePanelPage.locator('button[role="switch"][aria-label="Toggle echo tool"]');
      await expect(echoToggle).toBeVisible({ timeout: 5_000 });
      await expect(echoToggle).toHaveAttribute('aria-checked', 'true', { timeout: 5_000 });

      await sidePanelPage.close();
      await appTab.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      await testServer.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });
});
