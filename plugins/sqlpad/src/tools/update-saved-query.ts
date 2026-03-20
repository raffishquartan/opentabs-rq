import { defineTool, stripUndefined } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { api } from '../sqlpad-api.js';
import { type RawSavedQuery, mapSavedQuery, savedQuerySchema } from './schemas.js';

export const updateSavedQuery = defineTool({
  name: 'update_saved_query',
  displayName: 'Update Saved Query',
  description: 'Update an existing saved query. Only the provided fields are changed.',
  summary: 'Update a saved query',
  icon: 'pencil',
  group: 'Saved Queries',
  input: z.object({
    queryId: z.string().describe('Saved query ID to update'),
    name: z.string().optional().describe('New query name'),
    connectionId: z.string().optional().describe('New connection ID'),
    queryText: z.string().optional().describe('New SQL query text'),
    tags: z.array(z.string()).optional().describe('New tags'),
  }),
  output: savedQuerySchema,
  handle: async params => {
    const body = stripUndefined({
      name: params.name,
      connectionId: params.connectionId,
      queryText: params.queryText,
      tags: params.tags,
    });
    const data = await api<RawSavedQuery>(`/queries/${params.queryId}`, {
      method: 'PUT',
      body,
    });
    return mapSavedQuery(data);
  },
});
