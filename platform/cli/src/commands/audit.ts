/**
 * `opentabs audit` command — shows recent tool invocation history.
 *
 * By default, queries the running MCP server's in-memory audit buffer.
 * With --file, reads from the persistent disk log (~/.opentabs/audit.log)
 * for post-restart forensics.
 */

import { getConfigDir, getConfigPath, isConnectionRefused, readConfig } from '../config.js';
import { resolvePort } from '../parse-port.js';
import { InvalidArgumentError } from 'commander';
import pc from 'picocolors';
import { join } from 'node:path';
import type { Command } from 'commander';

interface AuditOptions {
  port?: number;
  limit?: number;
  plugin?: string;
  tool?: string;
  since?: string;
  json?: boolean;
  file?: boolean;
}

interface AuditEntry {
  timestamp: string;
  tool: string;
  plugin: string;
  success: boolean;
  durationMs: number;
  error?: { code: string; message: string; category?: string };
}

const parseLimit = (value: string): number => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new InvalidArgumentError('Must be a positive integer.');
  }
  return n;
};

const DURATION_UNITS = new Map<string, number>([
  ['s', 1_000],
  ['m', 60_000],
  ['h', 3_600_000],
  ['d', 86_400_000],
]);

const parseDuration = (value: string): number => {
  const match = /^(\d+)([smhd])$/.exec(value);
  const unit = match?.[2] ? DURATION_UNITS.get(match[2]) : undefined;
  if (!match?.[1] || unit === undefined) {
    throw new InvalidArgumentError('Must be a number followed by s, m, h, or d (e.g., 30m, 1h, 2d).');
  }
  return Number(match[1]) * unit;
};

