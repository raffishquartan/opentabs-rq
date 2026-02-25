import { mock, beforeEach, describe, expect, test } from 'bun:test';
import type { RegisteredPlugin } from './state.js';
import type { SpawnResult } from '@opentabs-dev/shared';

// ---- spawnProcessSync mock via mock.module ----

// Capture the real module exports before mocking so they can be passed through
const realShared = await import('@opentabs-dev/shared');
const mockSpawnProcessSync = mock<(cmd: string, args: string[], opts?: object) => SpawnResult>();

await mock.module('@opentabs-dev/shared', () => ({
  ...realShared,
  spawnProcessSync: mockSpawnProcessSync,
}));

// Import after mocking so modules pick up the mocked spawnProcessSync
const { fetchLatestVersion, isNewer, checkForUpdates } = await import('./version-check.js');
const { buildRegistry } = await import('./registry.js');
const { createState } = await import('./state.js');

beforeEach(() => {
  mockSpawnProcessSync.mockReset();
});

/** Simulate `npm view <pkg> version` returning a given version or failing. */
const mockNpmView = (version: string | undefined): void => {
  mockSpawnProcessSync.mockReturnValue({
    exitCode: version !== undefined ? 0 : 1,
    stdout: version !== undefined ? `${version}\n` : '',
    stderr: version !== undefined ? '' : 'npm ERR! code E404',
  });
};

/** Create a minimal RegisteredPlugin for testing */
const makePlugin = (name: string, overrides: Partial<RegisteredPlugin> = {}): RegisteredPlugin => ({
  name,
  version: '1.0.0',
  displayName: name,
  urlPatterns: [`https://${name}.example.com/*`],
  trustTier: 'community',
  source: 'local' as const,
  iife: `(function(){})()`,
  tools: [],
  resources: [],
  prompts: [],
  adapterHash: 'abc123',
  ...overrides,
});

