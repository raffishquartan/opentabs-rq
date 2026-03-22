/**
 * Publish platform packages to npm (private) and update plugins.
 *
 * Platform packages published (in dependency order):
 *   @opentabs-dev/shared, @opentabs-dev/browser-extension, @opentabs-dev/mcp-server,
 *   @opentabs-dev/plugin-sdk, @opentabs-dev/plugin-tools, @opentabs-dev/cli,
 *   @opentabs-dev/create-plugin.
 *
 * After publishing, plugins under plugins/ have their @opentabs-dev/* dependency
 * versions updated to ^<version>, then are reinstalled and rebuilt. Plugin
 * versions are NOT bumped — they have their own independent release lifecycle.
 *
 * Requires:
 *   - ~/.npmrc with a token that has read+write access to @opentabs-dev packages.
 *
 * Setup (one-time):
 *   1. Create a granular access token at https://www.npmjs.com/settings/tokens/create
 *      - Permissions: Read and Write, Packages: @opentabs-dev/*, Bypass 2FA enabled
 *   2. Save it: echo '//registry.npmjs.org/:_authToken=<TOKEN>' > ~/.npmrc
 *
 * Usage:
 *   tsx scripts/publish.ts <version>
 *   tsx scripts/publish.ts 0.0.3
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PackageJson {
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/** Run a command synchronously with inherited stdio. Throws on non-zero exit. */
const run = (cmd: string[], cwd: string = ROOT): void => {
  const [bin = '', ...args] = cmd;
  const result = spawnSync(bin, args, { cwd, stdio: ['inherit', 'inherit', 'inherit'] });
  if ((result.status ?? 0) !== 0) {
    throw new Error(`Command failed (exit ${result.status ?? 0}): ${cmd.join(' ')}`);
  }
};

