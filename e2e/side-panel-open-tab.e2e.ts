/**
 * Side panel open tab E2E tests — verify the plugin icon click behavior:
 *
 * 1. Clicking the icon focuses a matching tab
 * 2. Repeated clicks cycle through multiple matching tabs (round-robin)
 * 3. Tooltip shows the correct tab count
 * 4. Clicking the icon opens the homepage when no matching tab exists
 * 5. After visiting and closing a tab, the icon remains clickable and opens a new tab
 */

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {
  cleanupTestConfigDir,
  E2E_TEST_PLUGIN_DIR,
  expect,
  launchExtensionContext,
  readPluginToolNames,
  startMcpServer,
  startTestServer,
  test,
  writeTestConfig,
} from './fixtures.js';
import { openSidePanel, setupAdapterSymlink, waitForExtensionConnected, waitForLog } from './helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Poll the MCP server /health until the e2e-test plugin reaches the expected tab state. */
const waitForPluginTabState = async (
  server: { port: number; secret: string | undefined },
  expected: string,
  timeoutMs = 30_000,
): Promise<void> => {
  await expect
    .poll(
      async () => {
        try {
          const res = await fetch(`http://localhost:${server.port}/health`, {
            headers: { Authorization: `Bearer ${server.secret ?? ''}` },
            signal: AbortSignal.timeout(3_000),
          });
          const body = (await res.json()) as {
            pluginDetails?: Array<{ name: string; tabState: string }>;
          };
          return body.pluginDetails?.find(p => p.name === 'e2e-test')?.tabState;
        } catch {
          return undefined;
        }
      },
      {
        timeout: timeoutMs,
        message: `Server tab state for e2e-test did not become '${expected}'`,
      },
    )
    .toBe(expected);
};

// ---------------------------------------------------------------------------
// Open tab feature — focus, cycle, and homepage open
// ---------------------------------------------------------------------------

