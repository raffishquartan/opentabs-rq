/**
 * Plugin tab auto-open E2E tests — with `pluginTabAutoOpen: true` and no tab
 * open for the plugin:
 *
 *   - A permitted plugin tool call opens the plugin's homepage in a background
 *     tab, waits for the adapter to become ready, and succeeds there.
 *   - A second call runs in that tab and opens no further tab.
 *   - While permissions are skipped, no tab opens and the call fails with
 *     the "Tab closed" error (simulated profile over a raw WebSocket).
 *
 * The plugin copy's homepage points at this test's test server, so the opened
 * tab serves the e2e-test app. Multi-profile behaviour is covered in
 * multi-profile-routing.e2e.ts.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { McpServer } from './fixtures.js';
import {
  test as base,
  cleanupTestConfigDir,
  copyE2eTestPlugin,
  createMcpClient,
  createRawWsConnection,
  createTestConfigDir,
  expect,
  readTestConfig,
  startMcpServer,
  writeTestConfig,
} from './fixtures.js';
import { waitForExtensionConnected, waitForLog } from './helpers.js';

const test = base.extend<{ mcpServer: McpServer }>({
  // MCP server with permission prompts enabled (auto-open is off while permissions are skipped),
  // auto-open enabled, and an e2e-test plugin copy whose homepage is this test's test server.
  mcpServer: async ({ testServer }, use) => {
    const { pluginDir, tmpDir } = copyE2eTestPlugin();
    const pkgPath = path.join(pluginDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { opentabs: Record<string, unknown> };
    pkg.opentabs.homepage = `${testServer.url}/`;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');

    const configDir = createTestConfigDir();
    const config = readTestConfig(configDir);
    config.localPlugins = [pluginDir];
    config.pluginTabAutoOpen = true;
    writeTestConfig(configDir, config);

    // The bypass check is `=== '1'`, so an empty string keeps permission checks active.
    const server = await startMcpServer(configDir, true, undefined, { OPENTABS_DANGEROUSLY_SKIP_PERMISSIONS: '' });
    try {
      await use(server);
    } finally {
      await server.kill();
      cleanupTestConfigDir(configDir);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  },
});

interface ListedTab {
  id: number;
  url: string;
  active: boolean;
}

test.describe('Plugin tab auto-open', () => {
  test('a call with no plugin tab opens the homepage in a background tab and runs there once', async ({
    mcpServer,
    extensionContext,
    mcpClient,
    testServer,
  }) => {
    await waitForExtensionConnected(mcpServer);
    await waitForLog(mcpServer, 'plugin(s) mapped');

    const appTabs = async (): Promise<ListedTab[]> => {
      const listed = await mcpClient.callTool('browser_list_tabs', {});
      return (JSON.parse(listed.content) as ListedTab[]).filter(t => t.url.startsWith(testServer.url));
    };
    expect(await appTabs()).toHaveLength(0);

    const first = await mcpClient.callTool('e2e-test__echo', { message: 'auto-opened' }, { timeout: 60_000 });
    expect(first.isError).toBe(false);
    expect(first.content).toContain('auto-opened');

    const opened = await appTabs();
    expect(opened).toHaveLength(1);
    expect(opened[0]?.active).toBe(false);

    const second = await mcpClient.callTool('e2e-test__echo', { message: 'second call' }, { timeout: 30_000 });
    expect(second.isError).toBe(false);
    expect(second.content).toContain('second call');
    expect(await appTabs()).toHaveLength(1);
    expect(extensionContext.pages().filter(p => p.url().startsWith(testServer.url))).toHaveLength(1);
  });
});

test.describe('Plugin tab auto-open with skipped permissions', () => {
  test('no tab opens and the call fails with the Tab closed error', async () => {
    const configDir = createTestConfigDir();
    const config = readTestConfig(configDir);
    config.pluginTabAutoOpen = true;
    writeTestConfig(configDir, config);
    const server = await startMcpServer(configDir, false);
    const client = createMcpClient(server.port, server.secret);
    let ws: WebSocket | undefined;
    try {
      await client.initialize();
      ws = await createRawWsConnection(server.port, server.secret, 'conn-skip');
      await server.waitForHealth(h => h.extensionConnections >= 1, 10_000);

      const methods: string[] = [];
      const profile = ws;
      profile.addEventListener('message', (event: MessageEvent) => {
        const msg = JSON.parse(String(event.data)) as { method?: string; id?: string | number };
        if (msg.method) methods.push(msg.method);
        if (msg.method === 'tool.dispatch' && msg.id !== undefined) {
          profile.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              error: {
                code: -32001,
                message: 'No matching tab for plugin "e2e-test" (state: closed)',
                data: { reason: 'no_matching_tab' },
              },
            }),
          );
        }
      });

      const result = await client.callTool('e2e-test__echo', { message: 'skipped' });

      expect(result.isError).toBe(true);
      expect(result.content).toBe('Tab closed: No matching tab for plugin "e2e-test" (state: closed)');
      expect(methods).toContain('tool.dispatch');
      expect(methods).not.toContain('browser.openTab');
    } finally {
      ws?.close();
      await client.close();
      await server.kill();
      cleanupTestConfigDir(configDir);
    }
  });
});
