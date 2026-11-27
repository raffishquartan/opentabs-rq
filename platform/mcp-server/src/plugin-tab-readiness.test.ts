import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { notifyPluginTabsChanged, waitForPluginTabReady } from './plugin-tab-readiness.js';
import type { ExtensionConnection, ServerState } from './state.js';
import { createState } from './state.js';

const makeConnection = (connectionId: string): ExtensionConnection => ({
  ws: { send: vi.fn(), close: vi.fn() },
  connectionId,
  profileLabel: connectionId,
  tabMapping: new Map(),
  activeNetworkCaptures: new Set(),
});

const setTab = (conn: ExtensionConnection, tabId: number, ready: boolean): void => {
  conn.tabMapping.set('testplugin', {
    state: ready ? 'ready' : 'unavailable',
    tabs: [{ tabId, url: 'https://example.com/', title: 'Example', ready }],
  });
};

describe('waitForPluginTabReady', () => {
  let state: ServerState;
  let conn: ExtensionConnection;
  const target = { connectionId: 'conn-a', pluginName: 'testplugin', tabId: 42 };

  beforeEach(() => {
    vi.useFakeTimers();
    state = createState();
    conn = makeConnection('conn-a');
    state.extensionConnections.set('conn-a', conn);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('resolves ready immediately when the tab is already ready', async () => {
    setTab(conn, 42, true);
    await expect(waitForPluginTabReady(state, target, 5_000)).resolves.toBe('ready');
    expect(state.pluginTabAutoOpenRuntime.readyWaiters.size).toBe(0);
  });

  test('resolves ready once the connection reports the tab ready', async () => {
    const wait = waitForPluginTabReady(state, target, 5_000);
    setTab(conn, 42, false);
    notifyPluginTabsChanged(state, conn);
    setTab(conn, 42, true);
    notifyPluginTabsChanged(state, conn);
    await expect(wait).resolves.toBe('ready');
    expect(state.pluginTabAutoOpenRuntime.readyWaiters.size).toBe(0);
  });

  test('ignores reports from other connections', async () => {
    const other = makeConnection('conn-b');
    state.extensionConnections.set('conn-b', other);
    const wait = waitForPluginTabReady(state, target, 5_000);
    setTab(other, 42, true);
    notifyPluginTabsChanged(state, other);
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(wait).resolves.toBe('timeout');
  });

  test('resolves timeout when the bound expires', async () => {
    const wait = waitForPluginTabReady(state, target, 5_000);
    setTab(conn, 42, false);
    notifyPluginTabsChanged(state, conn);
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(wait).resolves.toBe('timeout');
    expect(state.pluginTabAutoOpenRuntime.readyWaiters.size).toBe(0);
  });

  test('resolves left when a tab it has seen disappears from the mapping', async () => {
    const wait = waitForPluginTabReady(state, target, 5_000);
    setTab(conn, 42, false);
    notifyPluginTabsChanged(state, conn);
    conn.tabMapping.set('testplugin', { state: 'closed', tabs: [] });
    notifyPluginTabsChanged(state, conn);
    await expect(wait).resolves.toBe('left');
  });

  test('keeps waiting while a tab it has not seen yet is absent', async () => {
    const wait = waitForPluginTabReady(state, target, 5_000);
    conn.tabMapping.set('testplugin', { state: 'closed', tabs: [] });
    notifyPluginTabsChanged(state, conn);
    setTab(conn, 42, true);
    notifyPluginTabsChanged(state, conn);
    await expect(wait).resolves.toBe('ready');
  });
});