describe('isNewer', () => {
  describe('basic comparisons', () => {
    test('newer major version', () => {
      expect(isNewer('1.0.0', '2.0.0')).toBe(true);
    });

    test('newer minor version', () => {
      expect(isNewer('1.0.0', '1.1.0')).toBe(true);
    });

    test('newer patch version', () => {
      expect(isNewer('1.0.0', '1.0.1')).toBe(true);
    });

    test('same version', () => {
      expect(isNewer('1.0.0', '1.0.0')).toBe(false);
    });

    test('older major version', () => {
      expect(isNewer('2.0.0', '1.0.0')).toBe(false);
    });

    test('older minor version', () => {
      expect(isNewer('1.1.0', '1.0.0')).toBe(false);
    });

    test('older patch version', () => {
      expect(isNewer('1.0.1', '1.0.0')).toBe(false);
    });
  });

  describe('v prefix handling', () => {
    test('strips v prefix from current', () => {
      expect(isNewer('v1.0.0', '2.0.0')).toBe(true);
    });

    test('strips v prefix from latest', () => {
      expect(isNewer('1.0.0', 'v2.0.0')).toBe(true);
    });

    test('strips v prefix from both', () => {
      expect(isNewer('v1.0.0', 'v1.0.0')).toBe(false);
    });
  });

  describe('prerelease handling', () => {
    test('prerelease suffix is stripped for comparison (1.0.0-beta.1 treated as 1.0.0)', () => {
      expect(isNewer('1.0.0-beta.1', '1.0.0')).toBe(false);
    });

    test('prerelease current vs newer release', () => {
      expect(isNewer('1.0.0-beta.1', '1.0.1')).toBe(true);
    });

    test('prerelease latest vs same base release', () => {
      expect(isNewer('2.0.0', '2.0.0-rc.1')).toBe(false);
    });

    test('prerelease does not cause NaN', () => {
      expect(isNewer('0.9.0', '1.0.0-beta.1')).toBe(true);
    });
  });

  describe('NaN segment handling', () => {
    test('malformed current segment treated as 0 (latest is newer)', () => {
      expect(isNewer('1.0.abc', '2.0.0')).toBe(true);
    });

    test('malformed latest segment treated as 0 (current is newer)', () => {
      expect(isNewer('2.0.0', '1.0.abc')).toBe(false);
    });

    test('both versions have malformed segments', () => {
      expect(isNewer('1.abc.0', '2.xyz.0')).toBe(true);
    });

    test('malformed segment in same position compares as equal (both become 0)', () => {
      expect(isNewer('1.abc.0', '1.xyz.0')).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('missing patch version treated as 0', () => {
      expect(isNewer('1.0', '1.0.1')).toBe(true);
    });

    test('handles large version numbers', () => {
      expect(isNewer('1.999.999', '2.0.0')).toBe(true);
    });

    test('major version difference dominates', () => {
      expect(isNewer('1.99.99', '2.0.0')).toBe(true);
      expect(isNewer('2.0.0', '1.99.99')).toBe(false);
    });
  });
});

describe('fetchLatestVersion', () => {
  test('passes package name to npm view', () => {
    mockSpawnProcessSync.mockReturnValue({ exitCode: 0, stdout: '2.0.0\n', stderr: '' });

    fetchLatestVersion('my-package');
    expect(mockSpawnProcessSync).toHaveBeenCalledWith('npm', ['view', 'my-package', 'version']);
  });

  test('scoped package name is passed directly', () => {
    mockSpawnProcessSync.mockReturnValue({ exitCode: 0, stdout: '1.2.3\n', stderr: '' });

    fetchLatestVersion('@opentabs-dev/plugin-sdk');
    expect(mockSpawnProcessSync).toHaveBeenCalledWith('npm', ['view', '@opentabs-dev/plugin-sdk', 'version']);
  });

  test('successful npm view returns version string', () => {
    mockNpmView('3.1.4');
    const result = fetchLatestVersion('some-package');
    expect(result).toBe('3.1.4');
  });

  test('non-zero exit code returns null', () => {
    mockNpmView(undefined);
    const result = fetchLatestVersion('missing-package');
    expect(result).toBeNull();
  });

  test('empty stdout returns null', () => {
    mockSpawnProcessSync.mockReturnValue({ exitCode: 0, stdout: '', stderr: '' });

    const result = fetchLatestVersion('some-package');
    expect(result).toBeNull();
  });

  test('spawnProcessSync throwing returns null', () => {
    mockSpawnProcessSync.mockImplementation(() => {
      throw new Error('spawn failed');
    });

    const result = fetchLatestVersion('some-package');
    expect(result).toBeNull();
  });
});

describe('checkForUpdates', () => {
  test('local plugins (no npmPackageName) are skipped', () => {
    mockSpawnProcessSync.mockReturnValue({ exitCode: 0, stdout: '2.0.0\n', stderr: '' });

    const state = createState();
    state.registry = buildRegistry([makePlugin('local-plugin', { trustTier: 'local', npmPackageName: undefined })], []);

    checkForUpdates(state);

    expect(mockSpawnProcessSync).not.toHaveBeenCalled();
    expect(state.outdatedPlugins).toHaveLength(0);
  });

  test('outdated npm plugin is added to state.outdatedPlugins', () => {
    mockNpmView('2.0.0');

    const state = createState();
    state.registry = buildRegistry(
      [makePlugin('my-plugin', { version: '1.0.0', npmPackageName: 'opentabs-plugin-my' })],
      [],
    );

    checkForUpdates(state);

    expect(state.outdatedPlugins).toHaveLength(1);
    expect(state.outdatedPlugins[0]?.name).toBe('opentabs-plugin-my');
    expect(state.outdatedPlugins[0]?.currentVersion).toBe('1.0.0');
    expect(state.outdatedPlugins[0]?.latestVersion).toBe('2.0.0');
  });

  test('up-to-date plugin is NOT added to state.outdatedPlugins', () => {
    mockNpmView('1.0.0');

    const state = createState();
    state.registry = buildRegistry(
      [makePlugin('my-plugin', { version: '1.0.0', npmPackageName: 'opentabs-plugin-my' })],
      [],
    );

    checkForUpdates(state);

    expect(state.outdatedPlugins).toHaveLength(0);
  });

  test('fetchLatestVersion returning null does not add to outdatedPlugins', () => {
    mockNpmView(undefined);

    const state = createState();
    state.registry = buildRegistry(
      [makePlugin('my-plugin', { version: '1.0.0', npmPackageName: 'opentabs-plugin-my' })],
      [],
    );

    checkForUpdates(state);

    expect(state.outdatedPlugins).toHaveLength(0);
  });

  test('empty plugins map results in empty outdatedPlugins', () => {
    const state = createState();
    checkForUpdates(state);
    expect(state.outdatedPlugins).toHaveLength(0);
  });

  test('mixed results: outdated + failed npm view', () => {
    let callCount = 0;
    mockSpawnProcessSync.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return { exitCode: 0, stdout: '2.0.0\n', stderr: '' };
      }
      return { exitCode: 1, stdout: '', stderr: 'npm ERR! code E404' };
    });

    const state = createState();
    state.registry = buildRegistry(
      [
        makePlugin('plugin-a', { version: '1.0.0', npmPackageName: 'opentabs-plugin-a' }),
        makePlugin('plugin-b', { version: '1.0.0', npmPackageName: 'opentabs-plugin-b' }),
      ],
      [],
    );

    checkForUpdates(state);

    // plugin-a gets version 2.0.0 (outdated), plugin-b npm view fails (skipped)
    expect(state.outdatedPlugins).toHaveLength(1);
    expect(state.outdatedPlugins[0]?.name).toBe('opentabs-plugin-a');
  });
});
