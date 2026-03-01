/**
 * browser_type_text — type text into an input field or textarea.
 */

import { defineBrowserTool } from './definition.js';
import { dispatchToExtension } from '../extension-protocol.js';
import { z } from 'zod';

const typeText = defineBrowserTool({
  name: 'browser_type_text',
  description:
    'Type text into an input field or textarea matching the CSS selector. Focuses the element, optionally clears ' +
    'existing content, sets the value, and dispatches input and change events to trigger any attached event listeners.',
  icon: 'keyboard',
  input: z.object({
    tabId: z.number().int().positive().describe('Tab ID of the page to interact with'),
    selector: z.string().min(1).describe('CSS selector of the input or textarea'),
    text: z.string().describe('Text to enter into the element'),
    clear: z.boolean().optional().describe('Clear existing value before typing — defaults to true'),
  }),
  handler: async (args, state) =>
    dispatchToExtension(state, 'browser.typeText', {
      tabId: args.tabId,
      selector: args.selector,
      text: args.text,
      clear: args.clear ?? true,
    }),
});

export { typeText };
