/**
 * Verifies that all platform packages are version-locked and that every
 * internal `@opentabs-dev/*` cross-reference pins to the same version.
 *
 * Catches the npm `^0.0.x` exact-pin trap: `^0.0.100` in a published
 * cli@0.0.102 resolves to exactly `0.0.100`, which caused issue #58.
 *
 * Usage: tsx scripts/check-platform-versions.ts
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

const PLATFORM_PACKAGES = [
  'shared',
  'browser-extension',
  'mcp-server',
  'plugin-sdk',
  'plugin-tools',
  'cli',
  'create-plugin',
];

interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const errors: string[] = [];
const pkgs = new Map<string, PackageJson>();

for (const dir of PLATFORM_PACKAGES) {
  const path = join(ROOT, 'platform', dir, 'package.json');
  const pkg = JSON.parse(readFileSync(path, 'utf8')) as PackageJson;
  pkgs.set(pkg.name, pkg);
}

const versions = new Set(Array.from(pkgs.values(), p => p.version));
if (versions.size !== 1) {
  errors.push(`Platform packages are not version-locked. Found versions: ${[...versions].join(', ')}`);
}

const expectedVersion = pkgs.get('@opentabs-dev/shared')?.version;
const expectedRange = `^${expectedVersion}`;

for (const pkg of pkgs.values()) {
  for (const depMap of [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies]) {
    if (!depMap) continue;
    for (const [name, range] of Object.entries(depMap)) {
      if (!name.startsWith('@opentabs-dev/')) continue;
      if (!pkgs.has(name)) continue;
      if (range !== expectedRange) {
        errors.push(`${pkg.name}: dep ${name} = "${range}", expected "${expectedRange}"`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Platform version consistency check failed:');
  for (const err of errors) console.error(`  - ${err}`);
  console.error('\nRun the bump-version workflow or align cross-refs to the current platform version.');
  process.exit(1);
}

console.log(`Platform versions consistent: all ${pkgs.size} packages at ${expectedVersion}`);
