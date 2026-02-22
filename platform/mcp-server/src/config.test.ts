import { loadConfig, saveConfig, writeAuthFile } from './config.js';
import { isToolEnabled } from './state.js';
import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { OpentabsConfig } from './config.js';
import type { ServerState } from './state.js';

// Override OPENTABS_CONFIG_DIR for test isolation.
// Config functions read this env var lazily on each call.
const TEST_BASE_DIR = mkdtempSync(join(tmpdir(), 'opentabs-config-test-'));
const originalConfigDir = Bun.env.OPENTABS_CONFIG_DIR;
Bun.env.OPENTABS_CONFIG_DIR = TEST_BASE_DIR;

const configPath = join(TEST_BASE_DIR, 'config.json');

/** Test wrapper that provides a mock state object with configWriteMutex */
const mockState = { configWriteMutex: Promise.resolve() };
const saveConfigWrapped = (config: OpentabsConfig) => saveConfig(mockState, config);

const removeConfig = async () => {
  try {
    await Bun.file(configPath).delete();
  } catch {
    // File may not exist
  }
};

describe('loadConfig / saveConfig round-trip', () => {
  beforeEach(async () => {
    await removeConfig();
  });

  afterAll(() => {
    if (originalConfigDir !== undefined) {
      Bun.env.OPENTABS_CONFIG_DIR = originalConfigDir;
    } else {
      delete Bun.env.OPENTABS_CONFIG_DIR;
    }
    rmSync(TEST_BASE_DIR, { recursive: true, force: true });
  });

  test('creates default config on first load', async () => {
    expect(await Bun.file(configPath).exists()).toBe(false);

    const config = await loadConfig();

    expect(config.localPlugins).toEqual([]);
    expect(config.tools).toEqual({});
    expect(typeof config.secret).toBe('string');
    expect(config.secret).toBeDefined();

    // File was created on disk
    expect(await Bun.file(configPath).exists()).toBe(true);
  });

  test('round-trips through save and load', async () => {
    await loadConfig();

    const custom: OpentabsConfig = {
      localPlugins: ['/path/to/plugin-a', '/path/to/plugin-b'],
      tools: { slack_send_message: false, slack_read_messages: true },
      secret: 'test-secret-123',
    };
    await saveConfigWrapped(custom);

    const loaded = await loadConfig();
    expect(loaded.localPlugins).toEqual(custom.localPlugins);
    expect(loaded.tools).toEqual(custom.tools);
    expect(loaded.secret).toBe('test-secret-123');
  });

  test('filters non-string elements from localPlugins array', async () => {
    await Bun.write(
      configPath,
      JSON.stringify({
        localPlugins: ['/valid/path', 123, null, true, '/another/path'],
        tools: {},
        secret: 'test-secret',
      }),
    );

    const config = await loadConfig();
    expect(config.localPlugins).toEqual(['/valid/path', '/another/path']);
  });

  test('filters non-boolean values from tools object', async () => {
    await Bun.write(
      configPath,
      JSON.stringify({
        localPlugins: [],
        tools: { valid_tool: false, bad_tool: 'yes', another_valid: true, numeric: 1 },
        secret: 'test-secret',
      }),
    );

    const config = await loadConfig();
    expect(config.tools).toEqual({ valid_tool: false, another_valid: true });
  });

  test('generates secret if missing from existing config', async () => {
    await Bun.write(
      configPath,
      JSON.stringify({
        localPlugins: [],
        tools: {},
      }),
    );

    const config = await loadConfig();
    expect(typeof config.secret).toBe('string');
    expect(config.secret).toBeDefined();
  });

  test('migrates local paths from legacy plugins array into localPlugins', async () => {
    await Bun.write(
      configPath,
      JSON.stringify({
        plugins: ['/local/plugin', './relative/plugin', 'opentabs-plugin-jira', '@myorg/opentabs-plugin-github'],
        tools: {},
        secret: 'test-secret-migrate',
      }),
    );

    const config = await loadConfig();
    // Local paths are migrated, npm package names are dropped
    expect(config.localPlugins).toEqual(['/local/plugin', './relative/plugin']);
    expect(config).not.toHaveProperty('plugins');
  });

  test('drops legacy npmPlugins entries with a log notice', async () => {
    await Bun.write(
      configPath,
      JSON.stringify({
        localPlugins: ['/existing/plugin'],
        tools: {},
        secret: 'test-secret',
        npmPlugins: ['opentabs-plugin-jira', '@myorg/opentabs-plugin-github'],
      }),
    );

    const config = await loadConfig();
    expect(config.localPlugins).toEqual(['/existing/plugin']);
    expect(config).not.toHaveProperty('npmPlugins');
  });

  test('migration deduplicates local paths from plugins into localPlugins', async () => {
    await Bun.write(
      configPath,
      JSON.stringify({
        localPlugins: ['/already/here'],
        plugins: ['/already/here', '/new/plugin'],
        tools: {},
        secret: 'test-secret',
      }),
    );

    const config = await loadConfig();
    expect(config.localPlugins).toEqual(['/already/here', '/new/plugin']);
  });

  test('ignores absent plugins and npmPlugins fields without error', async () => {
    await Bun.write(
      configPath,
      JSON.stringify({
        localPlugins: ['/some/plugin'],
        tools: {},
        secret: 'test-secret',
      }),
    );

    const config = await loadConfig();
    expect(config.localPlugins).toEqual(['/some/plugin']);
    expect(config).not.toHaveProperty('plugins');
    expect(config).not.toHaveProperty('npmPlugins');
  });

  test('default config has no plugins or npmPlugins field', async () => {
    const config = await loadConfig();
    expect(config).not.toHaveProperty('plugins');
    expect(config).not.toHaveProperty('npmPlugins');
  });
});

