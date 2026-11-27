import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

const { mockDispatchToExtension } = vi.hoisted(() => ({
  mockDispatchToExtension:
    vi.fn<(state: unknown, method: string, params: Record<string, unknown>) => Promise<unknown>>(),
}));

vi.mock('../extension-protocol.js', () => ({
  dispatchToExtension: mockDispatchToExtension,
}));

const { screenshotTab } = await import('./screenshot-tab.js');
const { createState } = await import('../state.js');

// A 1x1 transparent PNG.
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('screenshotTab.formatResult', () => {
  test('emits a single MCP image content part with mimeType image/png', () => {
    expect(screenshotTab.formatResult).toBeDefined();
    const formatted = screenshotTab.formatResult?.({ image: 'iVBORw0KGgoAAAANSUhEUg==' });
    expect(formatted).toEqual([{ type: 'image', data: 'iVBORw0KGgoAAAANSUhEUg==', mimeType: 'image/png' }]);
  });

  test('renders a {savedTo, bytes} summary as a compact JSON text part', () => {
    const summary = { savedTo: '/abs/path/shot.png', bytes: 1234 };
    expect(screenshotTab.formatResult?.(summary)).toEqual([{ type: 'text', text: JSON.stringify(summary) }]);
  });

  test('short-circuits on savedTo before any image-shape validation', () => {
    // A file-write result never reaches image extraction, so a stray `image`
    // field cannot trigger the malformed-payload error path.
    expect(() =>
      screenshotTab.formatResult?.({ savedTo: '/abs/path/shot.png', bytes: 1234, image: 'shouldNotBeRead' }),
    ).not.toThrow();
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

describe('screenshotTab.handler — filePath', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'opentabs-screenshot-test-'));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });
  beforeEach(() => {
    mockDispatchToExtension.mockReset();
  });

  test('without filePath the handler returns the raw {image} payload for formatResult', async () => {
    mockDispatchToExtension.mockResolvedValue({ image: PNG_BASE64 });
    const result = await screenshotTab.handler({ tabId: 1 }, createState());
    expect(result).toEqual({ image: PNG_BASE64 });
  });

  test('with filePath the PNG is written to disk and a {savedTo, bytes} summary returned', async () => {
    mockDispatchToExtension.mockResolvedValue({ image: PNG_BASE64 });
    const path = join(dir, 'capture.png');
    const result = (await screenshotTab.handler({ tabId: 1, filePath: path }, createState())) as {
      savedTo: string;
      bytes: number;
    };
    expect(result.savedTo).toBe(path);
    const onDisk = await readFile(path);
    expect(result.bytes).toBe(onDisk.byteLength);
    // Verify the bytes are the decoded PNG (magic header).
    expect(onDisk.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  });

  test('rejects a non-absolute filePath', async () => {
    mockDispatchToExtension.mockResolvedValue({ image: PNG_BASE64 });
    await expect(screenshotTab.handler({ tabId: 1, filePath: 'relative.png' }, createState())).rejects.toThrow(
      /filePath must be an absolute path/,
    );
  });

  test('with filePath in a directory that cannot be written rejects with the I/O error', async () => {
    mockDispatchToExtension.mockResolvedValue({ image: PNG_BASE64 });
    // A path under a missing parent directory fails on every platform and user
    // (including root), so the handler's natural writeFile error must propagate.
    const filePath = join(dir, 'missing-parent', 'capture.png');

    await expect(screenshotTab.handler({ tabId: 1, filePath }, createState())).rejects.toThrow(/ENOENT/);
  });

  test('with filePath and a malformed extension payload throws without writing', async () => {
    mockDispatchToExtension.mockResolvedValue({ unexpected: 'shape' });
    const path = join(dir, 'should-not-exist.png');
    await expect(screenshotTab.handler({ tabId: 1, filePath: path }, createState())).rejects.toThrow(
      /extension returned unexpected payload/,
    );
    await expect(readFile(path)).rejects.toThrow(/ENOENT/);
  });
});

describe('screenshotTab handler + formatResult round trip', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'opentabs-screenshot-roundtrip-'));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });
  beforeEach(() => {
    mockDispatchToExtension.mockReset();
  });

  test('filePath: the handler writes the file and formatResult emits a text part with savedTo', async () => {
    mockDispatchToExtension.mockResolvedValue({ image: PNG_BASE64 });
    const path = join(dir, 'roundtrip.png');
    const formatted = screenshotTab.formatResult?.(
      await screenshotTab.handler({ tabId: 1, filePath: path }, createState()),
    );
    expect(formatted).toEqual([
      { type: 'text', text: JSON.stringify({ savedTo: path, bytes: Buffer.from(PNG_BASE64, 'base64').byteLength }) },
    ]);
  });

  test('inline: the handler returns {image} and formatResult emits an image part', async () => {
    mockDispatchToExtension.mockResolvedValue({ image: PNG_BASE64 });
    const formatted = screenshotTab.formatResult?.(await screenshotTab.handler({ tabId: 1 }, createState()));
    expect(formatted).toEqual([{ type: 'image', data: PNG_BASE64, mimeType: 'image/png' }]);
  });
});
