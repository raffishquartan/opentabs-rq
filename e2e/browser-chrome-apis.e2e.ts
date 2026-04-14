/**
 * E2E tests for Chrome API browser tools — windows, downloads, history,
 * bookmarks, recently closed sessions, and clear site data.
 *
 * These tools use chrome.windows, chrome.downloads, chrome.history,
 * chrome.bookmarks, chrome.sessions, and chrome.browsingData APIs
 * dispatched through the MCP server → WebSocket → extension pipeline.
 */

import type { McpClient, McpServer } from './fixtures.js';
import { expect, test } from './fixtures.js';
import { BROWSER_TOOL_NAMES, parseToolResult, waitFor, waitForExtensionConnected, waitForLog } from './helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const initAndListTools = async (
  mcpServer: McpServer,
  mcpClient: McpClient,
): Promise<Array<{ name: string; description: string }>> => {
  await waitForExtensionConnected(mcpServer);
  await waitForLog(mcpServer, 'plugin(s) mapped');
  return mcpClient.listTools();
};

// ---------------------------------------------------------------------------
// Tool listing — all new Chrome API tools appear
// ---------------------------------------------------------------------------

test.describe('Chrome API tools — tool listing', () => {
  const chromeApiToolNames = [
    'browser_list_windows',
    'browser_create_window',
    'browser_update_window',
    'browser_close_window',
    'browser_download_file',
    'browser_list_downloads',
    'browser_get_download_status',
    'browser_search_history',
    'browser_get_visits',
    'browser_search_bookmarks',
    'browser_create_bookmark',
    'browser_list_bookmark_tree',
    'browser_get_recently_closed',
    'browser_restore_session',
    'browser_clear_site_data',
  ];

  test('all Chrome API tools appear in tools/list', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    const tools = await initAndListTools(mcpServer, mcpClient);
    const toolNames = tools.map(t => t.name);

    for (const name of chromeApiToolNames) {
      expect(toolNames).toContain(name);
    }
  });

  test('all Chrome API tools are in BROWSER_TOOL_NAMES', () => {
    for (const name of chromeApiToolNames) {
      expect(BROWSER_TOOL_NAMES).toContain(name);
    }
  });
});

// ---------------------------------------------------------------------------
// Window management tools
// ---------------------------------------------------------------------------

test.describe('Window tools', () => {
  test('create window → list windows shows it → close window', async ({
    mcpServer,
    extensionContext: _ext,
    mcpClient,
    testServer,
  }) => {
    await initAndListTools(mcpServer, mcpClient);

    // Create a new window
    const createResult = await mcpClient.callTool('browser_create_window', {
      url: testServer.url,
      width: 800,
      height: 600,
    });
    expect(createResult.isError).toBe(false);
    const created = parseToolResult(createResult.content);
    expect(created).toHaveProperty('id');
    expect(typeof created.id).toBe('number');
    expect(created).toHaveProperty('state');

    const windowId = created.id as number;

    // List windows — should contain the newly created window
    const listResult = await mcpClient.callTool('browser_list_windows', {});
    expect(listResult.isError).toBe(false);
    const listData = parseToolResult(listResult.content);
    const windows = listData.windows as Array<Record<string, unknown>>;
    expect(Array.isArray(windows)).toBe(true);
    const found = windows.find(w => w.id === windowId);
    expect(found).toBeDefined();
    expect(found?.tabCount).toBeGreaterThanOrEqual(1);

    // Close the window
    const closeResult = await mcpClient.callTool('browser_close_window', { windowId });
    expect(closeResult.isError).toBe(false);
    const closeData = parseToolResult(closeResult.content);
    expect(closeData.ok).toBe(true);

    // Verify it's gone
    const listResult2 = await mcpClient.callTool('browser_list_windows', {});
    const listData2 = parseToolResult(listResult2.content);
    const windows2 = listData2.windows as Array<Record<string, unknown>>;
    expect(windows2.find(w => w.id === windowId)).toBeUndefined();
  });

  test('update window changes state', async ({ mcpServer, extensionContext: _ext, mcpClient, testServer }) => {
    await initAndListTools(mcpServer, mcpClient);

    // Create a window
    const createResult = await mcpClient.callTool('browser_create_window', {
      url: testServer.url,
    });
    expect(createResult.isError).toBe(false);
    const created = parseToolResult(createResult.content);
    const windowId = created.id as number;

    try {
      // Update to maximized
      const updateResult = await mcpClient.callTool('browser_update_window', {
        windowId,
        state: 'maximized',
      });
      expect(updateResult.isError).toBe(false);
      const updated = parseToolResult(updateResult.content);
      expect(updated.id).toBe(windowId);
      expect(updated.state).toBe('maximized');
    } finally {
      await mcpClient.callTool('browser_close_window', { windowId });
    }
  });

  test('closing a non-existent window returns error', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await initAndListTools(mcpServer, mcpClient);

    const result = await mcpClient.callTool('browser_close_window', { windowId: 999999 });
    expect(result.isError).toBe(true);
  });

  test('list windows returns correct shape', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await initAndListTools(mcpServer, mcpClient);

    const result = await mcpClient.callTool('browser_list_windows', {});
    expect(result.isError).toBe(false);
    const data = parseToolResult(result.content);
    const windows = data.windows as Array<Record<string, unknown>>;
    expect(windows.length).toBeGreaterThan(0);

    const win = windows[0] as Record<string, unknown>;
    expect(win).toHaveProperty('id');
    expect(win).toHaveProperty('state');
    expect(win).toHaveProperty('focused');
    expect(win).toHaveProperty('left');
    expect(win).toHaveProperty('top');
    expect(win).toHaveProperty('width');
    expect(win).toHaveProperty('height');
    expect(win).toHaveProperty('tabCount');
    expect(win).toHaveProperty('type');
  });
});

