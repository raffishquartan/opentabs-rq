/**
 * browser_search_history — searches browser history via chrome.history API.
 */

import { z } from 'zod';
import { dispatchToExtension } from '../extension-protocol.js';
import { defineBrowserTool } from './definition.js';

const searchHistory = defineBrowserTool({
  name: 'browser_search_history',
  description:
    'Search browser history by text query. Matches against page URLs and titles. ' +
    'Returns matching history entries with url, title, visitCount, and lastVisitTime (ISO string). ' +
    'Optionally filter by date range using startTime/endTime (ISO date strings).',
  summary: 'Search browser history',
  icon: 'history',
  group: 'History',
  input: z.object({
    query: z.string().describe('Text to search for in URLs and titles'),
    maxResults: z.number().int().positive().optional().describe('Maximum number of results to return (default: 20)'),
    startTime: z.string().optional().describe('Only return results visited after this ISO date string'),
    endTime: z.string().optional().describe('Only return results visited before this ISO date string'),
  }),
  handler: async (args, state) => dispatchToExtension(state, 'browser.searchHistory', args),
});

export { searchHistory };
