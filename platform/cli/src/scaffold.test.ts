import type * as ChildProcess from 'node:child_process';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import type * as FsPromises from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { ResolvedVersions } from './scaffold.js';
import { resolvePluginSdkVersions, ScaffoldError, scaffoldPlugin, toPascalCase, toTitleCase } from './scaffold.js';

vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof FsPromises>();
  return { ...actual, writeFile: vi.fn(actual.writeFile) };
});

vi.mock('node:child_process', async importOriginal => {
  const actual = await importOriginal<typeof ChildProcess>();
  return { ...actual, execFile: vi.fn(actual.execFile) };
});

describe('toTitleCase', () => {
  test('converts hyphenated name to space-separated title case', () => {
    expect(toTitleCase('my-cool-plugin')).toBe('My Cool Plugin');
  });

  test('capitalizes a single word', () => {
    expect(toTitleCase('slack')).toBe('Slack');
  });

  test('handles two-part names', () => {
    expect(toTitleCase('my-plugin')).toBe('My Plugin');
  });
});

describe('toPascalCase', () => {
  test('converts hyphenated name to PascalCase', () => {
    expect(toPascalCase('my-plugin')).toBe('MyPlugin');
  });

  test('capitalizes a single word', () => {
    expect(toPascalCase('slack')).toBe('Slack');
  });

  test('converts multi-part hyphenated name', () => {
    expect(toPascalCase('my-cool-plugin')).toBe('MyCoolPlugin');
  });
});

