/**
 * Playwright global teardown — kills orphaned test server processes.
 *
 * When tests crash, time out, or are interrupted, subprocess servers
 * (MCP servers, test servers) may survive because their parent's
 * cleanup code never ran. This teardown sweeps for any bun processes
 * started from temp directories matching the E2E naming convention
 * and kills them.
 */

import { execSync } from 'node:child_process';

export default function globalTeardown(): void {
  try {
    // Find bun processes whose command line contains opentabs-e2e-server
    // or opentabs-e2e- temp paths (the naming convention used by fixtures.ts).
    // Use pgrep for a portable process search; -f matches the full command line.
    const pids = execSync('pgrep -f "opentabs-e2e-"', { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);

    if (pids.length > 0) {
      // SIGTERM first for graceful shutdown (test servers now handle it)
      execSync(`kill ${pids.join(' ')}`, { encoding: 'utf-8' });
    }
  } catch {
    // pgrep returns exit code 1 when no processes match — expected when
    // all tests cleaned up properly. execSync also throws on non-zero exit.
  }
}
