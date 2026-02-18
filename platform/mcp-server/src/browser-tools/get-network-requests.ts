/**
 * browser_get_network_requests — get captured network requests for a tab.
 */

import { defineBrowserTool } from './definition.js';
import { dispatchToExtension } from '../extension-protocol.js';
import { z } from 'zod';

const getNetworkRequests = defineBrowserTool({
  name: 'browser_get_network_requests',
  description:
    'Get network requests captured since browser_enable_network_capture was called on this tab. ' +
    'Returns URL, HTTP method, status code, request/response headers, MIME type, and timing for each request.',
  input: z.object({
    tabId: z.number().int().positive().describe('Tab ID to get captured requests for'),
    clear: z.boolean().optional().describe('Clear the request buffer after reading — defaults to false'),
  }),
  handler: async (args, state) =>
    dispatchToExtension(state, 'browser.getNetworkRequests', {
      tabId: args.tabId,
      ...(args.clear !== undefined ? { clear: args.clear } : {}),
    }),
});

export { getNetworkRequests };
