/**
 * Stress tests for MCP server tool dispatch: high-concurrency parallel calls
 * to the same plugin tab, verifying correct response routing under load.
 *
 * These tests go beyond dispatch-resilience.e2e.ts (which tests 3-5 concurrent
 * calls) by firing 10+ and 20+ calls simultaneously and verifying every
 * response maps back to its originating request without corruption or drops.
 */

import { expect, test } from './fixtures.js';
import { parseToolResult, setupToolTest } from './helpers.js';

test.describe('Concurrent dispatch stress — 10+ parallel calls', () => {
  test('10 concurrent echo calls return correct unique results', async ({
    mcpServer,
    testServer,
    extensionContext,
    mcpClient,
  }) => {
    test.slow();

    const page = await setupToolTest(mcpServer, testServer, extensionContext, mcpClient);

    const count = 10;
    const messages = Array.from({ length: count }, (_, i) => `concurrent-${i}`);

    const results = await Promise.all(messages.map(msg => mcpClient.callTool('e2e-test_echo', { message: msg })));

    expect(results).toHaveLength(count);

    // All 10 results must be non-error
    for (const [i, result] of results.entries()) {
      expect(result.isError, `result ${i} should not be an error: ${result.content}`).toBe(false);
    }

    // Each result must contain the correct echo response matching its input
    const receivedMessages: string[] = [];
    for (const [i, result] of results.entries()) {
      const parsed = parseToolResult(result.content);
      expect(parsed.message).toBe(messages[i]);
      receivedMessages.push(parsed.message as string);
    }

    // No two results contain the same message (no response routing corruption)
    const unique = new Set(receivedMessages);
    expect(unique.size).toBe(count);

    await page.close();
  });

  test('20 concurrent echo calls return correct unique results', async ({
    mcpServer,
    testServer,
    extensionContext,
    mcpClient,
  }) => {
    test.slow();

    const page = await setupToolTest(mcpServer, testServer, extensionContext, mcpClient);

    const count = 20;
    const messages = Array.from({ length: count }, (_, i) => `stress-${i}`);

    const results = await Promise.all(messages.map(msg => mcpClient.callTool('e2e-test_echo', { message: msg })));

    expect(results).toHaveLength(count);

    // All 20 results must be non-error
    for (const [i, result] of results.entries()) {
      expect(result.isError, `result ${i} should not be an error: ${result.content}`).toBe(false);
    }

    // Each result must match its input (1:1 positional mapping)
    const receivedMessages: string[] = [];
    for (const [i, result] of results.entries()) {
      const parsed = parseToolResult(result.content);
      expect(parsed.message).toBe(messages[i]);
      receivedMessages.push(parsed.message as string);
    }

    // No duplicates — Set.size must equal count
    const unique = new Set(receivedMessages);
    expect(unique.size).toBe(count);

    await page.close();
  });
});