const formatTimestamp = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const time = `${hours}:${minutes}:${seconds}`;

  // Same day — show time only
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return time;
  }

  // Different day — include date
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day} ${time}`;
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

/**
 * Read audit entries from the persistent disk log (~/.opentabs/audit.log).
 * Parses NDJSON (one JSON object per line), applies the same filters as the server mode.
 */
const handleAuditFromFile = async (options: AuditOptions): Promise<void> => {
  const limit = options.limit ?? 20;
  const auditPath = join(getConfigDir(), 'audit.log');

  let sinceMs: number | null = null;
  if (options.since) {
    sinceMs = parseDuration(options.since);
  }

  const auditFile = Bun.file(auditPath);
  if (!(await auditFile.exists())) {
    console.log(pc.dim('No audit log file found at ' + auditPath));
    return;
  }

  const raw = await auditFile.text();
  const lines = raw.split('\n').filter(line => line.trim().length > 0);

  let entries: AuditEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as AuditEntry);
    } catch {
      // Skip malformed lines
    }
  }

  // Reverse to show newest first (matching server behavior)
  entries.reverse();

  // Apply filters
  if (options.plugin) entries = entries.filter(e => e.plugin === options.plugin);
  if (options.tool) entries = entries.filter(e => e.tool === options.tool);
  if (sinceMs !== null) {
    const cutoff = Date.now() - sinceMs;
    entries = entries.filter(e => new Date(e.timestamp).getTime() >= cutoff);
  }

  entries = entries.slice(0, limit);

  if (options.json) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  if (entries.length === 0) {
    console.log(pc.dim('No audit entries found.'));
    return;
  }

  // Table output (same format as server mode)
  const timeCol = 15;
  const toolCol = 30;
  const statusCol = 4;
  const durationCol = 10;

  console.log(
    pc.bold(
      `${'Time'.padEnd(timeCol)}${'Tool'.padEnd(toolCol)}${'OK'.padEnd(statusCol)}${'Duration'.padEnd(durationCol)}`,
    ),
  );
  console.log(pc.dim('─'.repeat(timeCol + toolCol + statusCol + durationCol)));

  for (const entry of entries) {
    const time = formatTimestamp(entry.timestamp).padEnd(timeCol);
    const tool = entry.tool.padEnd(toolCol);
    const statusIcon = entry.success ? pc.green('✓') : pc.red('✗');
    const status = statusIcon + ' '.repeat(Math.max(0, statusCol - 1));
    const duration = formatDuration(entry.durationMs).padEnd(durationCol);
    console.log(`${time}${tool}${status}${duration}`);
  }
};

const handleAudit = async (options: AuditOptions): Promise<void> => {
  // --file mode reads from disk log instead of the running server
  if (options.file) {
    return handleAuditFromFile(options);
  }

  const port = resolvePort(options);
  const limit = options.limit ?? 20;

  // Parse --since duration (client-side filtering)
  let sinceMs: number | null = null;
  if (options.since) {
    sinceMs = parseDuration(options.since);
  }

  // Read secret from config
  const configPath = getConfigPath();
  const { config } = await readConfig(configPath);
  const secret = config && typeof config.secret === 'string' ? config.secret : null;

  // Build URL — request more entries from the server when --since is used
  // so we have enough to filter from
  const url = new URL(`http://localhost:${port}/audit`);
  url.searchParams.set('limit', String(sinceMs !== null ? 500 : limit));
  if (options.plugin) url.searchParams.set('plugin', options.plugin);
  if (options.tool) url.searchParams.set('tool', options.tool);

  try {
    const headers: Record<string, string> = {};
    if (secret) headers['Authorization'] = `Bearer ${secret}`;

    const res = await fetch(url.toString(), {
      headers,
      signal: AbortSignal.timeout(3_000),
    });

    if (res.status === 401) {
      console.error(pc.red('Authentication failed.'));
      console.error(pc.dim('Is the server secret correct? Check ~/.opentabs/config.json'));
      process.exit(1);
    }

    if (!res.ok) {
      console.error(pc.red(`Error: MCP server returned HTTP ${res.status}.`));
      process.exit(1);
    }

    let entries = (await res.json()) as AuditEntry[];

    // Client-side time filtering
    if (sinceMs !== null) {
      const cutoff = Date.now() - sinceMs;
      entries = entries.filter(e => new Date(e.timestamp).getTime() >= cutoff);
    }

    if (options.json) {
      console.log(JSON.stringify(entries, null, 2));
      return;
    }

    if (entries.length === 0) {
      console.log(pc.dim('No audit entries found.'));
      return;
    }

    // Table output
    const timeCol = 15;
    const toolCol = 30;
    const statusCol = 4;
    const durationCol = 10;

    console.log(
      pc.bold(
        `${'Time'.padEnd(timeCol)}${'Tool'.padEnd(toolCol)}${'OK'.padEnd(statusCol)}${'Duration'.padEnd(durationCol)}`,
      ),
    );
    console.log(pc.dim('─'.repeat(timeCol + toolCol + statusCol + durationCol)));

    for (const entry of entries) {
      const time = formatTimestamp(entry.timestamp).padEnd(timeCol);
      const tool = entry.tool.padEnd(toolCol);
      const statusIcon = entry.success ? pc.green('✓') : pc.red('✗');
      const status = statusIcon + ' '.repeat(Math.max(0, statusCol - 1));
      const duration = formatDuration(entry.durationMs).padEnd(durationCol);
      console.log(`${time}${tool}${status}${duration}`);
    }
  } catch (err: unknown) {
    const startHint = `Start it with: opentabs start${port !== 9515 ? ` --port ${port}` : ''}`;

    if (isConnectionRefused(err)) {
      console.error(pc.red('MCP server is not running.'));
      console.error(pc.dim(startHint));
    } else {
      const message = err instanceof Error ? err.message : String(err);
      console.error(pc.red(`Error: ${message}`));
      console.error(pc.dim(startHint));
    }

    process.exit(1);
  }
};

const registerAuditCommand = (program: Command): void => {
  program
    .command('audit')
    .description('Show recent tool invocation history')
    .option('--limit <number>', 'Number of entries to show (default: 20)', parseLimit)
    .option('--plugin <name>', 'Filter by plugin name')
    .option('--tool <name>', 'Filter by tool name')
    .option('--since <duration>', 'Show entries from the last duration (e.g., 30m, 1h, 2d)')
    .option('--json', 'Output raw JSON from the audit endpoint')
    .option('--file', 'Read from persistent disk log (~/.opentabs/audit.log) instead of the running server')
    .addHelpText(
      'after',
      `
Examples:
  $ opentabs audit
  $ opentabs audit --limit 50
  $ opentabs audit --plugin slack
  $ opentabs audit --tool slack_send_message
  $ opentabs audit --since 1h
  $ opentabs audit --since 30m --plugin slack
  $ opentabs audit --json
  $ opentabs audit --file
  $ opentabs audit --file --since 1h --plugin slack`,
    )
    .action((_options: AuditOptions, command: Command) => handleAudit(command.optsWithGlobals()));
};

export { registerAuditCommand };