// ---------------------------------------------------------------------------
// Download tools
// ---------------------------------------------------------------------------

test.describe('Download tools', () => {
  test('download a file → list downloads shows it → check status', async ({
    mcpServer,
    extensionContext: _ext,
    mcpClient,
    testServer,
  }) => {
    await initAndListTools(mcpServer, mcpClient);

    // Download the test server root page (any HTTP URL works)
    const downloadResult = await mcpClient.callTool('browser_download_file', {
      url: testServer.url,
    });
    expect(downloadResult.isError).toBe(false);
    const downloadData = parseToolResult(downloadResult.content);
    expect(downloadData).toHaveProperty('downloadId');
    const downloadId = downloadData.downloadId as number;
    expect(typeof downloadId).toBe('number');

    // Wait for download to complete (or at least appear in list)
    await waitFor(
      async () => {
        const statusResult = await mcpClient.callTool('browser_get_download_status', { downloadId });
        if (statusResult.isError) return false;
        const status = parseToolResult(statusResult.content);
        return status.state === 'complete' || status.state === 'in_progress';
      },
      10_000,
      300,
      'download appeared in status',
    );

    // List downloads — should contain our download
    const listResult = await mcpClient.callTool('browser_list_downloads', {});
    expect(listResult.isError).toBe(false);
    const listData = parseToolResult(listResult.content);
    const downloads = listData.downloads as Array<Record<string, unknown>>;
    expect(Array.isArray(downloads)).toBe(true);
    const found = downloads.find(d => d.id === downloadId);
    expect(found).toBeDefined();
    expect(found).toHaveProperty('url');
    expect(found).toHaveProperty('state');
    expect(found).toHaveProperty('startTime');

    // Get detailed status
    const statusResult = await mcpClient.callTool('browser_get_download_status', { downloadId });
    expect(statusResult.isError).toBe(false);
    const status = parseToolResult(statusResult.content);
    expect(status.id).toBe(downloadId);
    expect(status).toHaveProperty('filename');
    expect(status).toHaveProperty('state');
    expect(status).toHaveProperty('bytesReceived');
    expect(status).toHaveProperty('totalBytes');
  });

  test('get_download_status for non-existent download returns error', async ({
    mcpServer,
    extensionContext: _ext,
    mcpClient,
  }) => {
    await initAndListTools(mcpServer, mcpClient);

    const result = await mcpClient.callTool('browser_get_download_status', { downloadId: 999999 });
    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// History tools
// ---------------------------------------------------------------------------

test.describe('History tools', () => {
  test('navigate to test server → search history finds the URL', async ({
    mcpServer,
    extensionContext: _ext,
    mcpClient,
    testServer,
  }) => {
    await initAndListTools(mcpServer, mcpClient);

    // Open a tab to create a history entry
    const openResult = await mcpClient.callTool('browser_open_tab', { url: testServer.url });
    expect(openResult.isError).toBe(false);
    const tabInfo = parseToolResult(openResult.content);
    const tabId = tabInfo.id as number;

    // Wait for page to load
    await waitFor(
      async () => {
        try {
          const result = await mcpClient.callTool('browser_execute_script', {
            tabId,
            code: 'return document.readyState',
          });
          if (result.isError) return false;
          const data = parseToolResult(result.content);
          const value = data.value as Record<string, unknown> | undefined;
          return value?.value === 'complete';
        } catch {
          return false;
        }
      },
      10_000,
      300,
      'tab readyState === complete',
    );

    // Search history for the test server URL
    // chrome.history.search with empty text returns all, so use a fragment of the URL
    await waitFor(
      async () => {
        const historyResult = await mcpClient.callTool('browser_search_history', {
          query: 'localhost',
          maxResults: 50,
        });
        if (historyResult.isError) return false;
        const historyData = parseToolResult(historyResult.content);
        const entries = historyData.entries as Array<Record<string, unknown>>;
        return entries.some(e => (e.url as string).includes(testServer.url.replace('http://', '')));
      },
      10_000,
      500,
      'history entry for test server URL',
    );

    // Get visits for the URL
    const visitsResult = await mcpClient.callTool('browser_get_visits', { url: testServer.url });
    expect(visitsResult.isError).toBe(false);
    const visitsData = parseToolResult(visitsResult.content);
    const visits = visitsData.visits as Array<Record<string, unknown>>;
    expect(Array.isArray(visits)).toBe(true);
    expect(visits.length).toBeGreaterThan(0);
    expect(visits[0]).toHaveProperty('visitId');
    expect(visits[0]).toHaveProperty('transition');
  });

  test('search history returns correct shape', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await initAndListTools(mcpServer, mcpClient);

    // Search for anything (empty-ish query returns recent entries)
    const result = await mcpClient.callTool('browser_search_history', {
      query: '',
      maxResults: 5,
    });
    expect(result.isError).toBe(false);
    const data = parseToolResult(result.content);
    expect(data).toHaveProperty('entries');
    const entries = data.entries as Array<Record<string, unknown>>;
    expect(Array.isArray(entries)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bookmark tools
// ---------------------------------------------------------------------------

test.describe('Bookmark tools', () => {
  test('create bookmark → search bookmarks finds it', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await initAndListTools(mcpServer, mcpClient);

    const uniqueTitle = `E2E Test Bookmark ${Date.now()}`;

    // Create a bookmark
    const createResult = await mcpClient.callTool('browser_create_bookmark', {
      title: uniqueTitle,
      url: 'https://example.com/e2e-test',
    });
    expect(createResult.isError).toBe(false);
    const created = parseToolResult(createResult.content);
    expect(created).toHaveProperty('id');
    expect(created.title).toBe(uniqueTitle);
    expect(created.url).toBe('https://example.com/e2e-test');
    expect(created).toHaveProperty('parentId');

    // Search for the bookmark
    const searchResult = await mcpClient.callTool('browser_search_bookmarks', {
      query: uniqueTitle,
    });
    expect(searchResult.isError).toBe(false);
    const searchData = parseToolResult(searchResult.content);
    const bookmarks = searchData.bookmarks as Array<Record<string, unknown>>;
    expect(Array.isArray(bookmarks)).toBe(true);
    const found = bookmarks.find(b => b.title === uniqueTitle);
    expect(found).toBeDefined();
    expect(found?.url).toBe('https://example.com/e2e-test');
  });

  test('list bookmark tree returns a tree structure', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await initAndListTools(mcpServer, mcpClient);

    const result = await mcpClient.callTool('browser_list_bookmark_tree', {});
    expect(result.isError).toBe(false);
    const data = parseToolResult(result.content);
    expect(data).toHaveProperty('tree');
    const tree = data.tree as Array<Record<string, unknown>>;
    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBeGreaterThan(0);

    // Root node should have children
    const root = tree[0] as Record<string, unknown>;
    expect(root).toHaveProperty('id');
    expect(root).toHaveProperty('title');
  });

  test('search bookmarks with no matches returns empty array', async ({
    mcpServer,
    extensionContext: _ext,
    mcpClient,
  }) => {
    await initAndListTools(mcpServer, mcpClient);

    const result = await mcpClient.callTool('browser_search_bookmarks', {
      query: `nonexistent_bookmark_xyz_${Date.now()}`,
    });
    expect(result.isError).toBe(false);
    const data = parseToolResult(result.content);
    const bookmarks = data.bookmarks as Array<Record<string, unknown>>;
    expect(bookmarks).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Recently closed / session restore tools
// ---------------------------------------------------------------------------

test.describe('Recently closed tools', () => {
  test('close a tab → get recently closed shows it', async ({
    mcpServer,
    extensionContext: _ext,
    mcpClient,
    testServer,
  }) => {
    await initAndListTools(mcpServer, mcpClient);

    // Open a tab
    const openResult = await mcpClient.callTool('browser_open_tab', { url: testServer.url });
    expect(openResult.isError).toBe(false);
    const tabInfo = parseToolResult(openResult.content);
    const tabId = tabInfo.id as number;

    // Wait for page load
    await waitFor(
      async () => {
        try {
          const result = await mcpClient.callTool('browser_execute_script', {
            tabId,
            code: 'return document.readyState',
          });
          if (result.isError) return false;
          const data = parseToolResult(result.content);
          const value = data.value as Record<string, unknown> | undefined;
          return value?.value === 'complete';
        } catch {
          return false;
        }
      },
      10_000,
      300,
      'tab loaded for recently closed test',
    );

    // Close the tab
    const closeResult = await mcpClient.callTool('browser_close_tab', { tabId });
    expect(closeResult.isError).toBe(false);

    // Get recently closed — should contain the closed tab
    await waitFor(
      async () => {
        const recentResult = await mcpClient.callTool('browser_get_recently_closed', {});
        if (recentResult.isError) return false;
        const recentData = parseToolResult(recentResult.content);
        const sessions = recentData.sessions as Array<Record<string, unknown>>;
        return sessions.some(
          s => s.type === 'tab' && typeof s.url === 'string' && (s.url as string).includes('localhost'),
        );
      },
      10_000,
      500,
      'recently closed contains the closed tab',
    );
  });

  test('get recently closed returns correct shape', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await initAndListTools(mcpServer, mcpClient);

    const result = await mcpClient.callTool('browser_get_recently_closed', {});
    expect(result.isError).toBe(false);
    const data = parseToolResult(result.content);
    expect(data).toHaveProperty('sessions');
    const sessions = data.sessions as Array<Record<string, unknown>>;
    expect(Array.isArray(sessions)).toBe(true);

    // Each session should have the basic fields
    for (const session of sessions) {
      expect(session).toHaveProperty('type');
      expect(['tab', 'window']).toContain(session.type);
      if (session.type === 'tab') {
        expect(session).toHaveProperty('sessionId');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Clear site data tool
// ---------------------------------------------------------------------------

test.describe('Clear site data', () => {
  test('clears site data for a valid origin', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await initAndListTools(mcpServer, mcpClient);

    const result = await mcpClient.callTool('browser_clear_site_data', {
      origin: 'https://example.com',
      cookies: true,
      localStorage: true,
      cache: false,
    });
    expect(result.isError).toBe(false);
    const data = parseToolResult(result.content);
    expect(data.origin).toBe('https://example.com');
    expect(data.cleared).toBeDefined();
    const cleared = data.cleared as Record<string, boolean>;
    expect(cleared.cookies).toBe(true);
    expect(cleared.localStorage).toBe(true);
    expect(cleared.cache).toBe(false);
  });

  test('returns error for invalid origin', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await initAndListTools(mcpServer, mcpClient);

    const result = await mcpClient.callTool('browser_clear_site_data', {
      origin: 'not-a-valid-url',
    });
    expect(result.isError).toBe(true);
  });
});