describe('scaffoldPlugin', () => {
  let tmpDir: string;
  let originalCwd: string;
  let originalConfigDir: string | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'opentabs-scaffold-test-'));
    originalCwd = process.cwd();
    originalConfigDir = process.env.OPENTABS_CONFIG_DIR;

    // Change cwd so scaffoldPlugin creates projects in the temp dir
    process.chdir(tmpDir);
    // Point config to temp dir for test isolation
    process.env.OPENTABS_CONFIG_DIR = join(tmpDir, '.opentabs');
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.chdir(originalCwd);
    if (originalConfigDir !== undefined) {
      process.env.OPENTABS_CONFIG_DIR = originalConfigDir;
    } else {
      delete process.env.OPENTABS_CONFIG_DIR;
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test('valid scaffold creates expected file structure', async () => {
    await scaffoldPlugin({ name: 'test-plugin', domain: 'example.com' });

    const projectDir = join(tmpDir, 'test-plugin');
    expect(existsSync(join(projectDir, 'package.json'))).toBe(true);
    expect(existsSync(join(projectDir, 'src', 'index.ts'))).toBe(true);
    expect(existsSync(join(projectDir, 'src', 'tools', 'example.ts'))).toBe(true);
    expect(existsSync(join(projectDir, 'tsconfig.json'))).toBe(true);
    expect(existsSync(join(projectDir, 'biome.json'))).toBe(true);
    expect(existsSync(join(projectDir, '.gitignore'))).toBe(true);
  });

  test("domain 'slack.com' produces URL pattern '*://*.slack.com/*'", async () => {
    await scaffoldPlugin({ name: 'slack', domain: 'slack.com' });

    const indexContent = await readFile(join(tmpDir, 'slack', 'src', 'index.ts'), 'utf-8');
    expect(indexContent).toContain('*://*.slack.com/*');
  });

  test("domain '.slack.com' produces URL pattern '*://*.slack.com/*'", async () => {
    await scaffoldPlugin({ name: 'wildcard', domain: '.slack.com' });

    const indexContent = await readFile(join(tmpDir, 'wildcard', 'src', 'index.ts'), 'utf-8');
    expect(indexContent).toContain('*://*.slack.com/*');
  });

  test("domain 'localhost' produces URL pattern '*://localhost/*' (no wildcard)", async () => {
    await scaffoldPlugin({ name: 'local', domain: 'localhost' });

    const indexContent = await readFile(join(tmpDir, 'local', 'src', 'index.ts'), 'utf-8');
    expect(indexContent).toContain('*://localhost/*');
  });

  test('invalid name throws ScaffoldError', async () => {
    let caught: Error | undefined;
    try {
      await scaffoldPlugin({ name: 'INVALID NAME!', domain: 'example.com' });
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).toBeInstanceOf(ScaffoldError);
  });

  test('existing directory throws ScaffoldError', async () => {
    const existingDir = join(tmpDir, 'existing');
    mkdirSync(existingDir, { recursive: true });

    let caught: Error | undefined;
    try {
      await scaffoldPlugin({ name: 'existing', domain: 'example.com' });
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).toBeInstanceOf(ScaffoldError);
    expect(caught?.message).toContain('already exists');
  });

  test('scaffolded biome.json includes linter rules and formatter settings', async () => {
    await scaffoldPlugin({ name: 'test-plugin', domain: 'example.com' });

    const biomeConfig = await readFile(join(tmpDir, 'test-plugin', 'biome.json'), 'utf-8');
    const config = JSON.parse(biomeConfig);
    expect(config.$schema).toContain('biomejs.dev');
    expect(config.javascript.formatter.quoteStyle).toBe('single');
    expect(config.linter.rules.correctness.noUnusedVariables).toBe('error');
  });

  test('generated package.json uses scoped name, publishConfig, and resolved version', async () => {
    mockNpmViewSuccess('0.0.60');

    await scaffoldPlugin({ name: 'figma', domain: 'figma.com' });

    const pkg = JSON.parse(await readFile(join(tmpDir, 'figma', 'package.json'), 'utf-8')) as {
      name: string;
      version: string;
      publishConfig: { access: string };
    };

    expect(pkg.name).toBe('@opentabs-dev/opentabs-plugin-figma');
    expect(pkg.publishConfig).toEqual({ access: 'restricted' });
    expect(pkg.version).toBe('0.0.60');
  });

  test('cleans up partial directory if a file write fails, allowing retry', async () => {
    const fsp = await import('node:fs/promises');
    vi.mocked(fsp.writeFile).mockRejectedValueOnce(new Error('Disk full'));

    const projectDir = join(tmpDir, 'cleanup-test');

    await expect(scaffoldPlugin({ name: 'cleanup-test', domain: 'example.com' })).rejects.toThrow('Disk full');

    expect(existsSync(projectDir)).toBe(false);

    // Retry with same name succeeds now that the partial dir was cleaned up
    await expect(scaffoldPlugin({ name: 'cleanup-test', domain: 'example.com' })).resolves.toBeDefined();
    expect(existsSync(join(projectDir, 'package.json'))).toBe(true);
  });
});

// --- Version resolution ---

type ExecFileCallback = (err: Error | null, stdout: string, stderr: string) => void;

/** Mock execFile to simulate a successful `npm view` returning the given version. */
const mockNpmViewSuccess = (version: string) => {
  vi.mocked(execFile).mockImplementation(((_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
    (callback as ExecFileCallback)(null, `${version}\n`, '');
    return undefined as never;
  }) as unknown as typeof execFile);
};

/** Mock execFile to simulate a failed `npm view` (offline/auth error). */
const mockNpmViewFailure = () => {
  vi.mocked(execFile).mockImplementation(((_cmd: unknown, _args: unknown, _opts: unknown, callback: unknown) => {
    (callback as ExecFileCallback)(new Error('npm ERR! 404 Not Found'), '', '');
    return undefined as never;
  }) as unknown as typeof execFile);
};

