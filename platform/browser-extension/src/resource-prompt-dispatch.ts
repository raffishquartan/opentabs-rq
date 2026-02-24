import { SCRIPT_TIMEOUT_MS } from './constants.js';
import { dispatchWithTabFallback, executeWithTimeout, requireStringParam, resolvePlugin } from './dispatch-helpers.js';
import { JSONRPC_INVALID_PARAMS } from './json-rpc-errors.js';
import { sendToServer } from './messaging.js';
import type { DispatchResult } from './dispatch-helpers.js';

/**
 * Execute a resource read on a specific tab. Returns the structured result
 * from the adapter script, or throws if the tab is inaccessible.
 */
const executeResourceReadOnTab = async (
  tabId: number,
  pluginName: string,
  resourceUri: string,
): Promise<DispatchResult> => {
  const scriptPromise = chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: async (pName: string, uri: string) => {
      const ot = (globalThis as Record<string, unknown>).__openTabs as
        | {
            adapters?: Record<
              string,
              {
                isReady(): Promise<boolean>;
                resources?: Array<{
                  uri: string;
                  read(uri: string): Promise<unknown>;
                }>;
              }
            >;
          }
        | undefined;
      const adapter = ot?.adapters?.[pName];
      if (!adapter || typeof adapter !== 'object') {
        return { type: 'error' as const, code: -32002, message: `Adapter "${pName}" not injected or not ready` };
      }

      if (!Object.isFrozen(adapter)) {
        return {
          type: 'error' as const,
          code: -32002,
          message: `Adapter "${pName}" failed integrity check (not frozen)`,
        };
      }

      if (typeof adapter.isReady !== 'function') {
        return { type: 'error' as const, code: -32002, message: `Adapter "${pName}" has no isReady function` };
      }

      let ready: boolean;
      try {
        ready = await adapter.isReady();
      } catch {
        return { type: 'error' as const, code: -32002, message: `Adapter "${pName}" isReady() threw an error` };
      }

      if (!ready) {
        return {
          type: 'error' as const,
          code: -32002,
          message: `Plugin "${pName}" is not ready (state: unavailable)`,
        };
      }

      if (!Array.isArray(adapter.resources)) {
        return { type: 'error' as const, code: -32603, message: `Adapter "${pName}" has no resources array` };
      }

      const resource = adapter.resources.find((r: { uri: string }) => r.uri === uri);
      if (!resource || typeof resource.read !== 'function') {
        return { type: 'error' as const, code: -32603, message: `Resource "${uri}" not found in adapter "${pName}"` };
      }

      try {
        const output = await resource.read(uri);
        return { type: 'success' as const, output };
      } catch (err: unknown) {
        const caughtError = err as { message?: string };
        return {
          type: 'error' as const,
          code: -32603,
          message: caughtError.message ?? 'Resource read failed',
        };
      }
    },
    args: [pluginName, resourceUri],
  });

  return executeWithTimeout(scriptPromise, SCRIPT_TIMEOUT_MS, 'No result from resource read');
};

/**
 * Execute a prompt render on a specific tab. Returns the structured result
 * from the adapter script, or throws if the tab is inaccessible.
 */
