import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { api } from '../sqlpad-api.js';

export const listTags = defineTool({
  name: 'list_tags',
  displayName: 'List Tags',
  description: 'List all tags used across saved queries. Tags help organize and categorize queries.',
  summary: 'List all query tags',
  icon: 'tag',
  group: 'Saved Queries',
  input: z.object({}),
  output: z.object({
    tags: z.array(z.string()).describe('Tag names'),
  }),
  handle: async () => {
    const data = await api<string[]>('/tags');
    return { tags: data ?? [] };
  },
});
