import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { WsHandle } from '@opentabs-dev/shared';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { ExtensionConnection, ServerState } from '../state.js';
import { createState } from '../state.js';
import { screenshotTab } from './screenshot-tab.js';

const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const createMockWs = (): WsHandle & { sent: string[] } => ({
  sent: [] as string[],
  send(msg: string) {
    this.sent.push(msg);
  },
  close() {},
});

const installExtensionConnection = (state: ServerState, id = 'conn-test'): WsHandle & { sent: string[] } => {
  const ws = createMockWs();
  const conn: ExtensionConnection = {
    ws,
    connectionId: id,
    profileLabel: id,
    tabMapping: new Map(),
    activeNetworkCaptures: new Set(),
  };
  state.extensionConnections.set(id, conn);
  return ws;
};

const settleDispatchWith = (state: ServerState, response: unknown): void => {
  for (const [, pending] of state.pendingDispatches) {
    pending.resolve(response);
    clearTimeout(pending.timerId);
  }
};

describe('browser_screenshot_tab handler', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'screenshot-tab-test-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  test('without filePath returns the dispatch result unchanged for formatResult to convert', async () => {
    const state = createState();
    installExtensionConnection(state);

    const promise = screenshotTab.handler({ tabId: 1 }, state);
    settleDispatchWith(state, { image: SAMPLE_PNG_BASE64 });

    expect(await promise).toEqual({ image: SAMPLE_PNG_BASE64 });
  });

  test('with absolute filePath writes valid PNG bytes to disk and returns {savedTo, bytes}', async () => {
    const state = createState();
    installExtensionConnection(state);
    const filePath = join(workDir, 'shot.png');

    const promise = screenshotTab.handler({ tabId: 1, filePath }, state);
    settleDispatchWith(state, { image: SAMPLE_PNG_BASE64 });
    const result = (await promise) as { savedTo: string; bytes: number };

    const decoded = Buffer.from(SAMPLE_PNG_BASE64, 'base64');
    expect(result).toEqual({ savedTo: filePath, bytes: decoded.byteLength });

    const onDisk = readFileSync(filePath);
    expect(onDisk.equals(decoded)).toBe(true);
    expect(onDisk.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
  });

  test('with relative filePath rejects without dispatching to disk', async () => {
    const state = createState();
    installExtensionConnection(state);

    const promise = screenshotTab.handler({ tabId: 1, filePath: 'relative/shot.png' }, state);
    settleDispatchWith(state, { image: SAMPLE_PNG_BASE64 });

    await expect(promise).rejects.toThrow(/filePath must be an absolute path/);
  });

  test('with filePath but malformed extension payload throws without writing', async () => {
    const state = createState();
    installExtensionConnection(state);
    const filePath = join(workDir, 'should-not-exist.png');

    const promise = screenshotTab.handler({ tabId: 1, filePath }, state);
    settleDispatchWith(state, { unexpected: 'shape' });

    await expect(promise).rejects.toThrow(/extension returned unexpected payload/);
    expect(() => readFileSync(filePath)).toThrow(/ENOENT/);
  });

  test('with filePath pointing to a non-writable directory rejects with an I/O error', async () => {
    const state = createState();
    installExtensionConnection(state);
    // /root is not writable by non-root processes on Linux
    const filePath = '/root/opentabs-screenshot-test.png';

    const promise = screenshotTab.handler({ tabId: 1, filePath }, state);
    settleDispatchWith(state, { image: SAMPLE_PNG_BASE64 });

    await expect(promise).rejects.toThrow(/EACCES|ENOENT|permission denied/i);
  });
});

describe('screenshotTab.formatResult — image-content-part path (filePath omitted)', () => {
  test('emits a single MCP image content part with mimeType image/png', () => {
    expect(screenshotTab.formatResult).toBeDefined();
    const formatted = screenshotTab.formatResult?.({ image: 'iVBORw0KGgoAAAANSUhEUg==' });
    expect(formatted).toEqual([{ type: 'image', data: 'iVBORw0KGgoAAAANSUhEUg==', mimeType: 'image/png' }]);
  });

  test('throws a metadata-only error when the payload is not {image: string}', () => {
    // Contract: the error describes the malformed payload by type and keys,
    // never by serialising the payload itself — screenshots can carry PII
    // (tokens, DOM content) if something has gone very wrong upstream.
    expect(() => screenshotTab.formatResult?.({ image: 12345, secret: 'leakme' })).toThrow(
      /browser_screenshot_tab: extension returned unexpected payload/,
    );
    expect(() => screenshotTab.formatResult?.({ image: 12345, secret: 'leakme' })).toThrow(
      /type=object.*keys=\[image,secret\]/,
    );
    expect(() => screenshotTab.formatResult?.({ image: 12345, secret: 'leakme' })).not.toThrow(/leakme/);
  });

  test('rejects an empty-string image payload as a malformed capture', () => {
    // An empty `image` field would otherwise pass the `typeof === 'string'` check
    // and emit a zero-byte image content part — handing clients a "successful"
    // response that decodes to nothing. Fail fast instead.
    expect(() => screenshotTab.formatResult?.({ image: '' })).toThrow(
      /browser_screenshot_tab: extension returned unexpected payload \(expected \{image: non-empty string\}/,
    );
  });
});

describe('screenshotTab.formatResult — file-write path (filePath provided)', () => {
  test('emits a text content part containing the {savedTo, bytes} JSON', () => {
    const handlerResult = { savedTo: '/abs/path/shot.png', bytes: 1234 };
    const formatted = screenshotTab.formatResult?.(handlerResult);
    expect(formatted).toEqual([{ type: 'text', text: JSON.stringify(handlerResult) }]);
  });

  test('does not attempt image extraction when savedTo is present (no PII leak via error)', () => {
    // Even if the file-write result happens to also carry an `image` field somehow,
    // the savedTo branch must short-circuit before we touch image-shape validation.
    expect(() =>
      screenshotTab.formatResult?.({ savedTo: '/abs/path/shot.png', bytes: 1234, image: 'shouldNotBeRead' }),
    ).not.toThrow();
  });
});

describe('screenshotTab handler + formatResult — end-to-end behaviour', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'screenshot-tab-e2e-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  test('filePath path: handler writes file, formatResult emits text content part with savedTo', async () => {
    const state = createState();
    installExtensionConnection(state);
    const filePath = join(workDir, 'e2e-saved.png');

    const promise = screenshotTab.handler({ tabId: 1, filePath }, state);
    settleDispatchWith(state, { image: SAMPLE_PNG_BASE64 });
    const handlerResult = await promise;

    const formatted = screenshotTab.formatResult?.(handlerResult);
    expect(formatted).toHaveLength(1);
    expect(formatted?.[0]?.type).toBe('text');
    if (formatted?.[0]?.type === 'text') {
      const parsed = JSON.parse(formatted[0].text) as { savedTo: string; bytes: number };
      expect(parsed.savedTo).toBe(filePath);
      expect(parsed.bytes).toBe(Buffer.from(SAMPLE_PNG_BASE64, 'base64').byteLength);
    }
  });

  test('inline path: handler returns {image}, formatResult emits image content part', async () => {
    const state = createState();
    installExtensionConnection(state);

    const promise = screenshotTab.handler({ tabId: 1 }, state);
    settleDispatchWith(state, { image: SAMPLE_PNG_BASE64 });
    const handlerResult = await promise;

    const formatted = screenshotTab.formatResult?.(handlerResult);
    expect(formatted).toEqual([{ type: 'image', data: SAMPLE_PNG_BASE64, mimeType: 'image/png' }]);
  });
});
