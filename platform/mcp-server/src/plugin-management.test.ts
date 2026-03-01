import { normalizePluginName, isValidPluginPackageName, spawnAsync, MAX_OUTPUT_SIZE } from './plugin-management.js';
import { vi, describe, expect, test, beforeEach } from 'vitest';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

describe('normalizePluginName', () => {
  test('shorthand names resolve to official scoped package', () => {
    expect(normalizePluginName('slack')).toBe('@opentabs-dev/opentabs-plugin-slack');
    expect(normalizePluginName('my-tool')).toBe('@opentabs-dev/opentabs-plugin-my-tool');
  });

  test('passes through full unscoped package names unchanged', () => {
    expect(normalizePluginName('opentabs-plugin-slack')).toBe('opentabs-plugin-slack');
  });

  test('passes through scoped package names unchanged', () => {
    expect(normalizePluginName('@my-org/opentabs-plugin-custom')).toBe('@my-org/opentabs-plugin-custom');
    expect(normalizePluginName('@opentabs-dev/opentabs-plugin-slack')).toBe('@opentabs-dev/opentabs-plugin-slack');
  });
});

describe('isValidPluginPackageName', () => {
  test('accepts opentabs-plugin-* names', () => {
    expect(isValidPluginPackageName('opentabs-plugin-slack')).toBe(true);
    expect(isValidPluginPackageName('opentabs-plugin-my-tool')).toBe(true);
  });

  test('accepts scoped opentabs-plugin-* names', () => {
    expect(isValidPluginPackageName('@my-org/opentabs-plugin-custom')).toBe(true);
    expect(isValidPluginPackageName('@opentabs-dev/opentabs-plugin-slack')).toBe(true);
  });

  test('rejects bare opentabs-plugin- prefix with no suffix', () => {
    expect(isValidPluginPackageName('opentabs-plugin-')).toBe(false);
  });

  test('rejects names that do not match the plugin pattern', () => {
    expect(isValidPluginPackageName('some-random-package')).toBe(false);
    expect(isValidPluginPackageName('slack')).toBe(false);
  });

  test('rejects scoped names without opentabs-plugin- pattern', () => {
    expect(isValidPluginPackageName('@my-org/random-package')).toBe(false);
  });
});

describe('spawnAsync size cap', () => {
  const makeMockChild = () => {
    const stdout = new EventEmitter();
    const stderr = new EventEmitter();
    const kill = vi.fn();

    class MockChild extends EventEmitter {
      stdout = stdout;
      stderr = stderr;
      kill = kill;
    }

    return { child: new MockChild(), stdout, stderr, kill };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('rejects and kills the child when stdout output exceeds MAX_OUTPUT_SIZE', async () => {
    const { child, stdout, kill } = makeMockChild();
    vi.mocked(spawn).mockReturnValue(child as unknown as ChildProcessWithoutNullStreams);

    const { promise } = spawnAsync('dummy', []);

    stdout.emit('data', Buffer.alloc(MAX_OUTPUT_SIZE + 1));

    await expect(promise).rejects.toThrow('size limit');
    expect(kill).toHaveBeenCalled();
  });

  test('rejects and kills the child when stderr output exceeds MAX_OUTPUT_SIZE', async () => {
    const { child, stderr, kill } = makeMockChild();
    vi.mocked(spawn).mockReturnValue(child as unknown as ChildProcessWithoutNullStreams);

    const { promise } = spawnAsync('dummy', []);

    stderr.emit('data', Buffer.alloc(MAX_OUTPUT_SIZE + 1));

    await expect(promise).rejects.toThrow('size limit');
    expect(kill).toHaveBeenCalled();
  });

  test('rejects when combined stdout and stderr output exceeds MAX_OUTPUT_SIZE', async () => {
    const { child, stdout, stderr, kill } = makeMockChild();
    vi.mocked(spawn).mockReturnValue(child as unknown as ChildProcessWithoutNullStreams);

    const { promise } = spawnAsync('dummy', []);

    // Each chunk is under the limit individually, but together they exceed it
    stdout.emit('data', Buffer.alloc(MAX_OUTPUT_SIZE - 10));
    stderr.emit('data', Buffer.alloc(20));

    await expect(promise).rejects.toThrow('size limit');
    expect(kill).toHaveBeenCalled();
  });

  test('resolves normally when output stays under MAX_OUTPUT_SIZE', async () => {
    const { child, stdout, stderr } = makeMockChild();
    vi.mocked(spawn).mockReturnValue(child as unknown as ChildProcessWithoutNullStreams);

    const { promise } = spawnAsync('dummy', []);

    stdout.emit('data', Buffer.from('hello'));
    stderr.emit('data', Buffer.from('world'));
    child.emit('close', 0);

    const result = await promise;
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('hello');
    expect(result.stderr).toBe('world');
  });
});
