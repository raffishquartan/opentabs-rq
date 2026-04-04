/**
 * Extension hash mismatch detection and reload dialog E2E tests.
 *
 * Tests the content-hash-based extension update detection introduced by
 * US-001..US-004. When the server sends a different extensionHash than the
 * running side panel's frozen window.__EXTENSION_HASH__, a blocking
 * ExtensionUpdateDialog appears prompting the user to reload.
 *
 * Hash flow:
 *   build → .extension-hash file + window.__EXTENSION_HASH__ in bundle →
 *   server reads .extension-hash from configDir/extension/ →
 *   sync.full includes extensionHash → side panel compares against
 *   window.__EXTENSION_HASH__ → mismatch → dialog
 *
 * The extension copy (from createExtensionCopy / launchExtensionContext) is
 * made from platform/browser-extension/, which has the build hash embedded.
 * The server reads .extension-hash from configDir/extension/ — tests control
 * this by writing to that path directly.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  cleanupTestConfigDir,
  expect,
  launchExtensionContext,
  ROOT,
  startMcpServer,
  test,
  writeTestConfig,
} from './fixtures.js';
import { openSidePanel, setupAdapterSymlink, waitForExtensionConnected, waitForLog } from './helpers.js';

/** Read the build hash from the source extension directory. */
const readBuildHash = (): string => {
  const hashPath = path.join(ROOT, 'platform/browser-extension/.extension-hash');
  return fs.readFileSync(hashPath, 'utf-8').trim();
};

/** Write a hash to the configDir's extension directory (where the server reads it). */
const writeServerHash = (configDir: string, hash: string): void => {
  const extensionDir = path.join(configDir, 'extension');
  fs.mkdirSync(extensionDir, { recursive: true });
  fs.writeFileSync(path.join(extensionDir, '.extension-hash'), `${hash}\n`, 'utf-8');
};

// ---------------------------------------------------------------------------
// Extension update dialog tests
// ---------------------------------------------------------------------------

test.describe('Extension update dialog — hash mismatch detection', () => {
  test('dialog appears when server extensionHash differs from running hash', async () => {
    test.slow();

    // Write a FAKE hash so the server sends a different hash than the side panel has
    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-ext-update-mismatch-'));
    writeTestConfig(configDir, { localPlugins: [] });
    writeServerHash(configDir, 'aaaa1111bbbb2222');

    const server = await startMcpServer(configDir, true);
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);

      const sidePanelPage = await openSidePanel(context);

      // The server sends hash 'aaaa1111bbbb2222' while the side panel has
      // the real build hash — mismatch triggers the dialog.
      await expect(sidePanelPage.getByText('Extension Updated')).toBeVisible({ timeout: 30_000 });
      await expect(sidePanelPage.getByRole('button', { name: 'Reload' })).toBeVisible();

      await sidePanelPage.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });

  test('dialog does NOT appear when hashes match', async () => {
    const buildHash = readBuildHash();

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-ext-update-match-'));
    writeTestConfig(configDir, { localPlugins: [] });
    writeServerHash(configDir, buildHash);

    const server = await startMcpServer(configDir, true);
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);

      const sidePanelPage = await openSidePanel(context);

      // Wait for the side panel to fully render (browser tools section appears)
      await expect(sidePanelPage.locator('text=Browser')).toBeVisible({ timeout: 30_000 });

      // Dialog should NOT be visible
      await expect(sidePanelPage.getByText('Extension Updated')).toBeHidden({ timeout: 3_000 });

      await sidePanelPage.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });

  test('dialog cannot be dismissed by clicking outside or pressing Escape', async () => {
    test.slow();

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-ext-update-dismiss-'));
    writeTestConfig(configDir, { localPlugins: [] });
    writeServerHash(configDir, 'cccc3333dddd4444');

    const server = await startMcpServer(configDir, true);
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);

      const sidePanelPage = await openSidePanel(context);

      // Wait for dialog to appear
      await expect(sidePanelPage.getByText('Extension Updated')).toBeVisible({ timeout: 30_000 });

      // Try clicking outside the dialog (top-left corner of the page)
      await sidePanelPage.locator('body').click({ position: { x: 5, y: 5 }, force: true });
      await expect(sidePanelPage.getByText('Extension Updated')).toBeVisible({ timeout: 2_000 });

      // Try pressing Escape
      await sidePanelPage.keyboard.press('Escape');
      await expect(sidePanelPage.getByText('Extension Updated')).toBeVisible({ timeout: 2_000 });

      // Verify the Reload button is still present and clickable
      await expect(sidePanelPage.getByRole('button', { name: 'Reload' })).toBeVisible();
      await expect(sidePanelPage.getByRole('button', { name: 'Reload' })).toBeEnabled();

      await sidePanelPage.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });

  test('dev mode rebuild: dialog appears after hash file changes and hot reload', async () => {
    test.slow();

    const buildHash = readBuildHash();

    // Start with matching hashes (no dialog initially)
    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-ext-update-dev-'));
    writeTestConfig(configDir, { localPlugins: [] });
    writeServerHash(configDir, buildHash);

    const server = await startMcpServer(configDir, true);
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    try {
      await waitForExtensionConnected(server);

      const sidePanelPage = await openSidePanel(context);

      // Verify side panel is rendered and no dialog
      await expect(sidePanelPage.locator('text=Browser')).toBeVisible({ timeout: 30_000 });
      await expect(sidePanelPage.getByText('Extension Updated')).toBeHidden({ timeout: 3_000 });

      // Simulate a dev rebuild: write a different hash and trigger hot reload
      writeServerHash(configDir, 'eeee5555ffff6666');
      server.logs.length = 0;
      server.triggerHotReload();

      // Wait for the hot reload cycle to complete
      await waitForLog(server, 'Hot reload complete', 20_000);
      await waitForExtensionConnected(server, 30_000);

      // The new worker sends sync.full with the changed hash → dialog appears
      await expect(sidePanelPage.getByText('Extension Updated')).toBeVisible({ timeout: 30_000 });

      await sidePanelPage.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });
});

