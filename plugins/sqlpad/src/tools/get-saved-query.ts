import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { api } from '../sqlpad-api.js';
import { type RawSavedQuery, mapSavedQuery, savedQuerySchema } from './schemas.js';

export const getSavedQuery = defineTool({
  name: 'get_saved_query',
  displayName: 'Get Saved Query',
  description: 'Get the full details of a saved query by ID, including the SQL text.',
  summary: 'Get saved query details by ID',
  icon: 'bookmark',
  group: 'Saved Queries',
  input: z.object({
    queryId: z.string().describe('Saved query ID (from list_saved_queries)'),
  }),
  output: savedQuerySchema,
  handle: async params => {
    const data = await api<RawSavedQuery>(`/queries/${params.queryId}`);
    return mapSavedQuery(data);
  },
});
