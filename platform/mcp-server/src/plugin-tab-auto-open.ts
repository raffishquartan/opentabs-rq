/**
 * Plugin tab auto-open: when `pluginTabAutoOpen` is enabled and the extension
 * reports that no tab matches a plugin, open the plugin's homepage in a
 * background tab, wait for the plugin to become ready in it, and let the caller
 * retry the tool call there once.
 *
 * The decision is triggered only by the extension's authoritative
 * `no_matching_tab` discriminator, never by the server's cached tab mapping or
 * by message text. The opened URL is always the plugin's own homepage, checked
 * against an allowed scheme list and the plugin's URL patterns with the same
 * matcher the extension uses for tabs.
 */

import { NO_MATCHING_TAB_REASON } from '@opentabs-dev/shared';
import { urlMatchesPatterns } from '@opentabs-dev/shared/url-patterns';
import { dispatchToExtension, isDispatchError } from './extension-protocol.js';
import { waitForPluginTabReady } from './plugin-tab-readiness.js';
import type { PluginTabOpeningSignal, PluginTabProvisionOutcome, RegisteredPlugin, ServerState } from './state.js';

/** Minimum interval between two auto-opens for the same plugin in the same browser profile */
const PLUGIN_TAB_AUTO_OPEN_COOLDOWN_MS = 60_000;

/** JSON-RPC error code the extension uses when no usable tab exists for a plugin */
const NO_USABLE_TAB_CODE = -32001;

/** Key for per-(plugin, connection) bookkeeping; tab ids are only unique within one browser profile */
const pluginTabKey = (pluginName: string, connectionId: string): string => JSON.stringify([pluginName, connectionId]);

/** Whether a dispatch error is the extension's report that no open tab matches the plugin at all */
const isNoMatchingTabError = (err: unknown): err is { message: string; code: number } =>
  isDispatchError(err) && err.code === NO_USABLE_TAB_CODE && err.data?.reason === NO_MATCHING_TAB_REASON;

