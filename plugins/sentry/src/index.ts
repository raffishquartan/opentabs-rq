import { OpenTabsPlugin } from '@opentabs-dev/plugin-sdk';
import type { ToolDefinition } from '@opentabs-dev/plugin-sdk';
import { isSentryAuthenticated, waitForSentryAuth } from './sentry-api.js';
import { getEvent } from './tools/get-event.js';
import { getIssue } from './tools/get-issue.js';
import { getOrganization } from './tools/get-organization.js';
import { getProject } from './tools/get-project.js';
import { listAlerts } from './tools/list-alerts.js';
import { listIssueEvents } from './tools/list-issue-events.js';
import { listMembers } from './tools/list-members.js';
import { listOrganizations } from './tools/list-organizations.js';
import { listProjects } from './tools/list-projects.js';
import { listReleases } from './tools/list-releases.js';
import { listTeams } from './tools/list-teams.js';
import { searchIssues } from './tools/search-issues.js';
import { updateIssue } from './tools/update-issue.js';

class SentryPlugin extends OpenTabsPlugin {
  readonly name = 'sentry';
  readonly description = 'OpenTabs plugin for Sentry';
  override readonly displayName = 'Sentry';
  readonly urlPatterns = ['*://*.sentry.io/*'];
  readonly tools: ToolDefinition[] = [
    // Issues
    searchIssues,
    getIssue,
    updateIssue,
    listIssueEvents,
    getEvent,
    // Projects
    listProjects,
    getProject,
    // Organizations
    listOrganizations,
    getOrganization,
    listMembers,
    // Teams
    listTeams,
    // Releases
    listReleases,
    // Alerts
    listAlerts,
  ];

  async isReady(): Promise<boolean> {
    if (isSentryAuthenticated()) return true;
    return waitForSentryAuth();
  }
}

export default new SentryPlugin();