describe('tool config round-trip with isToolEnabled', () => {
  beforeEach(async () => {
    await removeConfig();
  });

  test('disabled tools survive save → load cycle and isToolEnabled returns false', async () => {
    await loadConfig();

    const config: OpentabsConfig = {
      localPlugins: [],
      tools: { slack_send: false, slack_read: true },
      secret: 'test-secret-roundtrip',
    };
    await saveConfigWrapped(config);

    const loaded = await loadConfig();
    expect(loaded.tools['slack_send']).toBe(false);
    expect(loaded.tools['slack_read']).toBe(true);

    // Verify isToolEnabled integration with loaded config
    const stateWithConfig = { toolConfig: loaded.tools } as ServerState;
    expect(isToolEnabled(stateWithConfig, 'slack_send')).toBe(false);
    expect(isToolEnabled(stateWithConfig, 'slack_read')).toBe(true);
  });

  test('absent tools default to enabled via isToolEnabled', async () => {
    await loadConfig();

    const config: OpentabsConfig = {
      localPlugins: [],
      tools: { slack_send: false },
      secret: 'test-secret-absent',
    };
    await saveConfigWrapped(config);

    const loaded = await loadConfig();
    const stateWithConfig = { toolConfig: loaded.tools } as ServerState;

    // Tool not in config → isToolEnabled returns true (enabled by default)
    expect(isToolEnabled(stateWithConfig, 'unknown_tool')).toBe(true);
    // Disabled tool → isToolEnabled returns false
    expect(isToolEnabled(stateWithConfig, 'slack_send')).toBe(false);
  });
});

describe('writeAuthFile', () => {
  const authPath = join(TEST_BASE_DIR, 'extension', 'auth.json');

  beforeEach(() => {
    // Re-assert the env var before each test since other test files running
    // concurrently in the same bun process may have modified it.
    Bun.env.OPENTABS_CONFIG_DIR = TEST_BASE_DIR;
  });

  test('writes auth.json with secret and port', async () => {
    await writeAuthFile('test-secret-abc', 9515);

    const file = Bun.file(authPath);
    expect(await file.exists()).toBe(true);
    const content = JSON.parse(await file.text()) as { secret: string; port: number };
    expect(content.secret).toBe('test-secret-abc');
    expect(content.port).toBe(9515);
  });

  test('writes auth.json with restrictive permissions (0600)', async () => {
    await writeAuthFile('perm-test-secret', 9876);

    const stats = statSync(authPath);
    // 0o600 = owner read/write only (octal 33188 = 0o100600 including file type bits)
    expect(stats.mode & 0o777).toBe(0o600);
  });

  test('overwrites existing auth.json on subsequent calls', async () => {
    await writeAuthFile('first-secret', 9515);
    await writeAuthFile('second-secret', 9999);

    const content = JSON.parse(await Bun.file(authPath).text()) as { secret: string; port: number };
    expect(content.secret).toBe('second-secret');
    expect(content.port).toBe(9999);
  });
});
