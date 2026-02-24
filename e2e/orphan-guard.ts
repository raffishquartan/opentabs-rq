/**
 * Orphan guard — self-terminates a process when its parent dies.
 *
 * When a Claude agent or ralph worker is killed (especially SIGKILL),
 * child processes like test servers, MCP servers, and Chromium instances
 * become orphans reparented to PID 1 (launchd on macOS, init on Linux).
 *
 * This module polls whether the original parent process is still alive
 * using kill(ppid, 0). When the parent is gone, the process exits.
 *
 * Note: Bun caches process.ppid and does not reflect reparenting to
 * PID 1, so we cannot rely on process.ppid changing. Instead we check
 * whether the original parent PID still exists as a running process.
 *
 * Usage: import at the top of any long-lived subprocess entry point:
 *
 *   import './orphan-guard.js';
 *
 * Or for the MCP server wrapper (generated .js files), inject as an
 * inline snippet via createServerWrapper().
 */

const POLL_INTERVAL_MS = 5_000;
const originalPpid = process.ppid;

/**
 * Check if a process is alive by sending signal 0.
 * Returns false if the process does not exist (ESRCH).
 */
const isProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const timer = setInterval(() => {
  if (!isProcessAlive(originalPpid)) {
    console.error(`[orphan-guard] Parent (PID ${String(originalPpid)}) is gone, exiting.`);
    clearInterval(timer);
    process.exit(1);
  }
}, POLL_INTERVAL_MS);

// Unref so the timer alone doesn't keep the process alive if all
// other work has finished (e.g., server.stop() was already called).
timer.unref();
