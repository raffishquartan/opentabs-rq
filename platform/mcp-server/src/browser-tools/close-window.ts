/**
 * browser_close_window — closes a browser window by ID.
 */

import { z } from 'zod';
import { dispatchToExtension } from '../extension-protocol.js';
import { defineBrowserTool } from './definition.js';

const closeWindow = defineBrowserTool({
  name: 'browser_close_window',
  description:
    'Close a browser window by its window ID. Use browser_list_windows to find window IDs. ' +
    'This closes all tabs in the window.',
  summary: 'Close a browser window',
  icon: 'app-window',
  group: 'Windows',
  input: z.object({
    windowId: z.number().int().describe('The window ID to close'),
  }),
  handler: async (args, state) => dispatchToExtension(state, 'browser.closeWindow', { windowId: args.windowId }),
});

export { closeWindow };
