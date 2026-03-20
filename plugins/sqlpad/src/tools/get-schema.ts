import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { api } from '../sqlpad-api.js';
import { type RawDbSchema, dbSchemaSchema, mapDbSchema } from './schemas.js';

interface SchemaResponse {
  schemas?: RawDbSchema[];
}

export const getSchema = defineTool({
  name: 'get_schema',
  displayName: 'Get Schema',
  description:
    'Get the database schema for a connection, including all schemas, tables, and columns. Useful for discovering table structures before writing queries. Filter by schema or table name to reduce output.',
  summary: 'Get database schema (tables and columns) for a connection',
  icon: 'table',
  group: 'Connections',
  input: z.object({
    connectionId: z.string().describe('Connection ID (from list_connections)'),
    schemaFilter: z.string().optional().describe('Filter to schemas containing this string (case-insensitive)'),
    tableFilter: z.string().optional().describe('Filter to tables containing this string (case-insensitive)'),
  }),
  output: z.object({
    schemas: z.array(dbSchemaSchema).describe('Database schemas with tables and columns'),
  }),
  handle: async params => {
    const data = await api<SchemaResponse>(`/connections/${params.connectionId}/schema`);
    let schemas = (data.schemas ?? []).map(mapDbSchema);

    if (params.schemaFilter) {
      const filter = params.schemaFilter.toLowerCase();
      schemas = schemas.filter(s => s.name.toLowerCase().includes(filter));
    }

    if (params.tableFilter) {
      const filter = params.tableFilter.toLowerCase();
      schemas = schemas
        .map(s => ({
          ...s,
          tables: s.tables.filter(t => t.name.toLowerCase().includes(filter)),
        }))
        .filter(s => s.tables.length > 0);
    }

    return { schemas };
  },
});
