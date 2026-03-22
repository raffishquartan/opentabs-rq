/**
 * Ring-buffer log collector that intercepts console methods and captures entries
 * for retrieval by debugging tools. Each extension context (background, offscreen)
 * gets its own LogCollector instance since they run in separate JS contexts.
 */

type LogLevel = 'log' | 'warn' | 'error' | 'info';
type LogSource = 'background' | 'offscreen' | 'side-panel';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  source: LogSource;
  message: string;
}

interface LogFilterOptions {
  level?: LogLevel;
  source?: LogSource;
  since?: number;
  limit?: number;
}

interface LogStats {
  totalCaptured: number;
  bufferSize: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
}

const MAX_MESSAGE_LENGTH = 2000;
const DEFAULT_MAX_ENTRIES = 500;

const formatArg = (arg: unknown): string => {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return `${arg.message}${arg.stack ? `\n${arg.stack}` : ''}`;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
};

const formatMessage = (args: unknown[]): string => {
  const raw = args.map(formatArg).join(' ');
  return raw.length > MAX_MESSAGE_LENGTH ? raw.slice(0, MAX_MESSAGE_LENGTH) : raw;
};

class LogCollector {
  private readonly buffer: LogEntry[] = [];
  private readonly maxEntries: number;
  private readonly source: LogSource;
  private totalCaptured = 0;

  constructor(source: LogSource, maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.source = source;
    this.maxEntries = maxEntries;
  }

  capture(level: LogLevel, args: unknown[]): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      source: this.source,
      message: formatMessage(args),
    };
    if (this.buffer.length >= this.maxEntries) {
      this.buffer.shift();
    }
    this.buffer.push(entry);
    this.totalCaptured++;
  }

  getEntries(options?: LogFilterOptions): LogEntry[] {
    let entries = this.buffer;

    if (options?.level) {
      const level = options.level;
      entries = entries.filter(e => e.level === level);
    }
    if (options?.source) {
      const source = options.source;
      entries = entries.filter(e => e.source === source);
    }
    if (options?.since !== undefined) {
      const since = options.since;
      entries = entries.filter(e => e.timestamp >= since);
    }

    // Return newest-first
    const result = [...entries].reverse();

    if (options?.limit !== undefined && options.limit > 0) {
      return result.slice(0, options.limit);
    }
    return result;
  }

  clear(): void {
    this.buffer.length = 0;
  }

  getStats(): LogStats {
    const oldest = this.buffer[0];
    const newest = this.buffer[this.buffer.length - 1];
    return {
      totalCaptured: this.totalCaptured,
      bufferSize: this.buffer.length,
      oldestTimestamp: oldest?.timestamp ?? null,
      newestTimestamp: newest?.timestamp ?? null,
    };
  }
}

/**
 * Install a LogCollector as console interceptors for the given context.
 * Wraps console.log, console.warn, console.error, and console.info — capturing
 * entries in the ring buffer while still calling the original console methods.
 */
const installLogCollector = (source: LogSource, maxEntries?: number): LogCollector => {
  const collector = new LogCollector(source, maxEntries);

  const levels: LogLevel[] = ['log', 'warn', 'error', 'info'];
  for (const level of levels) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      collector.capture(level, args);
      original(...args);
    };
  }

  return collector;
};

export type { LogEntry, LogFilterOptions, LogLevel, LogSource, LogStats };
export { installLogCollector, LogCollector };