const executePromptGetOnTab = async (
  tabId: number,
  pluginName: string,
  promptName: string,
  promptArgs: Record<string, string>,
): Promise<DispatchResult> => {
  const scriptPromise = chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: async (pName: string, pPromptName: string, pArgs: Record<string, string>) => {
      const ot = (globalThis as Record<string, unknown>).__openTabs as
        | {
            adapters?: Record<
              string,
              {
                isReady(): Promise<boolean>;
                prompts?: Array<{
                  name: string;
                  render(args: Record<string, string>): Promise<unknown>;
                }>;
              }
            >;
          }
        | undefined;
      const adapter = ot?.adapters?.[pName];
      if (!adapter || typeof adapter !== 'object') {
        return { type: 'error' as const, code: -32002, message: `Adapter "${pName}" not injected or not ready` };
      }

      if (!Object.isFrozen(adapter)) {
        return {
          type: 'error' as const,
          code: -32002,
          message: `Adapter "${pName}" failed integrity check (not frozen)`,
        };
      }

      if (typeof adapter.isReady !== 'function') {
        return { type: 'error' as const, code: -32002, message: `Adapter "${pName}" has no isReady function` };
      }

      let ready: boolean;
      try {
        ready = await adapter.isReady();
      } catch {
        return { type: 'error' as const, code: -32002, message: `Adapter "${pName}" isReady() threw an error` };
      }

      if (!ready) {
        return {
          type: 'error' as const,
          code: -32002,
          message: `Plugin "${pName}" is not ready (state: unavailable)`,
        };
      }

      if (!Array.isArray(adapter.prompts)) {
        return { type: 'error' as const, code: -32603, message: `Adapter "${pName}" has no prompts array` };
      }

      const prompt = adapter.prompts.find((p: { name: string }) => p.name === pPromptName);
      if (!prompt || typeof prompt.render !== 'function') {
        return {
          type: 'error' as const,
          code: -32603,
          message: `Prompt "${pPromptName}" not found in adapter "${pName}"`,
        };
      }

      try {
        const output = await prompt.render(pArgs);
        return { type: 'success' as const, output };
      } catch (err: unknown) {
        const caughtError = err as { message?: string };
        return {
          type: 'error' as const,
          code: -32603,
          message: caughtError.message ?? 'Prompt render failed',
        };
      }
    },
    args: [pluginName, promptName, promptArgs],
  });

  return executeWithTimeout(scriptPromise, SCRIPT_TIMEOUT_MS, 'No result from prompt render');
};

/**
 * Handle resource.read request from MCP server.
 * Finds matching tabs, checks adapter readiness, executes the resource read,
 * and returns the result.
 */
const handleResourceRead = async (params: Record<string, unknown>, id: string | number): Promise<void> => {
  const pluginName = requireStringParam(params, 'plugin', id);
  if (!pluginName) return;

  const resourceUri = requireStringParam(params, 'uri', id);
  if (!resourceUri) return;

  const plugin = await resolvePlugin(pluginName, id);
  if (!plugin) return;

  await dispatchWithTabFallback({
    id,
    pluginName,
    plugin,
    operationName: 'resource read',
    executeOnTab: tabId => executeResourceReadOnTab(tabId, pluginName, resourceUri),
  });
};

/**
 * Handle prompt.get request from MCP server.
 * Finds matching tabs, checks adapter readiness, executes the prompt render,
 * and returns the result.
 */
const handlePromptGet = async (params: Record<string, unknown>, id: string | number): Promise<void> => {
  const pluginName = requireStringParam(params, 'plugin', id);
  if (!pluginName) return;

  const promptName = requireStringParam(params, 'prompt', id);
  if (!promptName) return;

  const rawArgs = params.arguments;
  if (rawArgs !== undefined && rawArgs !== null && (typeof rawArgs !== 'object' || Array.isArray(rawArgs))) {
    sendToServer({
      jsonrpc: '2.0',
      error: { code: JSONRPC_INVALID_PARAMS, message: 'Invalid "arguments" param (expected object)' },
      id,
    });
    return;
  }
  const rawObj = (rawArgs ?? {}) as Record<string, unknown>;
  const promptArgs: Record<string, string> = {};
  for (const [key, val] of Object.entries(rawObj)) {
    promptArgs[key] = String(val);
  }

  const plugin = await resolvePlugin(pluginName, id);
  if (!plugin) return;

  await dispatchWithTabFallback({
    id,
    pluginName,
    plugin,
    operationName: 'prompt get',
    executeOnTab: tabId => executePromptGetOnTab(tabId, pluginName, promptName, promptArgs),
  });
};

export { handleResourceRead, handlePromptGet };