// ---------------------------------------------------------------------------
// Stress test — rapid reconnections with matching hashes
// ---------------------------------------------------------------------------

test.describe('Extension update dialog — stress', () => {
  test('rapid hot reload cycles with matching hashes do not cause spurious dialog', async () => {
    test.slow();

    const buildHash = readBuildHash();

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-ext-update-stress-'));
    writeTestConfig(configDir, { localPlugins: [] });
    writeServerHash(configDir, buildHash);

    const server = await startMcpServer(configDir, true);
    const { context, cleanupDir, extensionDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extensionDir);

    const pageErrors: Error[] = [];

    try {
      await waitForExtensionConnected(server);

      const sidePanelPage = await openSidePanel(context);
      sidePanelPage.on('pageerror', err => pageErrors.push(err));

      // Verify initial state — side panel rendered, no dialog
      await expect(sidePanelPage.locator('text=Browser')).toBeVisible({ timeout: 30_000 });
      await expect(sidePanelPage.getByText('Extension Updated')).toBeHidden({ timeout: 3_000 });

      // Trigger 3 rapid hot reloads (hash file unchanged → hashes still match)
      for (let i = 0; i < 3; i++) {
        server.logs.length = 0;
        server.triggerHotReload();
        await waitForLog(server, 'Hot reload complete', 20_000);
        await waitForExtensionConnected(server, 30_000);
      }

      // After all reloads settle, the side panel should still be healthy
      await expect(sidePanelPage.locator('text=Browser')).toBeVisible({ timeout: 30_000 });

      // Dialog should NOT have appeared (hashes still match)
      await expect(sidePanelPage.getByText('Extension Updated')).toBeHidden({ timeout: 3_000 });

      // No page errors
      expect(pageErrors).toHaveLength(0);

      await sidePanelPage.close();
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });
});

// ---------------------------------------------------------------------------
// Proactive reload removal verification
// ---------------------------------------------------------------------------

test.describe('Extension update — proactive reload removed', () => {
  test('version mismatch logs hash-based message, not proactive reload', async () => {
    test.slow();

    const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-ext-update-proactive-'));
    writeTestConfig(configDir, { localPlugins: [] });

    // Write a STALE version marker so ensureExtensionInstalled detects a mismatch
    const extensionDir = path.join(configDir, 'extension');
    fs.mkdirSync(extensionDir, { recursive: true });
    fs.writeFileSync(path.join(extensionDir, '.opentabs-version'), '0.0.0-stale', 'utf-8');

    const server = await startMcpServer(configDir, true);
    const { context, cleanupDir, extensionDir: extDir } = await launchExtensionContext(server.port, server.secret);
    setupAdapterSymlink(configDir, extDir);

    try {
      await waitForExtensionConnected(server);

      // Wait for the startup reload to complete (which triggers ensureExtensionInstalled)
      // On first startup with hot mode, the dev proxy starts the worker which calls
      // performReload. But startMcpServer pre-writes the CORRECT version in its setup,
      // overwriting our stale version. To trigger a version mismatch, we need to write
      // the stale version AFTER the server is running and before a hot reload.
      //
      // Write stale version and trigger hot reload — the new worker will see the mismatch.
      fs.writeFileSync(path.join(extensionDir, '.opentabs-version'), '0.0.0-stale', 'utf-8');
      server.logs.length = 0;
      server.triggerHotReload();

      await waitForLog(server, 'Hot reload complete', 20_000);

      // Verify the new hash-based log message appears
      await waitForLog(server, 'side panel will detect hash change', 10_000);

      // Verify the old proactive reload message does NOT appear
      const allLogs = server.logs.join('\n');
      expect(allLogs).not.toContain('sending reload signal');
      expect(allLogs).not.toContain('reload will be sent on next extension connect');

      await openSidePanel(context).then(p => p.close());
    } finally {
      await context.close().catch(() => {});
      await server.kill();
      fs.rmSync(cleanupDir, { recursive: true, force: true });
      cleanupTestConfigDir(configDir);
    }
  });
});
