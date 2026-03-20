import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { api } from '../sqlpad-api.js';

export const deleteSavedQuery = defineTool({
  name: 'delete_saved_query',
  displayName: 'Delete Saved Query',
  description: 'Permanently delete a saved query by ID. This action cannot be undone.',
  summary: 'Delete a saved query',
  icon: 'trash-2',
  group: 'Saved Queries',
  input: z.object({
    queryId: z.string().describe('Saved query ID to delete'),
  }),
  output: z.object({
    success: z.boolean().describe('Whether the operation succeeded'),
  }),
  handle: async params => {
    await api(`/queries/${params.queryId}`, { method: 'DELETE' });
    return { success: true };
  },
});