test.describe('Side panel open tab', () => {
  test('clicking plugin icon focuses the matching tab', async () => {
    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const prefixedToolNames = readPluginToolNames();
    const tools: Record<string, boolean> = {};
    for (const t of prefixedToolNames) {
      tools[t] = true;
    }

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-opentab-focus-'));
    writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });

    const server = await startMcpServer(configDir, true);
    const testServer = await startTestServer();
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);
      await waitForLog(server, 'plugin(s) mapped', 15_000);

      // Open a matching tab
      const appTab = await context.newPage();
      await appTab.goto(testServer.url, { waitUntil: 'load' });

      // Wait for ready state
      await waitForPluginTabState(server, 'ready');

      // Open side panel and reload to pick up tab state
      const sidePanelPage = await openSidePanel(context);
      await sidePanelPage.reload({ waitUntil: 'load' });
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      // Find the icon button by aria-label (tooltip text for ready state with 1 tab)
      const iconButton = sidePanelPage.locator('button[aria-label="Open E2E Test"]');
      await expect(iconButton).toBeVisible({ timeout: 5_000 });
      await expect(iconButton).toBeEnabled();

      // Bring the side panel to front (it may already be active)
      await sidePanelPage.bringToFront();

      // Click the icon — it should focus the matching tab
      await iconButton.click();

      // Verify the app tab became the active page. In Playwright, the page
      // that received focus gets a 'focus' event. We verify by checking that
      // the app tab's URL is still the test server URL (it wasn't closed).
      // Since Playwright BrowserContext doesn't have a direct "active tab" API,
      // we verify by bringing the side panel to front again and checking that
      // the app tab was focused via the round-trip.
      // A more reliable check: verify the appTab page received focus.
      await expect
        .poll(() => appTab.evaluate(() => document.hasFocus()), {
          timeout: 5_000,
          message: 'App tab did not receive focus after clicking the icon',
        })
        .toBe(true);

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

  test('clicking plugin icon cycles through multiple tabs', async () => {
    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const prefixedToolNames = readPluginToolNames();
    const tools: Record<string, boolean> = {};
    for (const t of prefixedToolNames) {
      tools[t] = true;
    }

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-opentab-cycle-'));
    writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });

    const server = await startMcpServer(configDir, true);
    const testServer = await startTestServer();
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);
      await waitForLog(server, 'plugin(s) mapped', 15_000);

      // Open two matching tabs
      const appTab1 = await context.newPage();
      await appTab1.goto(testServer.url, { waitUntil: 'load' });

      await waitForPluginTabState(server, 'ready');

      const appTab2 = await context.newPage();
      await appTab2.goto(testServer.url, { waitUntil: 'load' });

      // Wait for the server to report both tabs (ready state is maintained with 2 tabs)
      // Poll /health until we see 2 tabs in the plugin details
      await expect
        .poll(
          async () => {
            try {
              const res = await fetch(`http://localhost:${server.port}/health`, {
                headers: { Authorization: `Bearer ${server.secret ?? ''}` },
                signal: AbortSignal.timeout(3_000),
              });
              const body = (await res.json()) as {
                pluginDetails?: Array<{ name: string; tabs?: Array<{ tabId: number }> }>;
              };
              return body.pluginDetails?.find(p => p.name === 'e2e-test')?.tabs?.length ?? 0;
            } catch {
              return 0;
            }
          },
          {
            timeout: 30_000,
            message: 'Server did not report 2 tabs for e2e-test plugin',
          },
        )
        .toBeGreaterThanOrEqual(2);

      // Open side panel and reload to pick up tab state
      const sidePanelPage = await openSidePanel(context);
      await sidePanelPage.reload({ waitUntil: 'load' });
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      // The tooltip should show the tab count for 2 tabs
      const iconButton = sidePanelPage.locator('button[aria-label="Open E2E Test (2 tabs)"]');
      await expect(iconButton).toBeVisible({ timeout: 5_000 });

      // appTab2 was opened last, so it is the currently active tab. Verify
      // that the first click focuses appTab1 (the non-active tab) — this is
      // the regression case where the old code would re-focus the active tab.
      await sidePanelPage.bringToFront();
      await iconButton.click();

      await expect
        .poll(() => appTab1.evaluate(() => document.hasFocus()).catch(() => false), {
          timeout: 5_000,
          message: 'First click should focus the non-active tab (appTab1), not the already-active appTab2',
        })
        .toBe(true);

      // Second click — should cycle to appTab2
      await sidePanelPage.bringToFront();
      await iconButton.click();

      await expect
        .poll(() => appTab2.evaluate(() => document.hasFocus()).catch(() => false), {
          timeout: 5_000,
          message: 'Second click did not cycle to appTab2',
        })
        .toBe(true);

      // Third click — should cycle back to appTab1
      await sidePanelPage.bringToFront();
      await iconButton.click();

      await expect
        .poll(() => appTab1.evaluate(() => document.hasFocus()).catch(() => false), {
          timeout: 5_000,
          message: 'Third click did not cycle back to appTab1',
        })
        .toBe(true);

      await sidePanelPage.close();
      await appTab1.close();
      await appTab2.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      await testServer.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });

  test('icon shows correct tooltip with tab count', async () => {
    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const prefixedToolNames = readPluginToolNames();
    const tools: Record<string, boolean> = {};
    for (const t of prefixedToolNames) {
      tools[t] = true;
    }

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-opentab-tooltip-'));
    writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });

    const server = await startMcpServer(configDir, true);
    const testServer = await startTestServer();
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);
      await waitForLog(server, 'plugin(s) mapped', 15_000);

      // Open side panel with no matching tabs (closed state, has homepage)
      const sidePanelPage = await openSidePanel(context);
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      // When closed and has homepage, the tooltip says "Open {name} in new tab"
      const closedButton = sidePanelPage.locator('button[aria-label="Open E2E Test in new tab"]');
      await expect(closedButton).toBeVisible({ timeout: 5_000 });

      // Open one matching tab
      const appTab1 = await context.newPage();
      await appTab1.goto(testServer.url, { waitUntil: 'load' });
      await waitForPluginTabState(server, 'ready');

      // Reload side panel to pick up updated state
      await sidePanelPage.reload({ waitUntil: 'load' });
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 15_000 });

      // With 1 tab, tooltip should be "Open E2E Test" (no count)
      const singleTabButton = sidePanelPage.locator('button[aria-label="Open E2E Test"]');
      await expect(singleTabButton).toBeVisible({ timeout: 5_000 });

      // Open a second matching tab
      const appTab2 = await context.newPage();
      await appTab2.goto(testServer.url, { waitUntil: 'load' });

      // Wait for 2 tabs to be reported
      await expect
        .poll(
          async () => {
            try {
              const res = await fetch(`http://localhost:${server.port}/health`, {
                headers: { Authorization: `Bearer ${server.secret ?? ''}` },
                signal: AbortSignal.timeout(3_000),
              });
              const body = (await res.json()) as {
                pluginDetails?: Array<{ name: string; tabs?: Array<{ tabId: number }> }>;
              };
              return body.pluginDetails?.find(p => p.name === 'e2e-test')?.tabs?.length ?? 0;
            } catch {
              return 0;
            }
          },
          { timeout: 30_000, message: 'Server did not report 2 tabs' },
        )
        .toBeGreaterThanOrEqual(2);

      // Reload side panel
      await sidePanelPage.reload({ waitUntil: 'load' });
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 15_000 });

      // With 2 tabs, tooltip should show count
      const multiTabButton = sidePanelPage.locator('button[aria-label="Open E2E Test (2 tabs)"]');
      await expect(multiTabButton).toBeVisible({ timeout: 5_000 });

      await sidePanelPage.close();
      await appTab1.close();
      await appTab2.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      await testServer.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });

  test('clicking icon opens homepage when no matching tab exists', async () => {
    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const prefixedToolNames = readPluginToolNames();
    const tools: Record<string, boolean> = {};
    for (const t of prefixedToolNames) {
      tools[t] = true;
    }

    // Start a minimal HTTP server on the homepage port (9876) so the opened
    // tab stays at http://localhost:9876/ instead of navigating to chrome-error://.
    // Handle EADDRINUSE gracefully — another parallel test may already hold the port.
    const homepageServer = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body>Homepage</body></html>');
    });
    await new Promise<void>((resolve, reject) => {
      homepageServer.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          // Port 9876 is taken by another test — listen on dynamic port.
          // The tab will still navigate to port 9876 (served by the other test).
          homepageServer.listen(0, resolve);
        } else {
          reject(err);
        }
      });
      homepageServer.listen(9876, resolve);
    });

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-opentab-homepage-'));
    writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });

    const server = await startMcpServer(configDir, true);
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);
      await waitForLog(server, 'plugin(s) mapped', 15_000);

      // Open side panel with no matching tabs — plugin is in 'closed' state
      const sidePanelPage = await openSidePanel(context);
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      // The e2e-test plugin has homepage http://localhost:9876, so in closed
      // state the icon button should be enabled with "Open ... in new tab" tooltip.
      const iconButton = sidePanelPage.locator('button[aria-label="Open E2E Test in new tab"]');
      await expect(iconButton).toBeVisible({ timeout: 5_000 });
      await expect(iconButton).toBeEnabled();

      // Click the icon — should open a new tab at the homepage URL.
      // Use waitForEvent('page') to capture the new tab created by
      // chrome.tabs.create in the background script.
      const [newPage] = await Promise.all([context.waitForEvent('page', { timeout: 15_000 }), iconButton.click()]);

      // Verify the new page URL matches the plugin's homepage
      await expect
        .poll(() => newPage.url(), {
          timeout: 10_000,
          message: 'New page URL did not match homepage (localhost:9876)',
        })
        .toContain('localhost:9876');

      // After the new tab opens, the plugin should transition from 'closed' to
      // 'unavailable' or 'ready' (the homepage matches urlPatterns http://localhost/*)
      await expect
        .poll(
          async () => {
            try {
              const res = await fetch(`http://localhost:${server.port}/health`, {
                headers: { Authorization: `Bearer ${server.secret ?? ''}` },
                signal: AbortSignal.timeout(3_000),
              });
              const body = (await res.json()) as {
                pluginDetails?: Array<{ name: string; tabState: string }>;
              };
              return body.pluginDetails?.find(p => p.name === 'e2e-test')?.tabState;
            } catch {
              return undefined;
            }
          },
          {
            timeout: 30_000,
            message: 'Plugin did not transition from closed after homepage tab opened',
          },
        )
        .not.toBe('closed');

      await sidePanelPage.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      homepageServer.close();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });

  test('clicking icon opens new tab after visiting and closing a matching tab', async () => {
    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const prefixedToolNames = readPluginToolNames();
    const tools: Record<string, boolean> = {};
    for (const t of prefixedToolNames) {
      tools[t] = true;
    }

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-opentab-lastseen-'));
    writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });

    const server = await startMcpServer(configDir, true);
    const testServer = await startTestServer();
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);
      await waitForLog(server, 'plugin(s) mapped', 15_000);

      // 1. Open a matching tab at the test server URL (dynamic port).
      //    This causes the extension to persist the test server URL as the last-seen URL.
      const appTab = await context.newPage();
      await appTab.goto(testServer.url, { waitUntil: 'load' });

      // 2. Wait for plugin to become ready (adapter injected and isReady() passes)
      await waitForPluginTabState(server, 'ready');

      // 3. Close the matching tab — the last-seen URL is now persisted in chrome.storage.local
      await appTab.close();

      // 4. Wait for plugin to transition to 'closed' (no matching tabs)
      await waitForPluginTabState(server, 'closed');

      // 5. Open side panel and verify the plugin shows as NOT CONNECTED (faded ghost border)
      const sidePanelPage = await openSidePanel(context);
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      const e2ePluginCard = sidePanelPage.locator('button[aria-expanded]').filter({ hasText: 'E2E Test' });
      await expect(e2ePluginCard.locator('xpath=..').locator('[class*="border-border/30"]')).toBeVisible({
        timeout: 5_000,
      });

      // 6. The icon must be clickable in closed state (homepage and/or last-seen URL available).
      //    The e2e-test plugin has a homepage, so the tooltip says "Open ... in new tab".
      const iconButton = sidePanelPage.locator('button[aria-label="Open E2E Test in new tab"]');
      await expect(iconButton).toBeVisible({ timeout: 5_000 });
      await expect(iconButton).toBeEnabled();

      // 7. Click the icon — opens a new tab via chrome.tabs.create (homepage or last-seen URL).
      //    Track initial page count to detect the new page.
      const pageCountBefore = context.pages().length;
      await iconButton.click();

      // 8. Verify a new page was created by chrome.tabs.create. The page may end up at
      //    the homepage URL (localhost:9876) or the last-seen URL depending on fallback
      //    chain. If nothing is listening on the target port, the page navigates to
      //    chrome-error:// — but the key assertion is that a new page was created.
      await expect
        .poll(() => context.pages().length, {
          timeout: 15_000,
          message: 'No new page was created after clicking the plugin icon',
        })
        .toBeGreaterThan(pageCountBefore);

      await sidePanelPage.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      await testServer.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });
});

