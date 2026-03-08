import { ToolError, defineTool } from '@opentabs-dev/plugin-sdk';
import { z } from 'zod';
import { getAtokHeader } from '../cloudflare-api.js';

export const graphqlQuery = defineTool({
  name: 'graphql_query',
  displayName: 'GraphQL Query',
  description:
    'Execute a GraphQL query against the Cloudflare Analytics API. Use this for analytics data, traffic stats, firewall events, DNS analytics, and other metrics not available via REST endpoints. Common query fields: httpRequests1dGroups (daily HTTP stats), firewallEventsAdaptiveGroups (WAF events), httpRequestsAdaptiveGroups (detailed traffic). Pass the zone tag as a filter. Example query: { viewer { zones(filter: { zoneTag: "ZONE_ID" }) { httpRequests1dGroups(limit: 7, filter: { date_geq: "2026-03-01" }) { dimensions { date } sum { requests pageViews } } } } }',
  summary: 'Execute a GraphQL analytics query',
  icon: 'bar-chart-3',
  group: 'Analytics',
  input: z.object({
    query: z.string().describe('GraphQL query string'),
    variables: z.record(z.string(), z.unknown()).optional().describe('GraphQL variables (optional)'),
  }),
  output: z.object({
    data: z.unknown().describe('GraphQL response data'),
    errors: z.array(z.unknown()).nullable().describe('GraphQL errors, or null if successful'),
  }),
  handle: async params => {
    const atok = getAtokHeader();
    if (!atok) throw ToolError.auth('Not authenticated — please log in to Cloudflare.');

    const body: Record<string, unknown> = { query: params.query };
    if (params.variables) body.variables = params.variables;

    // GraphQL endpoint returns { data, errors } directly — not the standard Cloudflare envelope.
    const response = await fetch('/api/v4/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-atok': atok },
      body: JSON.stringify(body),
      credentials: 'same-origin',
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const errorBody = (await response.text().catch(() => '')).substring(0, 512);
      if (response.status === 401 || response.status === 403) {
        throw ToolError.auth(`Auth error (${response.status}): ${errorBody}`);
      }
      throw ToolError.internal(`GraphQL error (${response.status}): ${errorBody}`);
    }

    const result = (await response.json()) as { data?: unknown; errors?: unknown[] };
    return {
      data: result.data ?? null,
      errors: Array.isArray(result.errors) ? result.errors : null,
    };
  },
});
