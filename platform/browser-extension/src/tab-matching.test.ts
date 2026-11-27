import { beforeEach, describe, expect, test } from 'vitest';
import type { PluginMeta } from './extension-messages.js';
import { findAllMatchingTabs, findMatchingTab } from './tab-matching.js';

// ---------------------------------------------------------------------------
// findAllMatchingTabs — requires Chrome API mocks
// ---------------------------------------------------------------------------

const FOCUSED_WINDOW_ID = 100;
const OTHER_WINDOW_ID = 200;

const makeTab = (id: number, opts: { active?: boolean; windowId?: number; url?: string } = {}): chrome.tabs.Tab =>
  ({
    id,
    active: opts.active ?? false,
    windowId: opts.windowId ?? OTHER_WINDOW_ID,
    ...(opts.url !== undefined ? { url: opts.url } : {}),
  }) as chrome.tabs.Tab;

const makePlugin = (urlPatterns: string[], excludePatterns?: string[]): PluginMeta => ({
  name: 'test-plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  urlPatterns,
  ...(excludePatterns ? { excludePatterns } : {}),
  permission: 'off',
  tools: [
    { name: 'test-tool', displayName: 'Test Tool', description: 'A test tool', icon: 'wrench', permission: 'auto' },
  ],
});

let queryResults: Map<string, chrome.tabs.Tab[]>;

beforeEach(() => {
  queryResults = new Map();
  (globalThis as Record<string, unknown>).chrome = {
    tabs: {
      query: ({ url }: { url: string }): Promise<chrome.tabs.Tab[]> => Promise.resolve(queryResults.get(url) ?? []),
    },
    windows: {
      getLastFocused: (): Promise<{ id: number }> => Promise.resolve({ id: FOCUSED_WINDOW_ID }),
    },
  };
});

describe('findAllMatchingTabs', () => {
  test('active tab in focused window is ranked first', async () => {
    const activeFocused = makeTab(1, { active: true, windowId: FOCUSED_WINDOW_ID });
    const activeOther = makeTab(2, { active: true, windowId: OTHER_WINDOW_ID });
    const inactiveUnfocused = makeTab(3, { active: false, windowId: OTHER_WINDOW_ID });

    queryResults.set('*://example.com/*', [inactiveUnfocused, activeOther, activeFocused]);

    const result = await findAllMatchingTabs(makePlugin(['*://example.com/*']));
    expect(result.map(t => t.id)).toEqual([1, 2, 3]);
  });

  test('active-only tab is ranked above focused-only tab', async () => {
    const activeOther = makeTab(1, { active: true, windowId: OTHER_WINDOW_ID });
    const inactiveFocused = makeTab(2, { active: false, windowId: FOCUSED_WINDOW_ID });

    queryResults.set('*://example.com/*', [inactiveFocused, activeOther]);

    const result = await findAllMatchingTabs(makePlugin(['*://example.com/*']));
    expect(result.map(t => t.id)).toEqual([1, 2]);
  });

  test('inactive unfocused tab is ranked last', async () => {
    const activeFocused = makeTab(1, { active: true, windowId: FOCUSED_WINDOW_ID });
    const inactiveFocused = makeTab(2, { active: false, windowId: FOCUSED_WINDOW_ID });
    const activeOther = makeTab(3, { active: true, windowId: OTHER_WINDOW_ID });
    const inactiveUnfocused = makeTab(4, { active: false, windowId: OTHER_WINDOW_ID });

    queryResults.set('*://example.com/*', [inactiveUnfocused, inactiveFocused, activeOther, activeFocused]);

    const result = await findAllMatchingTabs(makePlugin(['*://example.com/*']));
    expect(result.map(t => t.id)).toEqual([1, 3, 2, 4]);
  });

  test('deduplicates when same tab matches multiple URL patterns', async () => {
    const tab = makeTab(1, { active: true, windowId: FOCUSED_WINDOW_ID });

    queryResults.set('*://example.com/*', [tab]);
    queryResults.set('*://*.example.com/*', [tab]);

    const result = await findAllMatchingTabs(makePlugin(['*://example.com/*', '*://*.example.com/*']));
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
  });

  test('returns empty array when no tabs match', async () => {
    const result = await findAllMatchingTabs(makePlugin(['*://example.com/*']));
    expect(result).toEqual([]);
  });

  test('returns single tab without sorting', async () => {
    const tab = makeTab(1, { active: false, windowId: OTHER_WINDOW_ID });
    queryResults.set('*://example.com/*', [tab]);

    const result = await findAllMatchingTabs(makePlugin(['*://example.com/*']));
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
  });

  test('skips patterns that throw errors', async () => {
    const tab = makeTab(1, { active: true, windowId: FOCUSED_WINDOW_ID });

    // Set up a query mock that rejects for invalid patterns
    (globalThis as Record<string, unknown>).chrome = {
      tabs: {
        query: ({ url }: { url: string }): Promise<chrome.tabs.Tab[]> => {
          if (url === 'bad-pattern') return Promise.reject(new Error('Invalid pattern'));
          if (url === '*://good.com/*') return Promise.resolve([tab]);
          return Promise.resolve([]);
        },
      },
      windows: {
        getLastFocused: (): Promise<{ id: number }> => Promise.resolve({ id: FOCUSED_WINDOW_ID }),
      },
    };

    const result = await findAllMatchingTabs(makePlugin(['bad-pattern', '*://good.com/*']));
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
  });
});