test.describe('stress', () => {
  test('rapid icon clicks with multiple tabs cause no crash', async () => {
    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const prefixedToolNames = readPluginToolNames();
    const tools: Record<string, boolean> = {};
    for (const t of prefixedToolNames) {
      tools[t] = true;
    }

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-opentab-stress-'));
    writeTestConfig(configDir, { localPlugins: [absPluginPath], tools });

    let server: Awaited<ReturnType<typeof startMcpServer>> | undefined;
    let testServer: Awaited<ReturnType<typeof startTestServer>> | undefined;
    let context: Awaited<ReturnType<typeof launchExtensionContext>>['context'] | undefined;
    let cleanupDir: string | undefined;

    const pageErrors: Error[] = [];

    try {
      server = await startMcpServer(configDir, true);
      testServer = await startTestServer();
      const ext = await launchExtensionContext(server.port, server.secret);
      context = ext.context;
      cleanupDir = ext.cleanupDir;
      setupAdapterSymlink(configDir, ext.extensionDir);

      await waitForExtensionConnected(server);
      await waitForLog(server, 'plugin(s) mapped', 15_000);

      // Open 3 matching tabs
      const tabs = [];
      for (let i = 0; i < 3; i++) {
        const tab = await context.newPage();
        await tab.goto(testServer.url, { waitUntil: 'load' });
        tabs.push(tab);
      }

      // Wait for plugin to reach ready state with 3 tabs
      await expect
        .poll(
          async () => {
            try {
              const res = await fetch(`http://localhost:${server?.port}/health`, {
                headers: { Authorization: `Bearer ${server?.secret ?? ''}` },
                signal: AbortSignal.timeout(3_000),
              });
              const body = (await res.json()) as {
                pluginDetails?: Array<{ name: string; tabs?: Array<{ tabId: number }> }>;
              };
              return body.pluginDetails?.find(p => p.name === 'e2e-test')?.tabs?.length ?? 0;
            } catch {
              return 0;
            }
          },
          {
            timeout: 30_000,
            message: 'Server did not report 3 tabs for e2e-test plugin',
          },
        )
        .toBeGreaterThanOrEqual(3);

      // Open side panel
      const sidePanelPage = await openSidePanel(context);
      sidePanelPage.on('pageerror', error => pageErrors.push(error));
      await sidePanelPage.reload({ waitUntil: 'load' });
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      // Find the plugin icon button (3 tabs → shows tab count)
      const iconButton = sidePanelPage.locator('button[aria-label="Open E2E Test (3 tabs)"]');
      await expect(iconButton).toBeVisible({ timeout: 5_000 });

      // Click the plugin icon 10x rapidly with 100ms between clicks
      for (let i = 0; i < 10; i++) {
        await sidePanelPage.bringToFront();
        await iconButton.click();
        await new Promise(r => setTimeout(r, 100));
      }

      // Verify no crash — side panel still renders
      await sidePanelPage.bringToFront();
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 5_000 });

      // Assert zero pageerror events
      expect(pageErrors).toHaveLength(0);

      await sidePanelPage.close();
      for (const tab of tabs) {
        await tab.close();
      }
    } finally {
      await context?.close().catch(() => {});
      await server?.kill();
      await testServer?.kill();
      if (cleanupDir) fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });
});
