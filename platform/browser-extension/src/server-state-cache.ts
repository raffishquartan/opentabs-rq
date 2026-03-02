import type { ConfigStateBrowserTool, ConfigStateFailedPlugin, ConfigStatePlugin } from '@opentabs-dev/shared';

/**
 * In-memory cache of server-owned state. This mirrors the shape of
 * ConfigStateResult from @opentabs-dev/shared so there is no translation
 * layer when serving data to the side panel.
 *
 * The cache is populated from sync.full and plugins.changed push notifications.
 * It is cleared on WebSocket disconnect and rebuilt from scratch on the next
 * sync.full.
 */
interface ServerStateCache {
  plugins: ConfigStatePlugin[];
  failedPlugins: ConfigStateFailedPlugin[];
  browserTools: ConfigStateBrowserTool[];
  serverVersion?: string;
}

const EMPTY_CACHE: ServerStateCache = {
  plugins: [],
  failedPlugins: [],
  browserTools: [],
  serverVersion: undefined,
};

let cache: ServerStateCache = { ...EMPTY_CACHE };

/** Return the current server state cache (read-only snapshot). */
const getServerStateCache = (): Readonly<ServerStateCache> => cache;

/**
 * Merge a partial update into the server state cache. Only the provided
 * fields are overwritten — omitted fields retain their previous values.
 */
const updateServerStateCache = (partial: Partial<ServerStateCache>): void => {
  cache = { ...cache, ...partial };
};

/**
 * Clear the server state cache. Called on WebSocket disconnect so the
 * next connection rebuilds state from sync.full without stale data.
 */
const clearServerStateCache = (): void => {
  cache = { ...EMPTY_CACHE };
};

export { clearServerStateCache, getServerStateCache, updateServerStateCache };
export type { ServerStateCache };
