/**
 * Browser extension installation logic.
 *
 * The installExtension() function is called by `opentabs start` for
 * auto-initialization on first run.
 */

import { EXTENSION_COPY_EXCLUDE_PATTERN } from '@opentabs-dev/shared';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { access, readFile, writeFile } from 'node:fs/promises';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const resolveExtensionDir = (): string => {
  try {
    return dirname(fileURLToPath(import.meta.resolve('@opentabs-dev/browser-extension/package.json')));
  } catch {
    const cliDir = dirname(fileURLToPath(import.meta.url));
    return resolve(cliDir, '..', '..', '..', 'browser-extension');
  }
};

const getCliVersion = async (): Promise<string> => {
  const cliPkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
  const pkgJson = JSON.parse(await readFile(cliPkgPath, 'utf-8')) as { version: string };
  return pkgJson.version;
};

interface InstallExtensionResult {
  /** Whether the extension was installed or updated (false = already up-to-date) */
  installed: boolean;
  /** Whether this was the first installation (no prior extension directory) */
  firstTime: boolean;
  /** The destination directory */
  extensionDest: string;
  /** The installed version */
  version: string;
}

/**
 * Install or update the browser extension to ~/.opentabs/extension/.
 *
 * Skips installation if the extension is already installed at the current version.
 * The configDir parameter specifies the base directory (defaults to ~/.opentabs).
 */
const installExtension = async (configDir: string): Promise<InstallExtensionResult> => {
  const extensionSrc = resolveExtensionDir();

  // Verify the extension source exists
  if (
    !(await access(join(extensionSrc, 'manifest.json')).then(
      () => true,
      () => false,
    ))
  ) {
    throw new Error(
      `Browser extension not found at ${extensionSrc}. Try reinstalling: npm install -g @opentabs-dev/cli`,
    );
  }

  const version = await getCliVersion();
  const extensionDest = join(configDir, 'extension');
  const versionMarkerPath = join(extensionDest, '.opentabs-version');
  const firstTime = !existsSync(join(extensionDest, 'manifest.json'));

  // Check if already up-to-date
  if (!firstTime) {
    if (
      await access(versionMarkerPath).then(
        () => true,
        () => false,
      )
    ) {
      const installedVersion = (await readFile(versionMarkerPath, 'utf-8')).trim();
      if (installedVersion === version) {
        return { installed: false, firstTime: false, extensionDest, version };
      }
    }
  }

  // Copy extension directory, skipping node_modules, src, .git, tsconfig*
  cpSync(extensionSrc, extensionDest, {
    recursive: true,
    force: true,
    filter: (source: string) => {
      const rel = relative(extensionSrc, source);
      return rel === '' || !EXTENSION_COPY_EXCLUDE_PATTERN.test(rel);
    },
  });

  // Create adapters directory for plugins
  mkdirSync(join(extensionDest, 'adapters'), { recursive: true });

  // Write version marker
  await writeFile(versionMarkerPath, version, 'utf-8');

  // Verify installation
  if (!existsSync(join(extensionDest, 'manifest.json'))) {
    throw new Error('Installation verification failed — manifest.json missing from destination.');
  }

  return { installed: true, firstTime, extensionDest, version };
};

export { installExtension };
export type { InstallExtensionResult };