describe('resolvePluginSdkVersions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('uses npm registry version when npm view succeeds', async () => {
    mockNpmViewSuccess('0.0.99');

    const versions: ResolvedVersions = await resolvePluginSdkVersions();

    expect(versions.openTabsVersion).toBe('^0.0.99');
    expect(versions.source).toBe('registry');
  });

  test('falls back to local SDK version when npm view fails', async () => {
    mockNpmViewFailure();

    const versions: ResolvedVersions = await resolvePluginSdkVersions();

    expect(versions.source).toBe('local');
    expect(versions.openTabsVersion).toMatch(/^\^\d+\.\d+\.\d+$/);
  });

  test('resolved version is a valid semver caret range', async () => {
    mockNpmViewSuccess('1.2.3');

    const versions: ResolvedVersions = await resolvePluginSdkVersions();

    expect(versions.openTabsVersion).toMatch(/^\^\d+\.\d+\.\d+$/);
  });

  test('resolved version is never "*" when npm view succeeds', async () => {
    mockNpmViewSuccess('0.0.60');

    const versions: ResolvedVersions = await resolvePluginSdkVersions();

    expect(versions.openTabsVersion).not.toBe('*');
  });

  test('zod version comes from local SDK regardless of registry source', async () => {
    mockNpmViewSuccess('0.0.99');

    const versions: ResolvedVersions = await resolvePluginSdkVersions();

    // zod version should be a real version from the local SDK, not '*'
    expect(versions.zodVersion).toBeDefined();
    expect(typeof versions.zodVersion).toBe('string');
  });
});

describe('scaffoldPlugin version resolution', () => {
  let tmpDir: string;
  let originalCwd: string;
  let originalConfigDir: string | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'opentabs-scaffold-ver-test-'));
    originalCwd = process.cwd();
    originalConfigDir = process.env.OPENTABS_CONFIG_DIR;
    process.chdir(tmpDir);
    process.env.OPENTABS_CONFIG_DIR = join(tmpDir, '.opentabs');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.chdir(originalCwd);
    if (originalConfigDir !== undefined) {
      process.env.OPENTABS_CONFIG_DIR = originalConfigDir;
    } else {
      delete process.env.OPENTABS_CONFIG_DIR;
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test('scaffolded package.json uses npm registry version when available', async () => {
    mockNpmViewSuccess('0.0.99');

    await scaffoldPlugin({ name: 'registry-test', domain: 'example.com' });

    const pkg = JSON.parse(await readFile(join(tmpDir, 'registry-test', 'package.json'), 'utf-8')) as {
      name: string;
      version: string;
      publishConfig: { access: string };
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(pkg.name).toBe('@opentabs-dev/opentabs-plugin-registry-test');
    expect(pkg.version).toBe('0.0.99');
    expect(pkg.publishConfig).toEqual({ access: 'restricted' });
    expect(pkg.dependencies['@opentabs-dev/plugin-sdk']).toBe('^0.0.99');
    expect(pkg.devDependencies['@opentabs-dev/plugin-tools']).toBe('^0.0.99');
  });

  test('scaffolded package.json falls back to local version when npm view fails', async () => {
    mockNpmViewFailure();

    await scaffoldPlugin({ name: 'fallback-test', domain: 'example.com' });

    const pkg = JSON.parse(await readFile(join(tmpDir, 'fallback-test', 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    // Should be a valid caret range (from local SDK), not '*'
    expect(pkg.dependencies['@opentabs-dev/plugin-sdk']).toMatch(/^\^\d+\.\d+\.\d+$/);
    expect(pkg.devDependencies['@opentabs-dev/plugin-tools']).toMatch(/^\^\d+\.\d+\.\d+$/);
  });

  test('plugin-sdk and plugin-tools receive the same resolved version', async () => {
    mockNpmViewSuccess('0.0.77');

    await scaffoldPlugin({ name: 'same-ver', domain: 'example.com' });

    const pkg = JSON.parse(await readFile(join(tmpDir, 'same-ver', 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(pkg.dependencies['@opentabs-dev/plugin-sdk']).toBe(pkg.devDependencies['@opentabs-dev/plugin-tools']);
  });
});
