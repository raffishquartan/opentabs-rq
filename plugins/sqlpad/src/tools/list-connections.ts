import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { api } from '../sqlpad-api.js';
import { type RawConnection, connectionSchema, mapConnection } from './schemas.js';

export const listConnections = defineTool({
  name: 'list_connections',
  displayName: 'List Connections',
  description:
    'List all available database connections. Returns connection IDs, names, drivers, and configuration. Use the connection ID when running queries or fetching schemas.',
  summary: 'List all database connections',
  icon: 'database',
  group: 'Connections',
  input: z.object({}),
  output: z.object({
    connections: z.array(connectionSchema).describe('Available database connections'),
  }),
  handle: async () => {
    const data = await api<RawConnection[]>('/connections');
    return { connections: data.map(mapConnection) };
  },
});
