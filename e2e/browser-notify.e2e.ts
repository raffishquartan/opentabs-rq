/**
 * browser_notify E2E tests — verifies the notification tool is registered,
 * dispatches successfully, and handles edge cases.
 *
 * Tests exercise the full stack: MCP client → MCP server → WebSocket →
 * extension → chrome.notifications API.
 */

import type { McpClient, McpServer } from './fixtures.js';
import { expect, test } from './fixtures.js';
import { parseToolResult, waitForExtensionConnected, waitForLog } from './helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const initAndListTools = async (
  mcpServer: McpServer,
  mcpClient: McpClient,
): Promise<Array<{ name: string; description: string; inputSchema?: unknown }>> => {
  await waitForExtensionConnected(mcpServer);
  await waitForLog(mcpServer, 'plugin(s) mapped');
  return mcpClient.listTools();
};

// ---------------------------------------------------------------------------
// Tool listing
// ---------------------------------------------------------------------------

test.describe('browser_notify — tool listing', () => {
  test('browser_notify appears in tools/list', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    const tools = await initAndListTools(mcpServer, mcpClient);
    const toolNames = tools.map(t => t.name);
    expect(toolNames).toContain('browser_notify');
  });

  test('has expected input schema properties', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    const tools = await initAndListTools(mcpServer, mcpClient);
    const notifyTool = tools.find(t => t.name === 'browser_notify');
    expect(notifyTool).toBeDefined();

    const schema = notifyTool?.inputSchema as {
      type: string;
      properties: Record<string, unknown>;
      required?: string[];
    };
    expect(schema.type).toBe('object');

    const expectedProperties = ['title', 'message', 'iconUrl', 'requireInteraction', 'contextMessage', 'url'];
    for (const prop of expectedProperties) {
      expect(schema.properties).toHaveProperty(prop);
    }

    expect(schema.required).toContain('title');
    expect(schema.required).toContain('message');
  });

  test('description mentions desktop notification', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    const tools = await initAndListTools(mcpServer, mcpClient);
    const notifyTool = tools.find(t => t.name === 'browser_notify');
    expect(notifyTool).toBeDefined();
    expect(notifyTool?.description.toLowerCase()).toContain('desktop notification');
  });
});

// ---------------------------------------------------------------------------
// Dispatch — successful notification calls
// ---------------------------------------------------------------------------

test.describe('browser_notify — dispatch', () => {
  test('sends notification with title and message', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await waitForExtensionConnected(mcpServer);
    const result = await mcpClient.callTool('browser_notify', {
      title: 'Test Notification',
      message: 'Hello from E2E test',
    });
    expect(result.isError).toBe(false);
    const data = parseToolResult(result.content);
    expect(data.notificationId).toMatch(/^opentabs-notify-/);
  });

  test('sends notification with all optional fields', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await waitForExtensionConnected(mcpServer);
    const result = await mcpClient.callTool('browser_notify', {
      title: 'Full Notification',
      message: 'With all fields',
      requireInteraction: true,
      contextMessage: 'Additional context',
      url: 'https://example.com',
    });
    expect(result.isError).toBe(false);
    const data = parseToolResult(result.content);
    expect(data.notificationId).toMatch(/^opentabs-notify-/);
  });

  test('sends notification with requireInteraction true', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await waitForExtensionConnected(mcpServer);
    const result = await mcpClient.callTool('browser_notify', {
      title: 'Persistent Notification',
      message: 'Stay visible',
      requireInteraction: true,
    });
    expect(result.isError).toBe(false);
    const data = parseToolResult(result.content);
    expect(data.notificationId).toMatch(/^opentabs-notify-/);
  });

  test('returns unique notificationId starting with opentabs-notify-', async ({
    mcpServer,
    extensionContext: _ext,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    const result1 = await mcpClient.callTool('browser_notify', {
      title: 'First',
      message: 'Notification 1',
    });
    const result2 = await mcpClient.callTool('browser_notify', {
      title: 'Second',
      message: 'Notification 2',
    });
    expect(result1.isError).toBe(false);
    expect(result2.isError).toBe(false);
    const id1 = parseToolResult(result1.content).notificationId as string;
    const id2 = parseToolResult(result2.content).notificationId as string;
    expect(id1).toMatch(/^opentabs-notify-/);
    expect(id2).toMatch(/^opentabs-notify-/);
    expect(id1).not.toBe(id2);
  });
});

// ---------------------------------------------------------------------------
// Edge cases — rapid fire, long strings, empty strings, missing fields
// ---------------------------------------------------------------------------

test.describe('browser_notify — edge cases', () => {
  test('sends 5 notifications rapidly with unique IDs', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await waitForExtensionConnected(mcpServer);
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        mcpClient.callTool('browser_notify', {
          title: `Notification ${i}`,
          message: `Message ${i}`,
        }),
      ),
    );
    const ids = results.map(r => {
      expect(r.isError).toBe(false);
      return parseToolResult(r.content).notificationId as string;
    });
    for (const id of ids) {
      expect(id).toMatch(/^opentabs-notify-/);
    }
    expect(new Set(ids).size).toBe(5);
  });

  test('sends notification with very long title (500+ chars)', async ({
    mcpServer,
    extensionContext: _ext,
    mcpClient,
  }) => {
    await waitForExtensionConnected(mcpServer);
    const longTitle = 'A'.repeat(500);
    const result = await mcpClient.callTool('browser_notify', {
      title: longTitle,
      message: 'test',
    });
    expect(result.isError).toBe(false);
    const data = parseToolResult(result.content);
    expect(data.notificationId).toMatch(/^opentabs-notify-/);
  });

  test('sends notification with empty message string', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await waitForExtensionConnected(mcpServer);
    const result = await mcpClient.callTool('browser_notify', {
      title: 'Empty Message Test',
      message: '',
    });
    expect(result.isError).toBe(false);
    const data = parseToolResult(result.content);
    expect(data.notificationId).toMatch(/^opentabs-notify-/);
  });

  test('returns error when title is missing', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await waitForExtensionConnected(mcpServer);
    const result = await mcpClient.callTool('browser_notify', { message: 'no title' });
    expect(result.isError).toBe(true);
  });

  test('returns error when message is missing', async ({ mcpServer, extensionContext: _ext, mcpClient }) => {
    await waitForExtensionConnected(mcpServer);
    const result = await mcpClient.callTool('browser_notify', { title: 'no message' });
    expect(result.isError).toBe(true);
  });
});
