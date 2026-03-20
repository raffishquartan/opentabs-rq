import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { api } from '../sqlpad-api.js';
import { type RawSavedQuery, mapSavedQuery, savedQuerySchema } from './schemas.js';

export const listSavedQueries = defineTool({
  name: 'list_saved_queries',
  displayName: 'List Saved Queries',
  description:
    'List saved SQL queries in the workspace. Returns query names, IDs, connection IDs, and permissions. Use get_saved_query to retrieve the full SQL text.',
  summary: 'List all saved queries',
  icon: 'bookmark',
  group: 'Saved Queries',
  input: z.object({}),
  output: z.object({
    queries: z.array(savedQuerySchema).describe('Saved queries'),
  }),
  handle: async () => {
    const data = await api<RawSavedQuery[]>('/queries');
    return { queries: data.map(mapSavedQuery) };
  },
});
