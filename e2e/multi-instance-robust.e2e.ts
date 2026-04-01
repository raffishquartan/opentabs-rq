/**
 * Multi-instance robustness E2E tests — verify port-aware instance routing,
 * hot-reload, tab lifecycle, stress dispatch, and edge cases for the
 * multi-instance plugin feature.
 *
 * Unlike multi-instance.e2e.ts (which uses localhost vs 127.0.0.1 to
 * distinguish instances), these tests exercise same-hostname-different-port
 * scenarios — the most common real-world pattern for self-hosted services.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { McpClient, McpServer, TestServer } from './fixtures.js';
import {
  cleanupTestConfigDir,
  createMcpClient,
  E2E_TEST_PLUGIN_DIR,
  expect,
  launchExtensionContext,
  readPluginToolNames,
  startMcpServer,
  startTestServer,
  test,
  writeTestConfig,
} from './fixtures.js';
import { openTestAppTab, setupAdapterSymlink, waitFor, waitForExtensionConnected, waitForLog } from './helpers.js';

/** Shape of plugin_list_tabs response entries. */
interface PluginTabsEntry {
  plugin: string;
  displayName: string;
  state: string;
  tabs: Array<{ tabId: number; url: string; title: string; ready: boolean; instance?: string }>;
}

// ---------------------------------------------------------------------------
// Shared infrastructure for same-host multi-instance tests
// ---------------------------------------------------------------------------

interface SameHostTestContext {
  configDir: string;
  server: McpServer;
  alphaServer: TestServer;
  betaServer: TestServer;
  context: Awaited<ReturnType<typeof launchExtensionContext>>['context'];
  cleanupDir: string;
  client: McpClient;
  alphaUrl: string;
  betaUrl: string;
}

/**
 * Set up a same-host, different-port multi-instance test environment:
 * 1. Start two test servers on ephemeral ports (both on localhost)
 * 2. Write config.json with multi-instance url settings using both ports
 * 3. Start MCP server, extension, and MCP client
 */
const setupSameHostTest = async (): Promise<SameHostTestContext> => {
  const absPluginPath = path.resolve(E2E_TEST_PLUGIN_DIR);
  const prefixedToolNames = readPluginToolNames();
  const tools: Record<string, boolean> = {};
  for (const t of prefixedToolNames) {
    tools[t] = true;
  }

  const alphaServer = await startTestServer();
  const betaServer = await startTestServer();

  // Both servers are on localhost, distinguished only by port
  const alphaUrl = alphaServer.url; // http://localhost:<portA>
  const betaUrl = betaServer.url; // http://localhost:<portB>

  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opentabs-e2e-robust-'));
  writeTestConfig(configDir, {
    localPlugins: [absPluginPath],
    tools,
    settings: {
      'e2e-test': {
        instanceUrl: {
          alpha: alphaUrl,
          beta: betaUrl,
        },
      },
    },
  });

  const server = await startMcpServer(configDir, true);
  const ext = await launchExtensionContext(server.port, server.secret);
  setupAdapterSymlink(configDir, ext.extensionDir);

  const client = createMcpClient(server.port, server.secret);
  await client.initialize();

  await waitForExtensionConnected(server);
  await waitForLog(server, 'plugin(s) mapped');

  return {
    configDir,
    server,
    alphaServer,
    betaServer,
    context: ext.context,
    cleanupDir: ext.cleanupDir,
    client,
    alphaUrl,
    betaUrl,
  };
};

const cleanupSameHostTest = async (ctx: SameHostTestContext): Promise<void> => {
  await ctx.client.close();
  await ctx.context.close().catch(() => {});
  await ctx.alphaServer.kill();
  await ctx.betaServer.kill();
  await ctx.server.kill();
  fs.rmSync(ctx.cleanupDir, { recursive: true, force: true });
  cleanupTestConfigDir(ctx.configDir);
};

/**
 * Poll plugin_list_tabs until the e2e-test plugin reports at least `count` tabs
 * where all are ready.
 */
const waitForReadyTabs = async (client: McpClient, count: number, timeoutMs = 20_000): Promise<PluginTabsEntry[]> => {
  let last: PluginTabsEntry[] = [];
  await waitFor(
    async () => {
      const result = await client.callTool('plugin_list_tabs', { plugin: 'e2e-test' });
      if (result.isError) return false;
      last = JSON.parse(result.content) as PluginTabsEntry[];
      const entry = last[0];
      return entry !== undefined && entry.tabs.length >= count && entry.tabs.every(t => t.ready);
    },
    timeoutMs,
    500,
    `plugin_list_tabs to report ${count} ready tab(s)`,
  );
  return last;
};

