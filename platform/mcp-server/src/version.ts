/**
 * Package version, read from package.json at startup.
 *
 * Wrapped in try/catch so a missing or unreadable package.json
 * (e.g., running from a different working directory or restructured dist)
 * falls back to '0.0.0' instead of crashing the entire module import chain.
 */

import { readJsonFile } from '@opentabs-dev/shared';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let version = '0.0.0';

try {
  const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
  const pkgJson: unknown = await readJsonFile(pkgPath);
  if (pkgJson !== null && typeof pkgJson === 'object' && 'version' in pkgJson && typeof pkgJson.version === 'string') {
    version = pkgJson.version;
  }
} catch {
  // package.json missing or unreadable — use fallback version
}

export { version };
