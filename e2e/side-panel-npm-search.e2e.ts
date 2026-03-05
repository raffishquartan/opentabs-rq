/**
 * Side panel npm search E2E tests — verify the search → results → install flow
 * for npm plugins through the side panel UI.
 *
 * Tests hit the real npm registry for search results. The search debounce is
 * 300ms — after typing, Playwright waits for the 'Available' section header
 * which handles the timing naturally.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  cleanupTestConfigDir,
  E2E_TEST_PLUGIN_DIR,
  expect,
  launchExtensionContext,
  startMcpServer,
  test,
  writeTestConfig,
} from './fixtures.js';
import { openSidePanel, setupAdapterSymlink, waitForExtensionConnected } from './helpers.js';

test.describe('Side panel npm search', () => {
  test('searches for plugins and shows results under Available section', async () => {
    test.slow();

    // 1. Start MCP server with e2e-test plugin (no special npm env needed —
    // search always hits the real npm registry regardless of SKIP_NPM_DISCOVERY)
    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-search-'));
    writeTestConfig(configDir, {
      localPlugins: [absPluginPath],
      permissions: {
        'e2e-test': { permission: 'auto' },
        browser: { permission: 'auto' },
      },
    });

    const server = await startMcpServer(configDir, false);
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      // 2. Wait for extension to connect
      await waitForExtensionConnected(server);

      // 3. Open side panel and verify connected state
      const sidePanelPage = await openSidePanel(context);
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      // 4. Type 'opentabs' in the search input
      const searchInput = sidePanelPage.getByPlaceholder('Search plugins and tools...');
      await searchInput.fill('opentabs');

      // 5. Wait for the 'Available' section header to appear (confirms search
      // completed and npm results are rendered)
      await expect(sidePanelPage.getByText('Available')).toBeVisible({ timeout: 15_000 });

      // 6. Verify at least one Install button is visible (NpmPluginCard)
      await expect(sidePanelPage.getByRole('button', { name: 'Install' }).first()).toBeVisible();

      // 7. Clear the search bar
      await searchInput.fill('');

      // 8. Verify 'Available' section disappears when search is cleared
      await expect(sidePanelPage.getByText('Available')).toBeHidden({ timeout: 5_000 });

      await sidePanelPage.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });

  test('install plugin from search results via Install button', async () => {
    test.slow();

    const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-sp-install-'));
    const prefixDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-npm-sp-install-'));

    writeTestConfig(configDir, {
      localPlugins: [absPluginPath],
      permissions: {
        'e2e-test': { permission: 'auto' },
        browser: { permission: 'auto' },
      },
    });

    // Server needs npm discovery enabled (OPENTABS_SKIP_NPM_DISCOVERY: undefined)
    // and NPM_CONFIG_PREFIX to isolate the global install to a temp dir
    const server = await startMcpServer(configDir, false, undefined, {
      OPENTABS_SKIP_NPM_DISCOVERY: undefined,
      NPM_CONFIG_PREFIX: prefixDir,
    });
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);

      const sidePanelPage = await openSidePanel(context);
      await expect(sidePanelPage.getByText('E2E Test')).toBeVisible({ timeout: 30_000 });

      // Search for 'slack' to find the Slack plugin
      const searchInput = sidePanelPage.getByPlaceholder('Search plugins and tools...');
      await searchInput.fill('slack');

      // Wait for Available section with results
      await expect(sidePanelPage.getByText('Available')).toBeVisible({ timeout: 15_000 });
      const installButton = sidePanelPage.getByRole('button', { name: 'Install' }).first();
      await expect(installButton).toBeVisible();

      // Click Install on the first available plugin
      await installButton.click();

      // After install completes, handleSearchChange('') auto-clears the search.
      // The plugin then appears as a PluginCard in the main installed list.
      // Wait for the Slack plugin card to appear (accordion trigger with display name).
      // Use a generous timeout since npm install -g takes time.
      const slackCard = sidePanelPage.locator('button[aria-expanded]').filter({ hasText: 'Slack' });
      await expect(slackCard).toBeVisible({ timeout: 120_000 });

      // Verify the search was cleared (Available section gone)
      await expect(sidePanelPage.getByText('Available')).toBeHidden({ timeout: 5_000 });

      // Verify the plugin displays the correct name
      await expect(slackCard).toContainText('Slack');

      await sidePanelPage.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      fs.rmSync(prefixDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });
});
