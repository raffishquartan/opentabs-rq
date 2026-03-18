import { OpenTabsPlugin } from '@opentabs-dev/plugin-sdk';
import type { ConfigSchema, ToolDefinition } from '@opentabs-dev/plugin-sdk';
import { isAuthenticated, waitForAuth } from './grafana-api.js';

// Account
import { getCurrentUser } from './tools/get-current-user.js';
import { getUserPreferences } from './tools/get-user-preferences.js';

// Organization
import { getOrganization } from './tools/get-organization.js';
import { listOrgUsers } from './tools/list-org-users.js';
import { listOrgQuotas } from './tools/list-org-quotas.js';

// Dashboards
import { searchDashboards } from './tools/search-dashboards.js';
import { getDashboard } from './tools/get-dashboard.js';
import { createDashboard } from './tools/create-dashboard.js';
import { updateDashboard } from './tools/update-dashboard.js';
import { deleteDashboard } from './tools/delete-dashboard.js';
import { starDashboard } from './tools/star-dashboard.js';
import { unstarDashboard } from './tools/unstar-dashboard.js';

// Folders
import { listFolders } from './tools/list-folders.js';
import { getFolder } from './tools/get-folder.js';
import { createFolder } from './tools/create-folder.js';
import { deleteFolder } from './tools/delete-folder.js';

// Data Sources
import { listDatasources } from './tools/list-datasources.js';
import { getDatasource } from './tools/get-datasource.js';

// Alerting
import { listAlertRules } from './tools/list-alert-rules.js';
import { getAlertRule } from './tools/get-alert-rule.js';
import { deleteAlertRule } from './tools/delete-alert-rule.js';
import { listContactPoints } from './tools/list-contact-points.js';

// Annotations
import { listAnnotations } from './tools/list-annotations.js';
import { createAnnotation } from './tools/create-annotation.js';
import { deleteAnnotation } from './tools/delete-annotation.js';

// Teams
import { searchTeams } from './tools/search-teams.js';
import { listTeamMembers } from './tools/list-team-members.js';

// Service Accounts
import { listServiceAccounts } from './tools/list-service-accounts.js';

// Snapshots
import { listSnapshots } from './tools/list-snapshots.js';

class GrafanaPlugin extends OpenTabsPlugin {
  readonly name = 'grafana';
  readonly description =
    'OpenTabs plugin for Grafana — manage dashboards, folders, data sources, alerts, annotations, teams, and more.';
  override readonly displayName = 'Grafana';
  readonly urlPatterns: string[] = [];
  override readonly configSchema: ConfigSchema = {
    instanceUrl: {
      type: 'url' as const,
      label: 'Grafana URL',
      description: 'The URL of your Grafana instance (e.g., https://myorg.grafana.net or https://grafana.internal)',
      required: true,
      placeholder: 'https://myorg.grafana.net',
    },
  };

  readonly tools: ToolDefinition[] = [
    // Account
    getCurrentUser,
    getUserPreferences,
    // Organization
    getOrganization,
    listOrgUsers,
    listOrgQuotas,
    // Dashboards
    searchDashboards,
    getDashboard,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    starDashboard,
    unstarDashboard,
    // Folders
    listFolders,
    getFolder,
    createFolder,
    deleteFolder,
    // Data Sources
    listDatasources,
    getDatasource,
    // Alerting
    listAlertRules,
    getAlertRule,
    deleteAlertRule,
    listContactPoints,
    // Annotations
    listAnnotations,
    createAnnotation,
    deleteAnnotation,
    // Teams
    searchTeams,
    listTeamMembers,
    // Service Accounts
    listServiceAccounts,
    // Snapshots
    listSnapshots,
  ];

  async isReady(): Promise<boolean> {
    if (isAuthenticated()) return true;
    return waitForAuth();
  }
}

export default new GrafanaPlugin();
