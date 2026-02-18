/**
 * browser_enable_network_capture — start capturing network requests for a tab.
 */

import { defineBrowserTool } from './definition.js';
import { dispatchToExtension } from '../extension-protocol.js';
import { z } from 'zod';

const enableNetworkCapture = defineBrowserTool({
  name: 'browser_enable_network_capture',
  description:
    'Start capturing network requests and responses for a browser tab using the Chrome DevTools Protocol. ' +
    'Captures request URL, method, status, headers, and timing. Retrieve captured data with browser_get_network_requests. ' +
    'Only one capture session per tab — call browser_disable_network_capture first to restart.',
  input: z.object({
    tabId: z.number().int().positive().describe('Tab ID to capture network requests for'),
    maxRequests: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Maximum requests to buffer before dropping oldest — defaults to 100'),
    urlFilter: z.string().optional().describe('Only capture requests whose URL contains this substring'),
  }),
  handler: async (args, state) =>
    dispatchToExtension(state, 'browser.enableNetworkCapture', {
      tabId: args.tabId,
      ...(args.maxRequests !== undefined ? { maxRequests: args.maxRequests } : {}),
      ...(args.urlFilter !== undefined ? { urlFilter: args.urlFilter } : {}),
    }),
});

export { enableNetworkCapture };
