import { beforeEach, describe, expect, test, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — set up before importing handler modules
// ---------------------------------------------------------------------------

const { mockSendToServer } = vi.hoisted(() => ({
  mockSendToServer: vi.fn<(data: unknown) => void>(),
}));

vi.mock('../messaging.js', () => ({
  sendToServer: mockSendToServer,
  forwardToSidePanel: vi.fn(),
}));

vi.mock('../sanitize-error.js', () => ({
  sanitizeErrorMessage: (msg: string) => msg,
}));

// Stub chrome APIs
const mockCookiesGetAll = vi.fn<() => Promise<chrome.cookies.Cookie[]>>().mockResolvedValue([]);
const mockCookiesSet = vi.fn<(details: unknown) => Promise<chrome.cookies.Cookie | null>>().mockResolvedValue(null);
const mockCookiesRemove = vi
  .fn<(details: unknown) => Promise<chrome.cookies.CookieDetails | null>>()
  .mockResolvedValue(null);

Object.assign(globalThis, {
  chrome: {
    ...((globalThis as Record<string, unknown>).chrome as object),
    runtime: { id: 'test-extension-id' },
    cookies: {
      getAll: mockCookiesGetAll,
      set: mockCookiesSet,
      remove: mockCookiesRemove,
    },
  },
});

// Import after mocking
const { handleBrowserDeleteCookies } = await import('./cookie-commands.js');

/** Extract the first argument from the first call to mockSendToServer */
const firstSentMessage = (): Record<string, unknown> => {
  const calls = mockSendToServer.mock.calls;
  expect(calls.length).toBeGreaterThanOrEqual(1);
  const firstCall = calls[0];
  if (!firstCall) throw new Error('Expected at least one call');
  return firstCall[0] as Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// handleBrowserDeleteCookies
// ---------------------------------------------------------------------------

describe('handleBrowserDeleteCookies', () => {
  beforeEach(() => {
    mockSendToServer.mockReset();
    mockCookiesRemove.mockReset();
  });

  test('rejects missing url', async () => {
    await handleBrowserDeleteCookies({ name: 'session' }, 'req-1');
    expect(firstSentMessage()).toMatchObject({
      jsonrpc: '2.0',
      id: 'req-1',
      error: { code: -32602 },
    });
  });

  test('rejects missing name', async () => {
    await handleBrowserDeleteCookies({ url: 'https://example.com' }, 'req-2');
    expect(firstSentMessage()).toMatchObject({
      jsonrpc: '2.0',
      id: 'req-2',
      error: { code: -32602 },
    });
  });

  test('returns deleted: true when chrome.cookies.remove returns a details object', async () => {
    mockCookiesRemove.mockResolvedValueOnce({
      name: 'session',
      url: 'https://example.com',
    } as chrome.cookies.CookieDetails);
    await handleBrowserDeleteCookies({ url: 'https://example.com', name: 'session' }, 'req-3');
    expect(firstSentMessage()).toMatchObject({
      jsonrpc: '2.0',
      id: 'req-3',
      result: { deleted: true, name: 'session', url: 'https://example.com' },
    });
  });

  test('returns deleted: false when chrome.cookies.remove returns null (cookie not found)', async () => {
    mockCookiesRemove.mockResolvedValueOnce(null);
    await handleBrowserDeleteCookies({ url: 'https://example.com', name: 'nonexistent' }, 'req-4');
    expect(firstSentMessage()).toMatchObject({
      jsonrpc: '2.0',
      id: 'req-4',
      result: { deleted: false, name: 'nonexistent', url: 'https://example.com' },
    });
  });
});
