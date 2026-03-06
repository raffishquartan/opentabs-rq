import { defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { getOrgSlug, sentryApi } from '../sentry-api.js';
import { mapRelease, releaseSchema } from './schemas.js';

export const listReleases = defineTool({
  name: 'list_releases',
  displayName: 'List Releases',
  description:
    'List releases for the current Sentry organization. Optionally filter by project slug. ' +
    'Returns version, release date, new issue count, commit count, and deploy count.',
  summary: 'List releases with optional project filter',
  icon: 'tag',
  group: 'Releases',
  input: z.object({
    project_slug: z.string().optional().describe('Filter releases by project slug'),
    cursor: z.string().optional().describe('Pagination cursor from a previous response'),
  }),
  output: z.object({
    releases: z.array(releaseSchema).describe('List of releases'),
  }),
  handle: async params => {
    const orgSlug = getOrgSlug();
    const query: Record<string, string | number | boolean | undefined> = {
      cursor: params.cursor,
    };
    if (params.project_slug) {
      query.project = params.project_slug;
    }
    const data = await sentryApi<Record<string, unknown>[]>(`/organizations/${orgSlug}/releases/`, { query });
    return {
      releases: (Array.isArray(data) ? data : []).map(r => mapRelease(r)),
    };
  },
});