describe('findAllMatchingTabs — tab title passthrough', () => {
  test('returns tab title from chrome.tabs.Tab objects', async () => {
    const tab1 = { id: 1, active: true, windowId: FOCUSED_WINDOW_ID, title: 'My Document' } as chrome.tabs.Tab;
    const tab2 = { id: 2, active: false, windowId: OTHER_WINDOW_ID, title: 'Another Doc' } as chrome.tabs.Tab;

    queryResults.set('*://example.com/*', [tab1, tab2]);

    const result = await findAllMatchingTabs(makePlugin(['*://example.com/*']));
    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe('My Document');
    expect(result[1]?.title).toBe('Another Doc');
  });

  test('returns undefined title when chrome.tabs.Tab has no title', async () => {
    const tab = { id: 1, active: false, windowId: OTHER_WINDOW_ID } as chrome.tabs.Tab;
    queryResults.set('*://example.com/*', [tab]);

    const result = await findAllMatchingTabs(makePlugin(['*://example.com/*']));
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBeUndefined();
  });
});

describe('findAllMatchingTabs — excludePatterns', () => {
  test('filters out tabs matching exclude patterns', async () => {
    const jiraTab = makeTab(1, { url: 'https://myteam.atlassian.net/browse/PROJ-1' });
    const wikiTab = makeTab(2, { url: 'https://myteam.atlassian.net/wiki/spaces/TEAM' });

    queryResults.set('*://*.atlassian.net/*', [jiraTab, wikiTab]);

    const result = await findAllMatchingTabs(makePlugin(['*://*.atlassian.net/*'], ['*://*.atlassian.net/wiki/*']));
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
  });

  test('returns all tabs when no exclude patterns are set', async () => {
    const tab1 = makeTab(1, { url: 'https://example.com/a' });
    const tab2 = makeTab(2, { url: 'https://example.com/b' });

    queryResults.set('*://example.com/*', [tab1, tab2]);

    const result = await findAllMatchingTabs(makePlugin(['*://example.com/*']));
    expect(result).toHaveLength(2);
  });

  test('returns empty array when all tabs match exclude patterns', async () => {
    const wikiTab1 = makeTab(1, { url: 'https://myteam.atlassian.net/wiki/a' });
    const wikiTab2 = makeTab(2, { url: 'https://myteam.atlassian.net/wiki/b' });

    queryResults.set('*://*.atlassian.net/*', [wikiTab1, wikiTab2]);

    const result = await findAllMatchingTabs(makePlugin(['*://*.atlassian.net/*'], ['*://*.atlassian.net/wiki/*']));
    expect(result).toEqual([]);
  });

  test('tabs without URL are kept (not excluded)', async () => {
    const noUrlTab = makeTab(1);
    const wikiTab = makeTab(2, { url: 'https://myteam.atlassian.net/wiki/spaces' });

    queryResults.set('*://*.atlassian.net/*', [noUrlTab, wikiTab]);

    const result = await findAllMatchingTabs(makePlugin(['*://*.atlassian.net/*'], ['*://*.atlassian.net/wiki/*']));
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
  });
});

describe('findMatchingTab', () => {
  test('returns the highest-ranked matching tab when multiple tabs match', async () => {
    const activeFocused = makeTab(1, { active: true, windowId: FOCUSED_WINDOW_ID });
    const activeOther = makeTab(2, { active: true, windowId: OTHER_WINDOW_ID });
    const inactiveUnfocused = makeTab(3, { active: false, windowId: OTHER_WINDOW_ID });

    queryResults.set('*://example.com/*', [inactiveUnfocused, activeOther, activeFocused]);

    const result = await findMatchingTab(makePlugin(['*://example.com/*']));
    expect(result?.id).toBe(1);
  });

  test('returns null when no tabs match any pattern', async () => {
    const result = await findMatchingTab(makePlugin(['*://example.com/*']));
    expect(result).toBeNull();
  });

  test('returns null when patterns array is empty', async () => {
    const result = await findMatchingTab(makePlugin([]));
    expect(result).toBeNull();
  });
});
