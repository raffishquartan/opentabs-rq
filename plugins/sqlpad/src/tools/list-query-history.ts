import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { api } from '../sqlpad-api.js';
import { type RawQueryHistory, mapQueryHistory, queryHistorySchema } from './schemas.js';

export const listQueryHistory = defineTool({
  name: 'list_query_history',
  displayName: 'List Query History',
  description:
    'List query execution history with optional filtering by connection. Returns recent queries with their execution status, duration, and row counts. Results are ordered by most recent first.',
  summary: 'List recent query execution history',
  icon: 'history',
  group: 'History',
  input: z.object({
    connectionId: z.string().optional().describe('Filter by connection ID'),
    limit: z.number().int().min(1).max(1000).optional().describe('Maximum entries to return (default 50)'),
  }),
  output: z.object({
    entries: z.array(queryHistorySchema).describe('Query history entries'),
  }),
  handle: async params => {
    const query: Record<string, string | number | boolean | undefined> = {
      limit: params.limit ?? 50,
    };
    if (params.connectionId) {
      query.connectionId = params.connectionId;
    }
    const data = await api<RawQueryHistory[]>('/query-history', { query });
    return { entries: data.map(mapQueryHistory) };
  },
});
