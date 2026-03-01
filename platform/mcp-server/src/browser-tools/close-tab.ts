/**
 * browser_close_tab — closes a browser tab by ID.
 */

import { defineBrowserTool } from './definition.js';
import { dispatchToExtension } from '../extension-protocol.js';
import { z } from 'zod';

const closeTab = defineBrowserTool({
  name: 'browser_close_tab',
  description: 'Close a browser tab by its tab ID. Use browser_list_tabs to find tab IDs.',
  icon: 'x',
  input: z.object({
    tabId: z.number().int().positive().describe('The tab ID to close'),
  }),
  handler: async (args, state) => dispatchToExtension(state, 'browser.closeTab', { tabId: args.tabId }),
});

export { closeTab };
