/**
 * SDK version that the MCP server is built against.
 *
 * Reads the version from platform/plugin-sdk/package.json (resolved relative
 * to this file's location in the monorepo). Used at plugin load time to check
 * SDK compatibility: a plugin's sdkVersion (from its tools.json) must have a
 * major.minor <= the server's SDK major.minor.
 */

import { readJsonFile } from '@opentabs-dev/shared';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let sdkVersion = '0.0.0';

try {
  const sdkPkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'plugin-sdk', 'package.json');
  const pkgJson: unknown = await readJsonFile(sdkPkgPath);
  if (pkgJson !== null && typeof pkgJson === 'object' && 'version' in pkgJson && typeof pkgJson.version === 'string') {
    sdkVersion = pkgJson.version;
  }
} catch {
  // plugin-sdk package.json missing or unreadable — use fallback version
}

export { sdkVersion };
