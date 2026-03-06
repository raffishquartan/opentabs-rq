import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { getOrgSlug, sentryApi } from '../sentry-api.js';
import { mapTeam, teamSchema } from './schemas.js';

export const listTeams = defineTool({
  name: 'list_teams',
  displayName: 'List Teams',
  description:
    'List all teams in the current Sentry organization. Returns team name, slug, member count, and creation date.',
  summary: 'List teams in the organization',
  icon: 'users',
  group: 'Teams',
  input: z.object({
    cursor: z.string().optional().describe('Pagination cursor from a previous response'),
  }),
  output: z.object({
    teams: z.array(teamSchema).describe('List of teams'),
  }),
  handle: async params => {
    const orgSlug = getOrgSlug();
    const data = await sentryApi<Record<string, unknown>[]>(`/organizations/${orgSlug}/teams/`, {
      query: { cursor: params.cursor },
    });
    return {
      teams: (Array.isArray(data) ? data : []).map(t => mapTeam(t)),
    };
  },
});