/** Whether the homepage URL uses `https:`, or `http:` on localhost / 127.0.0.1 */
const isAllowedHomepageScheme = (url: URL): boolean =>
  url.protocol === 'https:' ||
  (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1'));

/**
 * Check a plugin's homepage for auto-open. Returns undefined when it may be
 * opened, or the sentence explaining why it may not.
 */
const homepageRejection = (homepage: string, plugin: RegisteredPlugin): string | undefined => {
  let url: URL;
  try {
    url = new URL(homepage);
  } catch {
    return `No tab was opened automatically: the plugin homepage ${homepage} is not a valid URL.`;
  }
  if (!isAllowedHomepageScheme(url)) {
    return `No tab was opened automatically: the plugin homepage ${homepage} is not allowed (only https, or http on localhost or 127.0.0.1).`;
  }
  if (!urlMatchesPatterns(homepage, plugin.urlPatterns, plugin.excludePatterns)) {
    return `No tab was opened automatically: the plugin homepage ${homepage} does not match the plugin's URL patterns.`;
  }
  return undefined;
};

/** Whether any connection's cached tab mapping lists a tab for the plugin */
const hasCachedPluginTab = (state: ServerState, pluginName: string): boolean => {
  for (const conn of state.extensionConnections.values()) {
    if ((conn.tabMapping.get(pluginName)?.tabs.length ?? 0) > 0) return true;
  }
  return false;
};

/**
 * The connection a plugin tool call should target first when auto-open may
 * follow: with several profiles connected and no cached tab for the plugin in
 * any of them, the configured default profile, so the profile that reports
 * "closed" is the one that opens the tab. Otherwise undefined (normal routing).
 */
const autoOpenInitialConnectionId = (state: ServerState, pluginName: string): string | undefined => {
  if (state.extensionConnections.size <= 1 || hasCachedPluginTab(state, pluginName)) return undefined;
  const profile = state.pluginTabAutoOpenProfile;
  return profile !== undefined && state.extensionConnections.has(profile) ? profile : undefined;
};

/** The browser profile that receives the auto-opened tab, or the error text when none can be chosen */
const choosePluginTabProfile = (
  state: ServerState,
  pluginName: string,
): { connectionId: string } | { error: string } => {
  const connectionIds = [...state.extensionConnections.keys()];
  const [onlyConnectionId] = connectionIds;
  if (connectionIds.length === 1 && onlyConnectionId !== undefined) return { connectionId: onlyConnectionId };

  const profile = state.pluginTabAutoOpenProfile;
  if (profile !== undefined && state.extensionConnections.has(profile)) return { connectionId: profile };

  const current = profile === undefined ? 'it is not set' : `"${profile}" is not connected`;
  return {
    error: `No matching tab for plugin "${pluginName}", and several browser profiles are connected, so no tab was opened automatically. Set pluginTabAutoOpenProfile to the connectionId of the profile to open plugin tabs in (${current}). Connected profiles: ${connectionIds.join(', ')}.`,
  };
};

/** Whether `tabId` still exists in the browser profile of `connectionId` */
const probeTabExists = async (state: ServerState, connectionId: string, tabId: number): Promise<boolean> => {
  if (!state.extensionConnections.has(connectionId)) return false;
  try {
    await dispatchToExtension(state, 'browser.getTabInfo', { tabId, connectionId }, 'browser.getTabInfo');
    return true;
  } catch {
    // browser.getTabInfo fails when Chrome has no tab with this id
    return false;
  }
};

/** What one provisioning run needs */
interface ProvisionRequest {
  pluginName: string;
  connectionId: string;
  homepage: string;
  waitMs: number;
}

/**
 * Open the homepage in a background tab and wait for the plugin to become ready
 * in it. A tab that leaves the plugin's mapping but still exists (a sign-in
 * redirect, for example) is waited on until the deadline, since it may come back.
 */
const openAndWait = async (
  state: ServerState,
  key: string,
  request: ProvisionRequest,
): Promise<PluginTabProvisionOutcome> => {
  const { pluginName, connectionId, homepage, waitMs } = request;
  const runtime = state.pluginTabAutoOpenRuntime;

  const opened = (await dispatchToExtension(
    state,
    'browser.openTab',
    { url: homepage, active: false, connectionId },
    `${pluginName} auto-open`,
  )) as { id?: unknown };
  if (typeof opened.id !== 'number') {
    throw new Error(`browser.openTab returned no tab id while auto-opening ${homepage}`);
  }
  const tabId = opened.id;
  runtime.openedTabs.set(key, { connectionId, tabId });

  const deadline = Date.now() + waitMs;
  for (;;) {
    const result = await waitForPluginTabReady(
      state,
      { connectionId, pluginName, tabId },
      Math.max(0, deadline - Date.now()),
    );
    if (result === 'ready') return { kind: 'ready', tabId };
    if (!(await probeTabExists(state, connectionId, tabId))) return { kind: 'closed' };
    if (result === 'timeout') return { kind: 'not_ready', tabId };
  }
};

/**
 * Decide whether to open a tab for (plugin, connection), and do it. A remembered
 * tab that still exists blocks a new open (not ready); otherwise a cooldown since
 * the last open blocks it (closed); otherwise the homepage is opened.
 */
const runProvision = async (
  state: ServerState,
  key: string,
  request: ProvisionRequest,
  opening: PluginTabOpeningSignal,
): Promise<PluginTabProvisionOutcome> => {
  const runtime = state.pluginTabAutoOpenRuntime;

  const remembered = runtime.openedTabs.get(key);
  if (remembered) {
    if (await probeTabExists(state, remembered.connectionId, remembered.tabId)) {
      return { kind: 'not_ready', tabId: remembered.tabId };
    }
    runtime.openedTabs.delete(key);
  }

  const lastOpenTs = runtime.lastOpenTs.get(key);
  if (lastOpenTs !== undefined && Date.now() - lastOpenTs < PLUGIN_TAB_AUTO_OPEN_COOLDOWN_MS) {
    return { kind: 'closed' };
  }

  runtime.lastOpenTs.set(key, Date.now());
  opening.started = true;
  for (const listener of opening.listeners) listener();

  return openAndWait(state, key, request);
};

/**
 * Provision a tab for (plugin, connection). Concurrent calls for the same key
 * share one run and its outcome. `onOpening` runs once a tab is actually being
 * opened (immediately for a call that joins after that point).
 */
const provisionPluginTab = (
  state: ServerState,
  request: ProvisionRequest,
  onOpening: () => void,
): Promise<PluginTabProvisionOutcome> => {
  const runtime = state.pluginTabAutoOpenRuntime;
  const key = pluginTabKey(request.pluginName, request.connectionId);

  const existing = runtime.inFlight.get(key);
  if (existing) {
    if (existing.opening.started) onOpening();
    else existing.opening.listeners.push(onOpening);
    return existing.promise;
  }

  const opening: PluginTabOpeningSignal = { started: false, listeners: [onOpening] };
  const promise = runProvision(state, key, request, opening).finally(() => {
    runtime.inFlight.delete(key);
  });
  runtime.inFlight.set(key, { promise, opening });
  return promise;
};

/** What a plugin tool call does after the extension reported no matching tab */
type AutoOpenResult =
  /** Retry the call once in this tab */
  | { kind: 'retry'; connectionId: string; tabId: number }
  /** Fail with this text */
  | { kind: 'error'; text: string }
  /** Fail with the original "Tab closed" error unchanged */
  | { kind: 'closed' };

/**
 * Handle a `no_matching_tab` report for a plugin with a homepage: check the
 * homepage, choose the browser profile, then provision a tab there.
 * `closedMessage` is the extension's error message, used for the "Tab closed"
 * text when the homepage is rejected. `onOpening(homepage)` sends the call's
 * progress notice.
 */
const autoOpenPluginTab = async (
  state: ServerState,
  plugin: RegisteredPlugin & { homepage: string },
  closedMessage: string,
  onOpening: (homepage: string) => void,
): Promise<AutoOpenResult> => {
  const { homepage } = plugin;

  const rejection = homepageRejection(homepage, plugin);
  if (rejection !== undefined) return { kind: 'error', text: `Tab closed: ${closedMessage} ${rejection}` };

  const profile = choosePluginTabProfile(state, plugin.name);
  if ('error' in profile) return { kind: 'error', text: profile.error };

  const outcome = await provisionPluginTab(
    state,
    {
      pluginName: plugin.name,
      connectionId: profile.connectionId,
      homepage,
      waitMs: state.pluginTabAutoOpenWaitSeconds * 1000,
    },
    () => onOpening(homepage),
  );

  switch (outcome.kind) {
    case 'ready':
      return { kind: 'retry', connectionId: profile.connectionId, tabId: outcome.tabId };
    case 'not_ready':
      return {
        kind: 'error',
        text: `Tab ${outcome.tabId} was opened at ${homepage} but plugin "${plugin.name}" is not ready in it. Sign in there if needed, then retry.`,
      };
    case 'closed':
      return { kind: 'closed' };
  }
};

export { autoOpenInitialConnectionId, autoOpenPluginTab, isNoMatchingTabError, PLUGIN_TAB_AUTO_OPEN_COOLDOWN_MS };
