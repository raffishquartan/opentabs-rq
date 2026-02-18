import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CLI_PATH = resolve(import.meta.dirname, '..', 'dist', 'index.js');

/** Spawn the create-opentabs-plugin CLI binary synchronously. */
const runCli = (
  args: string[],
  opts: { cwd: string; configDir: string },
): { exitCode: number; stdout: string; stderr: string } => {
  const result = Bun.spawnSync(['bun', CLI_PATH, ...args], {
    cwd: opts.cwd,
    env: { ...Bun.env, OPENTABS_CONFIG_DIR: opts.configDir },
  });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
};

describe('create-opentabs-plugin CLI', () => {
  let tmpDir: string;
  let configDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'opentabs-create-plugin-test-'));
    configDir = join(tmpDir, '.opentabs');
    mkdirSync(configDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('successful scaffolding', () => {
    test('scaffolds a valid plugin project with all expected files', () => {
      const { exitCode } = runCli(['test-plugin', '--domain', 'example.com'], {
        cwd: tmpDir,
        configDir,
      });

      expect(exitCode).toBe(0);

      const projectDir = join(tmpDir, 'test-plugin');
      expect(existsSync(join(projectDir, 'package.json'))).toBe(true);
      expect(existsSync(join(projectDir, 'tsconfig.json'))).toBe(true);
      expect(existsSync(join(projectDir, 'eslint.config.ts'))).toBe(true);
      expect(existsSync(join(projectDir, '.prettierrc'))).toBe(true);
      expect(existsSync(join(projectDir, '.gitignore'))).toBe(true);
      expect(existsSync(join(projectDir, 'src', 'index.ts'))).toBe(true);
      expect(existsSync(join(projectDir, 'src', 'tools', 'example.ts'))).toBe(true);
    });

    test('package.json has correct name and dependencies', async () => {
      runCli(['my-plugin', '--domain', 'example.com'], { cwd: tmpDir, configDir });

      const pkgJson = (await Bun.file(join(tmpDir, 'my-plugin', 'package.json')).json()) as {
        name: string;
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
      };

      expect(pkgJson.name).toBe('opentabs-plugin-my-plugin');
      expect(pkgJson.dependencies['@opentabs-dev/plugin-sdk']).toBeDefined();
      expect(pkgJson.devDependencies['@opentabs-dev/cli']).toBeDefined();
    });

    test('src/index.ts contains correct class name and URL pattern', async () => {
      runCli(['my-plugin', '--domain', 'example.com'], { cwd: tmpDir, configDir });

      const indexContent = await Bun.file(join(tmpDir, 'my-plugin', 'src', 'index.ts')).text();
      expect(indexContent).toContain('class MyPluginPlugin');
      expect(indexContent).toContain('"*://example.com/*"');
      expect(indexContent).toContain('export default new MyPluginPlugin()');
    });

    test('src/tools/example.ts contains a defineTool call with Zod schemas', async () => {
      runCli(['my-plugin', '--domain', 'example.com'], { cwd: tmpDir, configDir });

      const toolContent = await Bun.file(join(tmpDir, 'my-plugin', 'src', 'tools', 'example.ts')).text();
      expect(toolContent).toContain('defineTool(');
      expect(toolContent).toContain('z.object(');
      expect(toolContent).toContain('z.string()');
    });

    test('plugin is auto-registered in isolated config.json', async () => {
      runCli(['my-plugin', '--domain', 'example.com'], { cwd: tmpDir, configDir });

      const configPath = join(configDir, 'config.json');
      expect(existsSync(configPath)).toBe(true);

      const config = (await Bun.file(configPath).json()) as { plugins: string[] };
      expect(Array.isArray(config.plugins)).toBe(true);
      expect(config.plugins.length).toBeGreaterThan(0);

      const hasPluginPath = config.plugins.some((p: string) => p.includes('my-plugin'));
      expect(hasPluginPath).toBe(true);
    });
  });

  describe('--display and --description options', () => {
    test('--display is reflected in generated code', async () => {
      runCli(['my-app', '--domain', 'example.com', '--display', 'My App'], { cwd: tmpDir, configDir });

      const indexContent = await Bun.file(join(tmpDir, 'my-app', 'src', 'index.ts')).text();
      expect(indexContent).toContain('"My App"');

      const toolContent = await Bun.file(join(tmpDir, 'my-app', 'src', 'tools', 'example.ts')).text();
      expect(toolContent).toContain('My App');
    });

    test('--description is reflected in generated code', async () => {
      runCli(['my-app', '--domain', 'example.com', '--description', 'Custom description'], {
        cwd: tmpDir,
        configDir,
      });

      const indexContent = await Bun.file(join(tmpDir, 'my-app', 'src', 'index.ts')).text();
      expect(indexContent).toContain('Custom description');
    });
  });

  describe('error handling', () => {
    test('invalid plugin name (uppercase) exits with code 1 and prints error', () => {
      const { exitCode, stderr } = runCli(['MyPlugin', '--domain', 'example.com'], {
        cwd: tmpDir,
        configDir,
      });

      expect(exitCode).toBe(1);
      expect(stderr).toContain('must be lowercase alphanumeric with hyphens');
    });

    test('reserved plugin name exits with code 1 and prints error', () => {
      const { exitCode, stderr } = runCli(['system', '--domain', 'example.com'], {
        cwd: tmpDir,
        configDir,
      });

      expect(exitCode).toBe(1);
      expect(stderr).toContain('reserved');
    });

    test('existing directory exits with code 1 and prints "already exists" error', () => {
      mkdirSync(join(tmpDir, 'existing-plugin'));

      const { exitCode, stderr } = runCli(['existing-plugin', '--domain', 'example.com'], {
        cwd: tmpDir,
        configDir,
      });

      expect(exitCode).toBe(1);
      expect(stderr).toContain('already exists');
    });

    test('missing --domain flag exits with code 1 and prints usage error', () => {
      const { exitCode, stderr } = runCli(['my-plugin'], { cwd: tmpDir, configDir });

      expect(exitCode).toBe(1);
      expect(stderr).toContain('--domain');
    });
  });

  describe('domain URL pattern generation', () => {
    test("domain '.example.com' produces wildcard URL pattern '*://*.example.com/*'", async () => {
      runCli(['wildcard-test', '--domain', '.example.com'], { cwd: tmpDir, configDir });

      const indexContent = await Bun.file(join(tmpDir, 'wildcard-test', 'src', 'index.ts')).text();
      expect(indexContent).toContain('*://*.example.com/*');
    });

    test("domain 'example.com' produces exact URL pattern '*://example.com/*'", async () => {
      runCli(['exact-test', '--domain', 'example.com'], { cwd: tmpDir, configDir });

      const indexContent = await Bun.file(join(tmpDir, 'exact-test', 'src', 'index.ts')).text();
      expect(indexContent).toContain('*://example.com/*');
      expect(indexContent).not.toContain('*://*.example.com/*');
    });
  });
});
