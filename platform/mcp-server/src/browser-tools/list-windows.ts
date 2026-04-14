/**
 * browser_list_windows — lists all open browser windows with metadata.
 */

import { z } from 'zod';
import { dispatchToExtension } from '../extension-protocol.js';
import { defineBrowserTool } from './definition.js';

const listWindows = defineBrowserTool({
  name: 'browser_list_windows',
  description:
    "List all open browser windows. Returns each window's id, state (normal/minimized/maximized/fullscreen), " +
    'bounds (left, top, width, height), tab count, focused status, incognito flag, and type. ' +
    'Use the returned window IDs with browser_update_window and browser_close_window.',
  summary: 'List all open browser windows',
  icon: 'app-window',
  group: 'Windows',
  input: z.object({}),
  handler: async (_args, state) => dispatchToExtension(state, 'browser.listWindows', {}),
});

export { listWindows };
