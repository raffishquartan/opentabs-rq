import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { api } from '../sqlpad-api.js';
import { type RawSavedQuery, mapSavedQuery, savedQuerySchema } from './schemas.js';

export const createSavedQuery = defineTool({
  name: 'create_saved_query',
  displayName: 'Create Saved Query',
  description:
    'Save a new SQL query with a name, connection, and optional tags. The query can be retrieved later by ID.',
  summary: 'Save a new SQL query',
  icon: 'plus',
  group: 'Saved Queries',
  input: z.object({
    name: z.string().describe('Query name'),
    connectionId: z.string().describe('Connection ID the query targets'),
    queryText: z.string().describe('SQL query text'),
    tags: z.array(z.string()).optional().describe('Tags to assign to the query'),
  }),
  output: savedQuerySchema,
  handle: async params => {
    const data = await api<RawSavedQuery>('/queries', {
      method: 'POST',
      body: {
        name: params.name,
        connectionId: params.connectionId,
        queryText: params.queryText,
        tags: params.tags ?? [],
      },
    });
    return mapSavedQuery(data);
  },
});
