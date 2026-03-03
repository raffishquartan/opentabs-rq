import { EventEmitter } from 'node:events';
import type * as Fs from 'node:fs';
import { createReadStream, statSync, watch } from 'node:fs';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { followFile } from './logs.js';

vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof Fs>();
  return {
    ...actual,
    statSync: vi.fn(),
    createReadStream: vi.fn(),
    watch: vi.fn(),
  };
});

const mockStatSync = vi.mocked(statSync);
const mockCreateReadStream = vi.mocked(createReadStream);
const mockWatch = vi.mocked(watch);

/** Create a mock watcher (EventEmitter with a close spy). */
const createMockWatcher = () => {
  const watcher = new EventEmitter() as EventEmitter & { close: ReturnType<typeof vi.fn> };
  watcher.close = vi.fn();
  return watcher;
};

describe('followFile', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  test('reads new content immediately after watcher setup to close content gap', async () => {
    const mockStream = new EventEmitter();
    mockStatSync.mockReturnValue({ size: 100 } as ReturnType<typeof statSync>);
    mockCreateReadStream.mockReturnValue(mockStream as unknown as ReturnType<typeof createReadStream>);
    mockWatch.mockReturnValue(createMockWatcher() as unknown as ReturnType<typeof watch>);

    // Don't await — followFile never resolves
    void followFile('/tmp/test.log', 0);

    // Yield to allow synchronous code to run
    await Promise.resolve();

    // createReadStream should have been called even without any file system events
    expect(mockCreateReadStream).toHaveBeenCalledTimes(1);
  });

  test('schedules a retry after stream error when a read was pending', async () => {
    vi.useFakeTimers();

    let firstStream: EventEmitter | undefined;

    mockStatSync.mockReturnValue({ size: 100 } as ReturnType<typeof statSync>);
    mockCreateReadStream.mockImplementationOnce(() => {
      firstStream = new EventEmitter();
      return firstStream as unknown as ReturnType<typeof createReadStream>;
    });
    mockCreateReadStream.mockImplementation(() => new EventEmitter() as unknown as ReturnType<typeof createReadStream>);
    mockWatch.mockReturnValue(createMockWatcher() as unknown as ReturnType<typeof watch>);

    void followFile('/tmp/test.log', 0);
    await Promise.resolve();

    // First createReadStream call happened (from immediate readNewContent after watcher setup)
    expect(mockCreateReadStream).toHaveBeenCalledTimes(1);
    expect(firstStream).toBeDefined();

    // Retrieve the watch callback to trigger a pending read while the first stream is active
    const [, watchListener] = mockWatch.mock.calls[0] as [unknown, () => void];

    // While the first stream is still reading, trigger another read — sets readRequested = true
    watchListener();

    // Emit error on the first stream — should schedule a retry via setTimeout
    (firstStream as EventEmitter).emit('error', new Error('read error'));

    // Advance fake timers to trigger the 100ms retry
    await vi.advanceTimersByTimeAsync(100);

    // A second createReadStream call should have happened for the retry
    expect(mockCreateReadStream).toHaveBeenCalledTimes(2);
  });

  test('does not produce replacement characters when a multi-byte UTF-8 character spans read cycles', async () => {
    // 🍎 is U+1F34E, encoded as 0xF0 0x9F 0x8D 0x8E (4 bytes).
    // Simulate the file growing by only the first 2 bytes in the first read cycle
    // and the remaining 2 bytes in the second cycle.  The persistent StringDecoder
    // must buffer the incomplete sequence across cycles and emit the complete emoji.
    const emojiBytes = Buffer.from([0xf0, 0x9f, 0x8d, 0x8e]); // 🍎
    const firstHalf = emojiBytes.subarray(0, 2);
    const secondHalf = emojiBytes.subarray(2, 4);

    let firstStream: EventEmitter | undefined;
    let secondStream: EventEmitter | undefined;

    mockStatSync
      .mockReturnValueOnce({ size: 2 } as ReturnType<typeof statSync>)
      .mockReturnValueOnce({ size: 4 } as ReturnType<typeof statSync>);

    mockCreateReadStream
      .mockImplementationOnce(() => {
        firstStream = new EventEmitter();
        return firstStream as unknown as ReturnType<typeof createReadStream>;
      })
      .mockImplementationOnce(() => {
        secondStream = new EventEmitter();
        return secondStream as unknown as ReturnType<typeof createReadStream>;
      });

    mockWatch.mockReturnValue(createMockWatcher() as unknown as ReturnType<typeof watch>);

    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    try {
      void followFile('/tmp/test.log', 0);
      await Promise.resolve();

      expect(firstStream).toBeDefined();

      // First cycle: emit partial emoji bytes (first 2 of 4)
      (firstStream as EventEmitter).emit('data', firstHalf);
      (firstStream as EventEmitter).emit('end');
      await Promise.resolve();

      // Trigger second read via watcher callback
      const [, watchListener] = mockWatch.mock.calls[0] as [unknown, () => void];
      watchListener();
      await Promise.resolve();

      expect(secondStream).toBeDefined();

      // Second cycle: emit remaining emoji bytes (last 2 of 4)
      (secondStream as EventEmitter).emit('data', secondHalf);
      (secondStream as EventEmitter).emit('end');
      await Promise.resolve();

      // Combine all writes — must be the complete emoji without replacement chars
      const allOutput = writeSpy.mock.calls.map(call => String(call[0])).join('');
      expect(allOutput).toBe('🍎');
      expect(allOutput).not.toContain('\uFFFD');
    } finally {
      writeSpy.mockRestore();
    }
  });

  test('does not re-read bytes consumed beyond statSync size when concurrent writes extend the stream', async () => {
    // Simulate: statSync reports 100 bytes before the stream opens, but the server
    // writes 50 more bytes while the stream is active — so the stream reads 150 bytes.
    // offset must advance to 150 (actual bytes consumed), not 100 (stale currentSize).
    // Without the fix, offset would be set to 100 on 'end', causing the next cycle to
    // re-read bytes 100-150 and print them again as duplicate output.
    let firstStream: EventEmitter | undefined;

    mockStatSync
      .mockReturnValueOnce({ size: 100 } as ReturnType<typeof statSync>) // first cycle
      .mockReturnValueOnce({ size: 150 } as ReturnType<typeof statSync>); // second cycle check

    mockCreateReadStream.mockImplementationOnce(() => {
      firstStream = new EventEmitter();
      return firstStream as unknown as ReturnType<typeof createReadStream>;
    });

    mockWatch.mockReturnValue(createMockWatcher() as unknown as ReturnType<typeof watch>);

    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    try {
      void followFile('/tmp/test.log', 0);
      await Promise.resolve();

      expect(firstStream).toBeDefined();

      // Emit 150 bytes total — 50 beyond statSync's reported size (concurrent server write)
      const chunk = Buffer.alloc(150, 0x78); // 'x' * 150
      (firstStream as EventEmitter).emit('data', chunk);
      (firstStream as EventEmitter).emit('end');
      await Promise.resolve();

      // Trigger another file-change event via the watcher callback
      const [, watchListener] = mockWatch.mock.calls[0] as [unknown, () => void];
      watchListener();
      await Promise.resolve();

      // createReadStream must NOT be called again: offset advanced to 150 which equals
      // the current file size, so there is no new content to read.
      expect(mockCreateReadStream).toHaveBeenCalledTimes(1);
    } finally {
      writeSpy.mockRestore();
    }
  });

  test('does not propagate watcher errors (e.g., when the log file is deleted)', async () => {
    const mockWatcher = createMockWatcher();
    mockStatSync.mockReturnValue({ size: 0 } as ReturnType<typeof statSync>);
    mockCreateReadStream.mockReturnValue(new EventEmitter() as unknown as ReturnType<typeof createReadStream>);
    mockWatch.mockReturnValue(mockWatcher as unknown as ReturnType<typeof watch>);

    void followFile('/tmp/test.log', 0);
    await Promise.resolve();

    // An 'error' event on the watcher must not crash the process.
    // Without the watcher.on('error', ...) handler, EventEmitter throws on unhandled errors.
    expect(() => {
      mockWatcher.emit('error', new Error('ENOENT: no such file or directory'));
    }).not.toThrow();
  });
});
