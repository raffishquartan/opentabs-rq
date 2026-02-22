import { appendAuditEntryToDisk, getAuditLogPath, _resetInitialized } from './audit-disk.js';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AuditEntry } from './state.js';

const makeEntry = (overrides: Partial<AuditEntry> = {}): AuditEntry => ({
  timestamp: '2026-02-21T12:00:00.000Z',
  tool: 'browser_list_tabs',
  plugin: 'browser',
  success: true,
  durationMs: 42,
  ...overrides,
});

describe('audit-disk', () => {
  let tmpDir: string;
  let origConfigDir: string | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'audit-disk-test-'));
    origConfigDir = Bun.env.OPENTABS_CONFIG_DIR;
    Bun.env.OPENTABS_CONFIG_DIR = tmpDir;
    _resetInitialized();
  });

  afterEach(() => {
    Bun.env.OPENTABS_CONFIG_DIR = origConfigDir;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test('creates audit.log and appends NDJSON entries', async () => {
    const entry = makeEntry();
    await appendAuditEntryToDisk(entry);

    const logPath = getAuditLogPath();
    expect(logPath).toBe(join(tmpDir, 'audit.log'));

    const content = await Bun.file(logPath).text();
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0] as string) as AuditEntry;
    expect(parsed).toEqual(entry);
  });

  test('appends multiple entries on separate lines', async () => {
    await appendAuditEntryToDisk(makeEntry({ tool: 'tool_a' }));
    await appendAuditEntryToDisk(makeEntry({ tool: 'tool_b' }));
    await appendAuditEntryToDisk(makeEntry({ tool: 'tool_c' }));

    const content = await Bun.file(getAuditLogPath()).text();
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(3);

    const parsed = lines.map(line => JSON.parse(line) as AuditEntry);
    expect(parsed[0]?.tool).toBe('tool_a');
    expect(parsed[1]?.tool).toBe('tool_b');
    expect(parsed[2]?.tool).toBe('tool_c');
  });

  test('includes error details for failed entries', async () => {
    const entry = makeEntry({
      success: false,
      error: { code: 'TIMEOUT', message: 'Tool timed out', category: 'timeout' },
    });
    await appendAuditEntryToDisk(entry);

    const content = await Bun.file(getAuditLogPath()).text();
    const parsed = JSON.parse(content.trim()) as AuditEntry;
    expect(parsed.error).toEqual({ code: 'TIMEOUT', message: 'Tool timed out', category: 'timeout' });
  });

  test('rotates audit.log when it exceeds 10 MB', async () => {
    const logPath = getAuditLogPath();

    // Write a 10 MB file directly to trigger rotation on next append
    const largeContent = 'x'.repeat(10 * 1024 * 1024 + 1);
    await Bun.write(logPath, largeContent);

    const entry = makeEntry({ tool: 'after_rotation' });
    await appendAuditEntryToDisk(entry);

    // The original file should have been rotated
    const rotatedPath = logPath + '.1';
    expect(await Bun.file(rotatedPath).exists()).toBe(true);
    const rotatedContent = await Bun.file(rotatedPath).text();
    expect(rotatedContent).toBe(largeContent);

    // The new file should contain only the new entry
    const newContent = await Bun.file(logPath).text();
    const parsed = JSON.parse(newContent.trim()) as AuditEntry;
    expect(parsed.tool).toBe('after_rotation');
  });

  test('does not rotate when file is under 10 MB', async () => {
    const logPath = getAuditLogPath();

    // Write a small file
    await Bun.write(logPath, 'small content\n');

    await appendAuditEntryToDisk(makeEntry());

    // No rotation should have occurred
    const rotatedPath = logPath + '.1';
    expect(await Bun.file(rotatedPath).exists()).toBe(false);
  });

  test('does not throw when config dir is invalid', async () => {
    Bun.env.OPENTABS_CONFIG_DIR = '/nonexistent/path/that/does/not/exist';
    _resetInitialized();

    // Should not throw — fire-and-forget with internal logging
    await appendAuditEntryToDisk(makeEntry());
  });
});
