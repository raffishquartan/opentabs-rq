/**
 * Config system — ~/.opentabs/config.json
 *
 * Single source of truth for local plugin paths and tool enabled/disabled state.
 * Created automatically on first MCP server run with sensible defaults.
 *
 * The config directory defaults to ~/.opentabs but can be overridden via the
 * OPENTABS_CONFIG_DIR environment variable. This is essential for parallel
 * E2E test execution where each test worker needs its own isolated config
 * to avoid clobbering shared state.
 */

import { log } from './logger.js';
import { chmod, mkdir, rename, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Shape of ~/.opentabs/config.json
 *
 * `localPlugins` holds local filesystem paths to plugin directories. These paths
 * start with `./`, `../`, `/`, or `~/` and are resolved relative to the config
 * directory. npm plugins are auto-discovered from global node_modules.
 */
interface OpentabsConfig {
  /** Local plugin directory paths (resolved relative to the config directory) */
  localPlugins: string[];
  /** Tool enabled/disabled state: prefixed tool name → boolean. Absent = enabled (default). */
  tools: Record<string, boolean>;
  /** Shared secret for WebSocket authentication between MCP server and Chrome extension */
  secret?: string;
}

/** Read the config directory, checking the environment variable on each call
 *  so that test overrides via OPENTABS_CONFIG_DIR take effect even after
 *  the module has been cached. */
const getConfigDir = (): string => Bun.env.OPENTABS_CONFIG_DIR || join(homedir(), '.opentabs');
const getConfigPath = (): string => join(getConfigDir(), 'config.json');

/** Managed extension install directory (~/.opentabs/extension/) */
const getExtensionDir = (): string => join(getConfigDir(), 'extension');

/** @public Version marker file for the managed extension install */
const getExtensionVersionFile = (): string => join(getExtensionDir(), '.opentabs-version');

/** @public Directory for plugin adapter IIFEs inside the managed extension */
const getAdaptersDir = (): string => join(getExtensionDir(), 'adapters');

/**
 * Write config atomically: write to a temp file in the same directory,
 * set restrictive permissions, then rename over the target. The rename
 * is atomic on POSIX filesystems, so readers never see a partially-written file.
 */
const atomicWriteConfig = async (configPath: string, content: string): Promise<void> => {
  const tmpPath = configPath + '.tmp';
  try {
    await Bun.write(tmpPath, content);
    await chmod(tmpPath, 0o600).catch(() => {});
    await rename(tmpPath, configPath);
  } catch (err) {
    await unlink(tmpPath).catch(() => {});
    throw err;
  }
};

/** Generate a 256-bit cryptographic random secret as a 64-character hex string. */
const generateSecret = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Read and parse config.json with retry and exponential backoff.
 *
 * Handles transient file unavailability during non-atomic writes from
 * external processes (CLI commands, manual edits). Retries up to 3 times
 * with 100ms / 200ms / 400ms delays before giving up.
 *
 * Returns the raw parsed JSON or null if the file cannot be read after
 * all retries. Callers decide how to handle the failure.
 */
const readConfigWithRetry = async (
  configPath: string,
  maxRetries = 3,
  initialDelayMs = 100,
): Promise<Record<string, unknown> | null> => {
  let delay = initialDelayMs;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const raw = await Bun.file(configPath).text();
      const parsed: unknown = JSON.parse(raw);

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        if (attempt === maxRetries) {
          log.warn(`Config at ${configPath} is not a JSON object after ${maxRetries + 1} attempt(s)`);
          return null;
        }
        log.debug(`Config at ${configPath} is not a JSON object — retrying (attempt ${attempt + 1})`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }

      return parsed as Record<string, unknown>;
    } catch (err) {
      if (attempt === maxRetries) {
        log.warn(`Failed to read config from ${configPath} after ${maxRetries + 1} attempt(s):`, err);
        return null;
      }
      log.debug(`Config read attempt ${attempt + 1} failed, retrying in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
  return null;
};

/** Check whether a string looks like a local filesystem path. */
const isLocalPathEntry = (s: string): boolean =>
  s.startsWith('./') || s.startsWith('../') || s.startsWith('/') || s.startsWith('~/');

/**
 * Parse a raw config record into an OpentabsConfig.
 * Validates and normalizes field types to prevent downstream errors.
 */
const parseConfigRecord = (record: Record<string, unknown>): Omit<OpentabsConfig, 'secret'> & { secret?: string } => {
  const localPlugins = Array.isArray(record.localPlugins)
    ? (record.localPlugins as unknown[]).filter((p): p is string => typeof p === 'string')
    : [];
  const tools: Record<string, boolean> = {};
  if (record.tools && typeof record.tools === 'object' && !Array.isArray(record.tools)) {
    for (const [key, value] of Object.entries(record.tools as Record<string, unknown>)) {
      if (typeof value === 'boolean') {
        tools[key] = value;
      }
    }
  }

  // Migration: if the old `plugins` array exists, extract local paths into localPlugins
  // and drop npm package names (they will be auto-discovered from global node_modules).
  if (Array.isArray(record.plugins)) {
    const legacyPlugins = (record.plugins as unknown[]).filter((p): p is string => typeof p === 'string');
    const localPaths = legacyPlugins.filter(isLocalPathEntry);
    const npmPackages = legacyPlugins.filter(p => !isLocalPathEntry(p));

    if (localPaths.length > 0) {
      // Merge into localPlugins, deduplicating
      const existing = new Set(localPlugins);
      for (const p of localPaths) {
        if (!existing.has(p)) {
          localPlugins.push(p);
          existing.add(p);
        }
      }
      log.info(
        `Migrating ${localPaths.length} local path(s) from "plugins" to "localPlugins". ` +
          'Update your config.json to use "localPlugins" for local plugin paths.',
      );
    }
    if (npmPackages.length > 0) {
      log.info(
        `Dropping ${npmPackages.length} npm package name(s) from legacy "plugins" array. ` +
          'npm plugins are now auto-discovered from global node_modules.',
      );
    }
  }

  // Migration: merge legacy npmPlugins — these are npm packages that will be auto-discovered,
  // so they are dropped with a notice.
  if (Array.isArray(record.npmPlugins)) {
    const legacyNpm = (record.npmPlugins as unknown[]).filter((p): p is string => typeof p === 'string');
    if (legacyNpm.length > 0) {
      log.info(
        `Dropping ${legacyNpm.length} npmPlugins entry/entries. ` +
          'npm plugins are now auto-discovered from global node_modules.',
      );
    }
  }

  const secret = typeof record.secret === 'string' ? record.secret : undefined;

  return { localPlugins, tools, secret };
};

/**
 * Load config from ~/.opentabs/config.json.
 * Creates the directory and file with defaults if they don't exist.
 *
 * On transient read/parse errors (corrupted file, mid-write from another
 * process), retries with exponential backoff. If all retries fail, throws
 * an error so the caller (reloadCore) can preserve previous state instead
 * of replacing it with an empty config.
 */
const loadConfig = async (): Promise<OpentabsConfig> => {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  await mkdir(configDir, { recursive: true, mode: 0o700 });

  const configFile = Bun.file(configPath);
  if (!(await configFile.exists())) {
    // First run — create default config with a fresh shared secret
    const config: OpentabsConfig = { localPlugins: [], tools: {}, secret: generateSecret() };
    await atomicWriteConfig(configPath, JSON.stringify(config, null, 2) + '\n');
    log.info(`Created default config at ${configPath}`);
    return config;
  }

  const record = await readConfigWithRetry(configPath);
  if (!record) {
    // All retries exhausted — throw so the caller can preserve previous state.
    // This prevents the old behavior of returning an empty fallback config
    // which would wipe all plugins from state on any transient read error.
    throw new Error(`Config at ${configPath} is unreadable after retries`);
  }

  const config = parseConfigRecord(record);
  let { secret } = config;

  // Generate secret if missing (upgrade from older config)
  if (!secret) {
    secret = generateSecret();
    const updated: OpentabsConfig = { ...config, secret };
    await atomicWriteConfig(configPath, JSON.stringify(updated, null, 2) + '\n');
    log.info(`Generated WebSocket authentication secret in ${configPath}`);
  }

  return { ...config, secret };
};

/**
 * Save config to ~/.opentabs/config.json.
 * Serialized via state.configWriteMutex to prevent concurrent read-modify-write
 * races. The mutex lives on ServerState so it survives bun --hot re-evaluations
 * (module-level variables reset on hot reload, but state persists on globalThis).
 */
const saveConfig = async (state: { configWriteMutex: Promise<void> }, config: OpentabsConfig): Promise<void> => {
  const configDir = getConfigDir();
  const configPath = getConfigPath();
  const prev = state.configWriteMutex;
  state.configWriteMutex = (async () => {
    await prev;
    await mkdir(configDir, { recursive: true, mode: 0o700 });
    await atomicWriteConfig(configPath, JSON.stringify(config, null, 2) + '\n');
  })().catch((err: unknown) => {
    // Reset mutex so subsequent writes don't hang on a rejected promise
    state.configWriteMutex = Promise.resolve();
    log.warn(`Failed to save config to ${configPath}:`, err);
    throw err;
  });
  await state.configWriteMutex;
};

/**
 * Persist only the tool enabled/disabled state to config.json.
 *
 * Reads the current config from disk, updates only the `tools` field,
 * and writes it back atomically. This prevents stale in-memory plugin
 * paths from overwriting externally-added plugins — the root cause of
 * the "plugin disappears during development" bug.
 *
 * The read-modify-write is serialized via state.configWriteMutex.
 */
const saveToolConfig = async (
  state: { configWriteMutex: Promise<void> },
  tools: Record<string, boolean>,
): Promise<void> => {
  const configDir = getConfigDir();
  const configPath = getConfigPath();
  const prev = state.configWriteMutex;
  state.configWriteMutex = (async () => {
    await prev;
    await mkdir(configDir, { recursive: true, mode: 0o700 });

    // Read current config from disk to preserve localPlugins and secret
    const record = await readConfigWithRetry(configPath, 2, 50);
    if (!record) {
      log.warn('Cannot persist tool config — config file unreadable');
      return;
    }

    const current = parseConfigRecord(record);
    const updated: OpentabsConfig = {
      localPlugins: current.localPlugins,
      tools,
      secret: current.secret,
    };
    await atomicWriteConfig(configPath, JSON.stringify(updated, null, 2) + '\n');
  })().catch((err: unknown) => {
    state.configWriteMutex = Promise.resolve();
    log.warn(`Failed to save tool config to ${configPath}:`, err);
    throw err;
  });
  await state.configWriteMutex;
};

/**
 * Write auth.json to the managed extension directory so the Chrome extension
 * can bootstrap the shared secret without an unauthenticated HTTP request.
 *
 * The file is written atomically (write to .tmp, chmod 0600, rename) matching
 * the atomicWriteConfig pattern. Called on every reload so the port and secret
 * stay in sync with the running server.
 */
const writeAuthFile = async (secret: string, port: number): Promise<void> => {
  const extensionDir = getExtensionDir();
  await mkdir(extensionDir, { recursive: true });
  const authPath = join(extensionDir, 'auth.json');
  const tmpPath = authPath + '.tmp';
  try {
    await Bun.write(tmpPath, JSON.stringify({ secret, port }) + '\n');
    await chmod(tmpPath, 0o600).catch((err: unknown) => {
      log.warn(
        `Warning: Could not set file permissions on ${tmpPath}: ${err instanceof Error ? err.message : String(err)}. The auth file may be readable by other users.`,
      );
    });
    await rename(tmpPath, authPath);
  } catch (err) {
    await unlink(tmpPath).catch(() => {});
    throw err;
  }
};

export type { OpentabsConfig };
export {
  loadConfig,
  saveConfig,
  saveToolConfig,
  writeAuthFile,
  getConfigDir,
  getExtensionDir,
  getExtensionVersionFile,
  getAdaptersDir,
};
