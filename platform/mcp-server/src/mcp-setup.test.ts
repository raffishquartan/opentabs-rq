import { rebuildToolLookups, trustTierPrefix } from './mcp-setup.js';
import { createState } from './state.js';
import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import type { BrowserToolDefinition } from './browser-tools/definition.js';
import type { RegisteredPlugin } from './state.js';

/** Create a minimal RegisteredPlugin for testing */
const createPlugin = (name: string, toolNames: string[]): RegisteredPlugin => ({
  name,
  version: '1.0.0',
  urlPatterns: [`https://${name}.example.com/*`],
  trustTier: 'local',
  iife: `(function(){/* ${name} */})()`,
  tools: toolNames.map(t => ({
    name: t,
    description: `${t} description`,
    input_schema: { type: 'object' },
    output_schema: { type: 'object' },
  })),
});

describe('rebuildToolLookups — plugin tool lookup', () => {
  test('populates toolLookup with correct prefixed names', () => {
    const state = createState();
    state.plugins.set('slack', createPlugin('slack', ['send_message', 'read_messages']));

    rebuildToolLookups(state);

    expect(state.toolLookup.size).toBe(2);
    expect(state.toolLookup.get('slack_send_message')).toEqual({ pluginName: 'slack', toolName: 'send_message' });
    expect(state.toolLookup.get('slack_read_messages')).toEqual({ pluginName: 'slack', toolName: 'read_messages' });
  });

  test('empty plugins produces empty toolLookup', () => {
    const state = createState();

    rebuildToolLookups(state);

    expect(state.toolLookup.size).toBe(0);
  });

  test('multiple plugins produces correct entries for all tools', () => {
    const state = createState();
    state.plugins.set('slack', createPlugin('slack', ['send_message']));
    state.plugins.set('github', createPlugin('github', ['create_issue', 'list_prs']));

    rebuildToolLookups(state);

    expect(state.toolLookup.size).toBe(3);
    expect(state.toolLookup.get('slack_send_message')).toEqual({ pluginName: 'slack', toolName: 'send_message' });
    expect(state.toolLookup.get('github_create_issue')).toEqual({ pluginName: 'github', toolName: 'create_issue' });
    expect(state.toolLookup.get('github_list_prs')).toEqual({ pluginName: 'github', toolName: 'list_prs' });
  });

  test('replaces previous toolLookup entries on rebuild', () => {
    const state = createState();
    state.plugins.set('slack', createPlugin('slack', ['send_message']));
    rebuildToolLookups(state);
    expect(state.toolLookup.size).toBe(1);

    // Change plugins and rebuild
    state.plugins.clear();
    state.plugins.set('github', createPlugin('github', ['create_issue']));
    rebuildToolLookups(state);

    expect(state.toolLookup.size).toBe(1);
    expect(state.toolLookup.has('slack_send_message')).toBe(false);
    expect(state.toolLookup.get('github_create_issue')).toEqual({ pluginName: 'github', toolName: 'create_issue' });
  });
});

describe('rebuildToolLookups — cached browser tools', () => {
  test('populates cachedBrowserTools with pre-computed JSON schemas', () => {
    const state = createState();
    const browserTool: BrowserToolDefinition = {
      name: 'browser_list_tabs',
      description: 'List all open tabs',
      input: z.object({}),
      handler: () => Promise.resolve([]),
    };
    state.browserTools = [browserTool];

    rebuildToolLookups(state);

    expect(state.cachedBrowserTools).toHaveLength(1);
    const cachedRaw = state.cachedBrowserTools[0];
    expect(cachedRaw).toBeDefined();
    const cached = cachedRaw as NonNullable<typeof cachedRaw>;
    expect(cached.name).toBe('browser_list_tabs');
    expect(cached.description).toBe('List all open tabs');
    expect(cached.inputSchema).toBeDefined();
    expect(typeof cached.inputSchema).toBe('object');
    expect(cached.tool).toBe(browserTool);
  });

  test('empty browserTools produces empty cachedBrowserTools', () => {
    const state = createState();
    state.browserTools = [];

    rebuildToolLookups(state);

    expect(state.cachedBrowserTools).toHaveLength(0);
  });

  test('multiple browser tools produce correct cached entries', () => {
    const state = createState();
    state.browserTools = [
      {
        name: 'browser_list_tabs',
        description: 'List tabs',
        input: z.object({}),
        handler: () => Promise.resolve([]),
      },
      {
        name: 'browser_open_tab',
        description: 'Open a tab',
        input: z.object({ url: z.string() }),
        handler: () => Promise.resolve({}),
      },
    ];

    rebuildToolLookups(state);

    expect(state.cachedBrowserTools).toHaveLength(2);
    const firstCached = state.cachedBrowserTools[0];
    expect(firstCached).toBeDefined();
    expect((firstCached as NonNullable<typeof firstCached>).name).toBe('browser_list_tabs');
    const secondCached = state.cachedBrowserTools[1];
    expect(secondCached).toBeDefined();
    expect((secondCached as NonNullable<typeof secondCached>).name).toBe('browser_open_tab');
    // Verify the input schema has the url property
    const openTabSchema = (secondCached as NonNullable<typeof secondCached>).inputSchema;
    expect(openTabSchema).toHaveProperty('properties');
  });
});

describe('trustTierPrefix', () => {
  test('returns correct prefix for official tier', () => {
    expect(trustTierPrefix('official')).toBe('[Official] ');
  });

  test('returns correct prefix for community tier', () => {
    expect(trustTierPrefix('community')).toBe('[Community plugin — unverified] ');
  });

  test('returns correct prefix for local tier', () => {
    expect(trustTierPrefix('local')).toBe('[Local plugin] ');
  });
});
