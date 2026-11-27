/**
 * Readiness waiters for plugin tabs opened automatically by the server.
 *
 * A waiter watches one tab of one plugin in one extension connection. The
 * extension protocol calls notifyPluginTabsChanged after every tab.syncAll and
 * tab.stateChanged it applies, and each waiter for that connection re-checks the
 * connection's tab mapping.
 */

import type { ExtensionConnection, PluginTabReadyWaiter, ServerState } from './state.js';

/**
 * How a readiness wait ends: the tab reported ready; the tab, after appearing in
 * the plugin's mapping, left it (closed, or navigated outside the plugin's URL
 * patterns); or the bound expired.
 */
type PluginTabWaitResult = 'ready' | 'left' | 'timeout';

/** The tab a readiness wait watches */
interface PluginTabWaitTarget {
  connectionId: string;
  pluginName: string;
  tabId: number;
}

/**
 * Wait until `target.tabId` is reported ready for `target.pluginName` by connection
 * `target.connectionId`, for at most `timeoutMs`. Resolves immediately when the
 * connection's current mapping already shows the tab ready.
 */
const waitForPluginTabReady = (
  state: ServerState,
  target: PluginTabWaitTarget,
  timeoutMs: number,
): Promise<PluginTabWaitResult> =>
  new Promise(resolve => {
    const waiters = state.pluginTabAutoOpenRuntime.readyWaiters;
    let seen = false;

    const finish = (result: PluginTabWaitResult): void => {
      clearTimeout(timerId);
      waiters.delete(waiter);
      resolve(result);
    };

    const waiter: PluginTabReadyWaiter = {
      connectionId: target.connectionId,
      check: conn => {
        const tab = conn.tabMapping.get(target.pluginName)?.tabs.find(t => t.tabId === target.tabId);
        if (tab?.ready) {
          finish('ready');
        } else if (tab) {
          seen = true;
        } else if (seen) {
          finish('left');
        }
      },
    };

    const timerId = setTimeout(() => finish('timeout'), timeoutMs);
    waiters.add(waiter);

    const conn = state.extensionConnections.get(target.connectionId);
    if (conn) waiter.check(conn);
  });

/** Re-check every readiness waiter for `conn` against its current tab mapping. */
const notifyPluginTabsChanged = (state: ServerState, conn: ExtensionConnection): void => {
  for (const waiter of [...state.pluginTabAutoOpenRuntime.readyWaiters]) {
    if (waiter.connectionId === conn.connectionId) waiter.check(conn);
  }
};

export type { PluginTabWaitResult };
export { notifyPluginTabsChanged, waitForPluginTabReady };