/**
 * Open a tab and wait for adapter injection.
 */
const openTabAndWaitForAdapter = async (
  context: SameHostTestContext['context'],
  url: string,
  mcpServer: McpServer,
  testServer: TestServer,
): Promise<Awaited<ReturnType<typeof openTestAppTab>>> => openTestAppTab(context, url, mcpServer, testServer);

// ---------------------------------------------------------------------------
// US-006: Same-host-different-port dispatch
// ---------------------------------------------------------------------------

test.describe('Multi-instance robust — same host different ports', () => {
  test('dispatch to alpha hits server A, dispatch to beta hits server B', async () => {
    test.slow();
    let ctx: SameHostTestContext | undefined;
    try {
      ctx = await setupSameHostTest();

      // Open alpha tab
      const alphaPage = await openTabAndWaitForAdapter(ctx.context, ctx.alphaUrl, ctx.server, ctx.alphaServer);

      // Open beta tab
      const betaPage = await openTabAndWaitForAdapter(ctx.context, ctx.betaUrl, ctx.server, ctx.betaServer);

      // Wait for both tabs to be ready
      const plugins = await waitForReadyTabs(ctx.client, 2);
      const entry = plugins[0];
      if (!entry) throw new Error('Expected plugin entry in plugin_list_tabs response');

      // Verify both tabs appear with correct instance labels
      expect(entry.plugin).toBe('e2e-test');
      expect(entry.tabs.length).toBe(2);

      const alphaTab = entry.tabs.find(t => t.instance === 'alpha');
      const betaTab = entry.tabs.find(t => t.instance === 'beta');
      expect(alphaTab).toBeDefined();
      expect(betaTab).toBeDefined();

      // Both on localhost but different ports
      expect(alphaTab?.url).toContain(`localhost:${String(ctx.alphaServer.port)}`);
      expect(betaTab?.url).toContain(`localhost:${String(ctx.betaServer.port)}`);

      // Dispatch echo to alpha — verify it hits alphaServer only
      await ctx.alphaServer.reset();
      await ctx.betaServer.reset();
      const alphaResult = await ctx.client.callTool('e2e-test_echo', {
        message: 'hello-alpha-port',
        instance: 'alpha',
      });
      expect(alphaResult.isError).toBe(false);
      const alphaParsed = JSON.parse(alphaResult.content) as { message: string };
      expect(alphaParsed.message).toBe('hello-alpha-port');

      const alphaInvocations = await ctx.alphaServer.invocations();
      const alphaEchoes = alphaInvocations.filter(i => i.path === '/api/echo');
      expect(alphaEchoes.length).toBe(1);

      const betaInvocations = await ctx.betaServer.invocations();
      const betaEchoes = betaInvocations.filter(i => i.path === '/api/echo');
      expect(betaEchoes.length).toBe(0);

      // Dispatch echo to beta — verify it hits betaServer only
      await ctx.alphaServer.reset();
      await ctx.betaServer.reset();
      const betaResult = await ctx.client.callTool('e2e-test_echo', {
        message: 'hello-beta-port',
        instance: 'beta',
      });
      expect(betaResult.isError).toBe(false);
      const betaParsed = JSON.parse(betaResult.content) as { message: string };
      expect(betaParsed.message).toBe('hello-beta-port');

      const betaInvocations2 = await ctx.betaServer.invocations();
      const betaEchoes2 = betaInvocations2.filter(i => i.path === '/api/echo');
      expect(betaEchoes2.length).toBe(1);

      const alphaInvocations2 = await ctx.alphaServer.invocations();
      const alphaEchoes2 = alphaInvocations2.filter(i => i.path === '/api/echo');
      expect(alphaEchoes2.length).toBe(0);

      // Verify getConfig returns the correct port-specific URL in each tab
      const alphaConfigResult = await ctx.client.callTool('e2e-test_sdk_get_config', {
        key: 'instanceUrl',
        instance: 'alpha',
      });
      expect(alphaConfigResult.isError).toBe(false);
      const alphaConfig = JSON.parse(alphaConfigResult.content) as { key: string; value: string | null };
      expect(alphaConfig.value).toBe(ctx.alphaUrl);

      const betaConfigResult = await ctx.client.callTool('e2e-test_sdk_get_config', {
        key: 'instanceUrl',
        instance: 'beta',
      });
      expect(betaConfigResult.isError).toBe(false);
      const betaConfig = JSON.parse(betaConfigResult.content) as { key: string; value: string | null };
      expect(betaConfig.value).toBe(ctx.betaUrl);

      await alphaPage.close();
      await betaPage.close();
    } finally {
      if (ctx) await cleanupSameHostTest(ctx);
    }
  });
});
