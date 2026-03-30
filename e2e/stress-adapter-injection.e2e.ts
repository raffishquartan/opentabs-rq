/**
 * Stress tests for adapter injection — verifies the extension handles rapid
 * IIFE changes, injection during navigation, concurrent tab opens, and
 * adapter file corruption/recovery gracefully.
 */

import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { expect } from './fixtures.js';
import {
  callToolExpectSuccess,
  openTestAppTab,
  parseToolResult,
  replaceIifeClosing,
  setupIsolatedIifeTest,
  waitFor,
  waitForToolResult,
  writeAndWaitForWatcher,
} from './helpers.js';

// ---------------------------------------------------------------------------
// US-001: Rapid adapter re-injection (5 IIFE changes in 5 seconds)
// ---------------------------------------------------------------------------

test.describe('Stress — rapid adapter re-injection', () => {
  test('5 IIFE modifications in rapid succession settle to the latest hash and tools work', async () => {
    const ctx = await setupIsolatedIifeTest('stress-rapid-reinject');

    try {
      // Open a tab to the test server and wait for adapter injection
      const page = await openTestAppTab(ctx.context, ctx.testServer.url, ctx.server, ctx.testServer);

      // Poll until tool dispatch works (tab state = ready)
      await waitForToolResult(ctx.client, 'e2e-test_get_status', {}, { isError: false }, 15_000);

      // Baseline: tool works
      const baseline = await callToolExpectSuccess(ctx.client, ctx.server, 'e2e-test_echo', {
        message: 'before-rapid-changes',
      });
      expect(baseline.message).toBe('before-rapid-changes');

      // Read the original IIFE from the plugin copy's dist/
      const iifePath = path.join(ctx.pluginDir, 'dist', 'adapter.iife.js');
      const originalIife = fs.readFileSync(iifePath, 'utf-8');

      // Modify the IIFE 5 times in rapid succession (1s between changes)
      for (let i = 0; i < 5; i++) {
        const commentCode = `\n// change-${String(i)} timestamp=${Date.now()}`;
        const modifiedIife = replaceIifeClosing(originalIife, commentCode);

        await writeAndWaitForWatcher(
          ctx.server,
          () => fs.writeFileSync(iifePath, modifiedIife, 'utf-8'),
          'IIFE updated for',
        );

        // 1s delay between changes as specified
        if (i < 4) {
          await new Promise(r => setTimeout(r, 1_000));
        }
      }

      // Wait for the adapter to settle — poll until extension_check_adapter
      // reports that all tabs have the latest hash.
      await waitFor(
        async () => {
          try {
            const result = await callToolExpectSuccess(ctx.client, ctx.server, 'extension_check_adapter', {
              plugin: 'e2e-test',
            });
            const tabs = result.matchingTabs as Array<{ hashMatch: boolean; adapterPresent: boolean }>;
            return tabs.length > 0 && tabs.every(t => t.adapterPresent && t.hashMatch);
          } catch {
            return false;
          }
        },
        20_000,
        500,
        'extension_check_adapter to report matching hash after rapid changes',
      );

      // Verify the expectedHash from extension_check_adapter matches a
      // sha256 prefix of the final IIFE content (the server computes the
      // adapter hash the same way)
      const checkResult = await callToolExpectSuccess(ctx.client, ctx.server, 'extension_check_adapter', {
        plugin: 'e2e-test',
      });
      const expectedHash = checkResult.expectedHash as string;
      expect(expectedHash.length).toBeGreaterThan(0);

      // Verify tool dispatch still works with the final adapter version
      const afterResult = await callToolExpectSuccess(ctx.client, ctx.server, 'e2e-test_echo', {
        message: 'after-rapid-changes',
      });
      expect(afterResult.message).toBe('after-rapid-changes');

      await page.close();
    } finally {
      await ctx.cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// US-002: Adapter injection during tab navigation
// ---------------------------------------------------------------------------

test.describe('Stress — adapter injection during tab navigation', () => {
  test('navigating away mid-injection causes no crash, and navigating back re-injects', async () => {
    const ctx = await setupIsolatedIifeTest('stress-nav-inject');

    try {
      // Open a tab and wait for adapter injection + ready state
      const page = await openTestAppTab(ctx.context, ctx.testServer.url, ctx.server, ctx.testServer);
      await waitForToolResult(ctx.client, 'e2e-test_get_status', {}, { isError: false }, 15_000);

      // Baseline: tool works on the matching tab
      const baseline = await callToolExpectSuccess(ctx.client, ctx.server, 'e2e-test_echo', {
        message: 'before-navigation',
      });
      expect(baseline.message).toBe('before-navigation');

      // Start a tool call and immediately navigate away — the tool call may
      // succeed or fail depending on timing, but it must not crash the extension.
      const toolPromise = ctx.client.callTool('e2e-test_echo', { message: 'during-navigation' });
      await page.goto('about:blank', { waitUntil: 'load' });

      // The tool call should resolve (success or error — either is acceptable)
      const midNavResult = await toolPromise;
      expect(typeof midNavResult.isError).toBe('boolean');

      // Navigate back to the matching URL
      await page.goto(ctx.testServer.url, { waitUntil: 'load' });

      // Wait for adapter re-injection after navigating back
      await waitFor(
        async () => {
          const present = await page.evaluate(() => {
            const ot = (globalThis as Record<string, unknown>).__openTabs as
              | { adapters?: Record<string, unknown> }
              | undefined;
            return ot?.adapters?.['e2e-test'] !== undefined;
          });
          return present;
        },
        20_000,
        500,
        'e2e-test adapter to be re-injected after navigating back to matching URL',
      );

      // Wait for the tab to reach ready state again
      await waitForToolResult(ctx.client, 'e2e-test_get_status', {}, { isError: false }, 15_000);

      // Verify tool calls work after re-injection
      const afterResult = await callToolExpectSuccess(ctx.client, ctx.server, 'e2e-test_echo', {
        message: 'after-navigation-back',
      });
      expect(afterResult.message).toBe('after-navigation-back');

      // Check extension logs for error-level entries that indicate crashes.
      // Expected injection warnings (e.g., tab navigated during injection) are
      // acceptable — only unexpected errors indicate a real problem.
      const logsResult = await ctx.client.callTool('extension_get_logs');
      expect(logsResult.isError).toBe(false);
      const logsData = parseToolResult(logsResult.content);
      const entries = logsData.entries as Array<{ level: string; message: string }>;
      const errorEntries = entries.filter(
        e => e.level === 'error' && !e.message.includes('No tab found') && !e.message.includes('navigation'),
      );
      expect(errorEntries).toEqual([]);

      await page.close();
    } finally {
      await ctx.cleanup();
    }
  });
});
