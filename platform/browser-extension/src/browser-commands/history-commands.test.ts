import { beforeEach, describe, expect, test, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
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

// Stub chrome.history API
const mockHistorySearch = vi.fn<(query: unknown) => Promise<chrome.history.HistoryItem[]>>();
const mockHistoryGetVisits = vi.fn<(details: unknown) => Promise<chrome.history.VisitItem[]>>();

Object.assign(globalThis, {
  chrome: {
    ...((globalThis as Record<string, unknown>).chrome as object),
    history: {
      search: mockHistorySearch,
      getVisits: mockHistoryGetVisits,
    },
  },
});

// Import after mocking
const { handleBrowserSearchHistory, handleBrowserGetVisits } = await import('./history-commands.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeHistoryItem = (overrides: Partial<chrome.history.HistoryItem> = {}): chrome.history.HistoryItem =>
  ({
    id: '1',
    url: 'https://example.com',
    title: 'Example',
    lastVisitTime: 1713052800000,
    visitCount: 3,
    typedCount: 1,
    ...overrides,
  }) as chrome.history.HistoryItem;

const makeVisitItem = (overrides: Partial<chrome.history.VisitItem> = {}): chrome.history.VisitItem =>
  ({
    id: '1',
    visitId: '100',
    visitTime: 1713052800000,
    referringVisitId: '0',
    transition: 'link',
    ...overrides,
  }) as chrome.history.VisitItem;

const getResult = () => mockSendToServer.mock.calls[0]?.[0] as Record<string, unknown>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('handleBrowserSearchHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('searches history with default maxResults', async () => {
    mockHistorySearch.mockResolvedValue([makeHistoryItem(), makeHistoryItem({ id: '2', url: 'https://test.com' })]);

    await handleBrowserSearchHistory({ query: 'example' }, 1);

    expect(mockHistorySearch).toHaveBeenCalledWith({
      text: 'example',
      maxResults: 20,
    });
    const response = getResult();
    expect(response).toMatchObject({ jsonrpc: '2.0', id: 1 });
    const result = response.result as { entries: Array<Record<string, unknown>> };
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      url: 'https://example.com',
      title: 'Example',
      visitCount: 3,
    });
    expect(result.entries[0]?.lastVisitTime).toBe('2024-04-14T00:00:00.000Z');
  });

  test('passes custom maxResults', async () => {
    mockHistorySearch.mockResolvedValue([]);

    await handleBrowserSearchHistory({ query: 'test', maxResults: 5 }, 2);

    expect(mockHistorySearch).toHaveBeenCalledWith({
      text: 'test',
      maxResults: 5,
    });
  });

  test('passes startTime and endTime as ms-since-epoch', async () => {
    mockHistorySearch.mockResolvedValue([]);

    await handleBrowserSearchHistory(
      { query: 'test', startTime: '2024-01-01T00:00:00.000Z', endTime: '2024-12-31T23:59:59.999Z' },
      3,
    );

    expect(mockHistorySearch).toHaveBeenCalledWith({
      text: 'test',
      maxResults: 20,
      startTime: Date.parse('2024-01-01T00:00:00.000Z'),
      endTime: Date.parse('2024-12-31T23:59:59.999Z'),
    });
  });

  test('rejects missing query', async () => {
    await handleBrowserSearchHistory({}, 4);

    expect(mockHistorySearch).not.toHaveBeenCalled();
    const response = getResult();
    expect(response).toMatchObject({
      jsonrpc: '2.0',
      error: expect.objectContaining({ message: 'Missing or invalid query parameter' }),
      id: 4,
    });
  });

  test('rejects invalid startTime', async () => {
    await handleBrowserSearchHistory({ query: 'test', startTime: 'not-a-date' }, 5);

    expect(mockHistorySearch).not.toHaveBeenCalled();
    const response = getResult();
    expect(response).toMatchObject({
      jsonrpc: '2.0',
      error: expect.objectContaining({ message: expect.stringContaining('Invalid startTime') }),
      id: 5,
    });
  });

  test('rejects invalid endTime', async () => {
    await handleBrowserSearchHistory({ query: 'test', endTime: 'bad' }, 6);

    expect(mockHistorySearch).not.toHaveBeenCalled();
    const response = getResult();
    expect(response).toMatchObject({
      jsonrpc: '2.0',
      error: expect.objectContaining({ message: expect.stringContaining('Invalid endTime') }),
      id: 6,
    });
  });

  test('sends error on failure', async () => {
    mockHistorySearch.mockRejectedValue(new Error('history search failed'));

    await handleBrowserSearchHistory({ query: 'test' }, 7);

    const response = getResult();
    expect(response).toMatchObject({
      jsonrpc: '2.0',
      error: expect.objectContaining({ message: expect.stringContaining('history search failed') }),
      id: 7,
    });
  });
});

describe('handleBrowserGetVisits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns visit details for a URL', async () => {
    mockHistoryGetVisits.mockResolvedValue([
      makeVisitItem({ visitId: '100', transition: 'typed' }),
      makeVisitItem({ visitId: '101', transition: 'link' }),
    ]);

    await handleBrowserGetVisits({ url: 'https://example.com' }, 1);

    expect(mockHistoryGetVisits).toHaveBeenCalledWith({ url: 'https://example.com' });
    const response = getResult();
    expect(response).toMatchObject({ jsonrpc: '2.0', id: 1 });
    const result = response.result as { visits: Array<Record<string, unknown>> };
    expect(result.visits).toHaveLength(2);
    expect(result.visits[0]).toMatchObject({
      visitId: '100',
      transition: 'typed',
    });
    expect(result.visits[0]?.visitTime).toBe('2024-04-14T00:00:00.000Z');
  });

  test('rejects missing url', async () => {
    await handleBrowserGetVisits({}, 2);

    expect(mockHistoryGetVisits).not.toHaveBeenCalled();
    const response = getResult();
    expect(response).toMatchObject({
      jsonrpc: '2.0',
      error: expect.objectContaining({ message: 'Missing or invalid url parameter' }),
      id: 2,
    });
  });

  test('rejects empty url', async () => {
    await handleBrowserGetVisits({ url: '' }, 3);

    expect(mockHistoryGetVisits).not.toHaveBeenCalled();
    const response = getResult();
    expect(response).toMatchObject({
      jsonrpc: '2.0',
      error: expect.objectContaining({ message: 'Missing or invalid url parameter' }),
      id: 3,
    });
  });

  test('sends error on failure', async () => {
    mockHistoryGetVisits.mockRejectedValue(new Error('visits api error'));

    await handleBrowserGetVisits({ url: 'https://example.com' }, 4);

    const response = getResult();
    expect(response).toMatchObject({
      jsonrpc: '2.0',
      error: expect.objectContaining({ message: expect.stringContaining('visits api error') }),
      id: 4,
    });
  });
});
