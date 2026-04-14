/**
 * browser_update_window — updates an existing browser window's state, size, or position.
 */

import { z } from 'zod';
import { dispatchToExtension } from '../extension-protocol.js';
import { defineBrowserTool } from './definition.js';

const updateWindow = defineBrowserTool({
  name: 'browser_update_window',
  description:
    "Update a browser window's state, size, position, or focus. At least one property must be provided. " +
    'Use browser_list_windows to find window IDs. ' +
    "Returns the updated window's id, state, bounds, and metadata.",
  summary: 'Update a browser window',
  icon: 'app-window',
  group: 'Windows',
  input: z.object({
    windowId: z.number().int().describe('The window ID to update'),
    state: z.enum(['normal', 'minimized', 'maximized', 'fullscreen']).optional().describe('New window state'),
    left: z.number().int().optional().describe('New left position in pixels'),
    top: z.number().int().optional().describe('New top position in pixels'),
    width: z.number().int().positive().optional().describe('New width in pixels'),
    height: z.number().int().positive().optional().describe('New height in pixels'),
    focused: z.boolean().optional().describe('Bring window to foreground'),
  }),
  handler: async (args, state) => dispatchToExtension(state, 'browser.updateWindow', args),
});

export { updateWindow };
