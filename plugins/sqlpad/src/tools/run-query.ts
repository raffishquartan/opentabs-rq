import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { runQuery } from '../sqlpad-api.js';
import { queryResultSchema } from './schemas.js';

export const runQueryTool = defineTool({
  name: 'run_query',
  displayName: 'Run Query',
  description:
    'Execute a SQL query on a database connection and return the results. Only read-only SQL statements (SELECT, SHOW, DESCRIBE, EXPLAIN) are recommended. The query is submitted as a batch, polled for completion, and results are returned as objects keyed by column name. Queries have a 5-minute timeout.',
  summary: 'Execute a SQL query and return results',
  icon: 'play',
  group: 'Queries',
  input: z.object({
    connectionId: z.string().describe('Connection ID to run the query against (from list_connections)'),
    query: z.string().describe('SQL query to execute'),
    maxRows: z.number().int().min(1).optional().describe('Maximum rows to return (default 100)'),
  }),
  output: queryResultSchema,
  handle: async (params, context) => {
    const maxRows = params.maxRows ?? 100;
    const result = await runQuery(params.connectionId, params.query, maxRows, msg => {
      context?.reportProgress({ progress: 0, total: 1, message: msg });
    });
    return result;
  },
});
