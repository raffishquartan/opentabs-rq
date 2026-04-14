/**
 * browser_get_visits — gets detailed visit info for a URL via chrome.history API.
 */

import { z } from 'zod';
import { dispatchToExtension } from '../extension-protocol.js';
import { defineBrowserTool } from './definition.js';

const getVisits = defineBrowserTool({
  name: 'browser_get_visits',
  description:
    'Get detailed visit information for a specific URL. Returns an array of visits with visitId, ' +
    'visitTime (ISO string), referringVisitId, and transition type (link, typed, auto_bookmark, ' +
    'auto_subframe, manual_subframe, generated, auto_toplevel, form_submit, reload, keyword, keyword_generated). ' +
    'Use browser_search_history to find URLs first.',
  summary: 'Get visit details for a URL',
  icon: 'history',
  group: 'History',
  input: z.object({
    url: z.string().describe('The URL to get visit details for'),
  }),
  handler: async (args, state) => dispatchToExtension(state, 'browser.getVisits', args),
});

export { getVisits };
