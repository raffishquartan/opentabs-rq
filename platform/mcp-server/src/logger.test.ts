import { afterEach, describe, expect, test, vi } from 'vitest';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe('non-stack path (info/warn/error level)', () => {
    test('log.info replaces Error with its message string', async () => {
      vi.stubEnv('OPENTABS_LOG_LEVEL', 'info');
      vi.resetModules();
      const { log } = await import('./logger.js');
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const err = new Error('something went wrong');
      log.info('context:', err);

      expect(spy).toHaveBeenCalledOnce();
      const args = spy.mock.calls[0] as unknown[];
      expect(args).toContain('something went wrong');
      expect(args.some(a => a instanceof Error)).toBe(false);
    });

    test('log.error replaces Error with its message string', async () => {
      vi.stubEnv('OPENTABS_LOG_LEVEL', 'error');
      vi.resetModules();
      const { log } = await import('./logger.js');
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const err = new Error('operation failed');
      log.error(err);

      expect(spy).toHaveBeenCalledOnce();
      const args = spy.mock.calls[0] as unknown[];
      expect(args).toContain('operation failed');
      expect(args.some(a => a instanceof Error)).toBe(false);
    });
  });

  describe('stack path (debug level)', () => {
    test('log.debug includes stack without duplicating the message', async () => {
      vi.stubEnv('OPENTABS_LOG_LEVEL', 'debug');
      vi.resetModules();
      const { log } = await import('./logger.js');
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const err = new Error('something went wrong');
      log.debug('context:', err);

      expect(spy).toHaveBeenCalledOnce();
      const args = spy.mock.calls[0] as unknown[];
      const lastArg = String(args[args.length - 1]);

      // The stack arg begins with '\n  Error: ...' (indented, no pre-pended message)
      expect(lastArg).toMatch(/^\n {2}Error: something went wrong/);

      // The message must NOT appear before the stack (old bug: "something went wrong\n  Error: ...")
      expect(lastArg).not.toMatch(/^something went wrong/);
    });

    test('log.debug message appears exactly once in debug output', async () => {
      vi.stubEnv('OPENTABS_LOG_LEVEL', 'debug');
      vi.resetModules();
      const { log } = await import('./logger.js');
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const err = new Error('unique-marker-xyz');
      log.debug(err);

      expect(spy).toHaveBeenCalledOnce();
      const args = spy.mock.calls[0] as unknown[];
      const allText = args.map(a => String(a)).join(' ');
      const occurrences = (allText.match(/unique-marker-xyz/g) ?? []).length;
      expect(occurrences).toBe(1);
    });
  });
});
