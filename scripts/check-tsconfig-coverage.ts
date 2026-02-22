/**
 * Verifies that every .ts/.tsx file in the repository is covered by a tsconfig
 * that `tsc --build` reaches from the root tsconfig.json.
 *
 * Parses each tsconfig referenced from the root, resolves its include/exclude
 * patterns to concrete files, and reports any source files that fall outside
 * all tsconfigs.
 *
 * Usage: bun scripts/check-tsconfig-coverage.ts
 */

import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

/** Directories containing source files that must be type-checked. */
const SCAN_DIRS = ['platform', 'e2e', 'scripts'];

/** Root-level TypeScript files that must be type-checked (covered by tsconfig.configs.json). */
const ROOT_TS_FILES = ['eslint.config.ts', 'knip.ts', 'playwright.config.ts'];

/** Path segments indicating non-source directories. */
const SKIP_SEGMENTS = new Set(['node_modules', 'dist']);

interface TsConfig {
  include?: string[];
  files?: string[];
  exclude?: string[];
  references?: Array<{ path: string }>;
}

/**
 * Returns true if a relative path contains a segment to skip
 * (node_modules or dist).
 */
const shouldSkip = (relPath: string): boolean => relPath.split('/').some(segment => SKIP_SEGMENTS.has(segment));

/**
 * Converts a tsconfig `include` entry to a glob pattern matching .ts/.tsx files.
 *
 * TypeScript treats bare directory names as `dir/**\/*`. Glob patterns and
 * exact file names pass through unchanged.
 */
const toGlob = (pattern: string): string => {
  if (pattern.endsWith('.ts') || pattern.endsWith('.tsx')) return pattern;
  if (pattern.includes('*')) return pattern;
  return `${pattern}/**/*.{ts,tsx}`;
};

/**
 * Resolves a tsconfig's effective file set: files matching `include` minus
 * those matching `exclude`, with paths resolved relative to the tsconfig's
 * directory.
 */
const resolveConfigFiles = async (tsconfigPath: string): Promise<Set<string>> => {
  const raw = await Bun.file(tsconfigPath).text();
  const config = JSON.parse(raw) as TsConfig;
  const configDir = dirname(tsconfigPath);
  const result = new Set<string>();

  const includes = config.include ?? config.files ?? [];
  const excludeGlobs = (config.exclude ?? []).map(p => new Bun.Glob(p));

  for (const pattern of includes) {
    const glob = new Bun.Glob(toGlob(pattern));
    for (const match of glob.scanSync({ cwd: configDir })) {
      if (match.endsWith('.d.ts')) continue;
      if (shouldSkip(match)) continue;
      if (excludeGlobs.some(eg => eg.match(match))) continue;
      result.add(resolve(configDir, match));
    }
  }

  return result;
};

/**
 * Collects all .ts/.tsx source files that should be type-checked.
 */
const collectAllFiles = async (): Promise<Set<string>> => {
  const files = new Set<string>();
  const glob = new Bun.Glob('**/*.{ts,tsx}');

  for (const dir of SCAN_DIRS) {
    for (const match of glob.scanSync({ cwd: join(ROOT, dir) })) {
      if (match.endsWith('.d.ts')) continue;
      if (shouldSkip(match)) continue;
      files.add(resolve(ROOT, dir, match));
    }
  }

  for (const name of ROOT_TS_FILES) {
    const fullPath = resolve(ROOT, name);
    if (await Bun.file(fullPath).exists()) files.add(fullPath);
  }

  return files;
};

/**
 * Collects all files covered by tsconfigs referenced from the root tsconfig.json.
 */
const collectCoveredFiles = async (): Promise<Set<string>> => {
  const raw = await Bun.file(join(ROOT, 'tsconfig.json')).text();
  const rootConfig = JSON.parse(raw) as TsConfig;
  const covered = new Set<string>();

  for (const ref of rootConfig.references ?? []) {
    const tsconfigPath = ref.path.endsWith('.json')
      ? resolve(ROOT, ref.path)
      : resolve(ROOT, ref.path, 'tsconfig.json');

    for (const file of await resolveConfigFiles(tsconfigPath)) {
      covered.add(file);
    }
  }

  return covered;
};

const allFiles = await collectAllFiles();
const coveredFiles = await collectCoveredFiles();
const uncovered = [...allFiles].filter(f => !coveredFiles.has(f)).sort();

if (uncovered.length === 0) {
  console.log(`✓ All ${allFiles.size} .ts/.tsx files are covered by a tsconfig`);
  process.exit(0);
}

console.error(`✗ ${uncovered.length} .ts/.tsx file(s) not covered by any tsconfig:\n`);
for (const file of uncovered) {
  console.error(`  ${relative(ROOT, file)}`);
}
console.error(
  '\nAdd uncovered files to an existing tsconfig or create a new one\nand reference it from the root tsconfig.json.',
);
process.exit(1);