/** Run a command and capture stdout. Throws on non-zero exit. */
const capture = (cmd: string[], cwd: string = ROOT): string => {
  const [bin = '', ...args] = cmd;
  const result = spawnSync(bin, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  if ((result.status ?? 0) !== 0) {
    const stderr = result.stderr.toString().trim();
    throw new Error(`Command failed (exit ${result.status ?? 0}): ${cmd.join(' ')}\n${stderr}`);
  }
  return result.stdout.toString().trim();
};

/** Read and parse a package.json file. */
const readPackageJson = async (pkgDir: string): Promise<PackageJson> => {
  const filePath = resolve(ROOT, pkgDir, 'package.json');
  return JSON.parse(await readFile(filePath, 'utf-8')) as PackageJson;
};

/** Write a package.json file with standard formatting (2-space indent, trailing newline). */
const writePackageJson = async (pkgDir: string, data: PackageJson): Promise<void> => {
  const filePath = resolve(ROOT, pkgDir, 'package.json');
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
};

// ---------------------------------------------------------------------------
// Packages in dependency order
// ---------------------------------------------------------------------------

const PACKAGES = [
  'platform/shared',
  'platform/browser-extension',
  'platform/mcp-server',
  'platform/plugin-sdk',
  'platform/plugin-tools',
  'platform/cli',
  'platform/create-plugin',
] as const;

/** @opentabs-dev dependency names that plugins reference. */
const OPENTABS_DEP_NAMES = ['@opentabs-dev/plugin-sdk', '@opentabs-dev/plugin-tools'] as const;

/**
 * Auto-discover plugin directories under plugins/.
 * A directory is a plugin if it contains a package.json.
 */
const discoverPlugins = (): string[] => {
  const pluginsDir = resolve(ROOT, 'plugins');
  return readdirSync(pluginsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => `plugins/${d.name}`)
    .filter(dir => existsSync(resolve(ROOT, dir, 'package.json')));
};

// ---------------------------------------------------------------------------
// (Changelog generation removed — GitHub Releases auto-generates release notes
// from conventional commit messages when a version tag is pushed.)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async (): Promise<void> => {
  const version = process.argv[2];
  if (!version) {
    console.error('Usage: tsx scripts/publish.ts <version>');
    console.error('Example: tsx scripts/publish.ts 0.0.3');
    process.exit(1);
  }

  // Check for uncommitted changes
  const status = capture(['git', 'status', '--porcelain']);
  if (status.length > 0) {
    console.log('Warning: git working directory has uncommitted changes.');
    process.stdout.write('Continue anyway? [y/N] ');
    const answer = await new Promise<string>(resolve => {
      process.stdin.once('data', data => {
        resolve(data.toString().trim());
      });
    });
    if (answer.toLowerCase() !== 'y') {
      process.exit(1);
    }
  }

  // 1. Verify npm authentication
  console.log('==> Verifying npm authentication...');
  let npmUser: string;
  try {
    npmUser = capture(['npm', 'whoami']);
  } catch {
    console.error('Error: npm authentication failed.');
    console.error('');
    console.error('Ensure ~/.npmrc has a valid token with read+write access.');
    console.error("Run 'npm login --scope=@opentabs-dev' or add a granular token to ~/.npmrc.");
    process.exit(1);
  }
  console.log(`  Authenticated as: ${npmUser}`);

  // 2. Bump versions
  console.log('');
  console.log(`==> Bumping versions to ${version}...`);
  for (const pkg of PACKAGES) {
    const data = await readPackageJson(pkg);
    data.version = version;
    await writePackageJson(pkg, data);
    console.log(`  ${pkg}/package.json → ${version}`);
  }

  // 3. Delete lockfile and reinstall so npm picks up the bumped workspace versions.
  //    Without this, `npm publish` resolves workspace:* to the old lockfile versions.
  console.log('');
  console.log('==> Syncing lockfile and rebuilding with new versions...');
  const lockPath = resolve(ROOT, 'package-lock.json');
  if (existsSync(lockPath)) {
    unlinkSync(lockPath);
  }
  run(['npm', 'install']);
  run(['npm', 'run', 'build:force']);

  // 4. Publish packages in dependency order
  console.log('');
  console.log('==> Publishing packages (dependency order)...');
  console.log('');
  for (const pkg of PACKAGES) {
    const shortName = pkg.split('/')[1] ?? pkg;
    const pkgName = `@opentabs-dev/${shortName}`;
    console.log(`  Publishing ${pkgName}@${version}...`);
    run(['npm', 'publish', '--access', 'restricted'], resolve(ROOT, pkg));
  }

  console.log('');
  console.log(`==> Published all packages at v${version}`);

  // 5. Update plugin dependencies and rebuild
  const plugins = discoverPlugins();
  if (plugins.length > 0) {
    console.log('');
    console.log(`==> Updating ${plugins.length} plugin(s) to use @opentabs-dev/*@^${version}...`);
    for (const plugin of plugins) {
      const data = await readPackageJson(plugin);
      for (const depName of OPENTABS_DEP_NAMES) {
        if (data.dependencies?.[depName]) data.dependencies[depName] = `^${version}`;
        if (data.devDependencies?.[depName]) data.devDependencies[depName] = `^${version}`;
      }
      await writePackageJson(plugin, data);
      console.log(`  ${plugin}/package.json — deps → ^${version}`);
    }

    // Wait for npm registry to propagate the new versions before installing.
    console.log('');
    console.log('  Waiting 10s for npm registry propagation...');
    await new Promise(r => setTimeout(r, 10_000));

    console.log('');
    console.log('==> Installing and rebuilding plugins...');
    for (const plugin of plugins) {
      const pluginDir = resolve(ROOT, plugin);
      // Remove lockfile so npm resolves fresh versions from registry
      const pluginLockPath = resolve(pluginDir, 'package-lock.json');
      if (existsSync(pluginLockPath)) {
        unlinkSync(pluginLockPath);
      }
      console.log(`  ${plugin}: npm install...`);
      run(['npm', 'install'], pluginDir);
      console.log(`  ${plugin}: npm run build...`);
      run(['npm', 'run', 'build'], pluginDir);
    }
  }

  // 6. Commit and tag
  console.log('');
  console.log('==> Creating release commit and tag...');

  const filesToStage = PACKAGES.map(pkg => `${pkg}/package.json`);
  for (const plugin of plugins) {
    filesToStage.push(`${plugin}/package.json`);
    filesToStage.push(`${plugin}/package-lock.json`);
  }

  run(['git', 'add', '-f', ...filesToStage]);
  run(['git', 'commit', '-m', `release: v${version}`]);
  run(['git', 'tag', `v${version}`]);

  console.log('');
  console.log(`==> Release v${version} committed and tagged.`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. git push && git push --tags');
  console.log('  2. GitHub Actions will auto-create a release with generated notes');
};

await main();
