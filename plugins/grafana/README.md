# Grafana

OpenTabs plugin for Grafana — gives AI agents access to Grafana through your authenticated browser session.

## Install

```bash
opentabs plugin install grafana
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-grafana
```

## Setup

1. Configure the plugin with `opentabs plugin configure grafana`
2. Open your configured URL in Chrome and log in
3. Open the OpenTabs side panel — the Grafana plugin should appear as **ready**

## Configuration

Configure settings via `opentabs plugin configure grafana` or the side panel.

| Setting | Type | Required | Description |
|---|---|---|---|
| `instanceUrl` | url | Yes | The URL of your Grafana instance (e.g., https://myorg.grafana.net or https://grafana.internal) |

## Tools (29)

### Account (2)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get your Grafana user profile | Read |
| `get_user_preferences` | Get your Grafana preferences | Read |

### Organization (3)

| Tool | Description | Type |
|---|---|---|
| `get_organization` | Get organization details | Read |
| `list_org_users` | List organization members | Read |
| `list_org_quotas` | List organization resource quotas | Read |

### Dashboards (7)

| Tool | Description | Type |
|---|---|---|
| `search_dashboards` | Search dashboards and folders | Read |
| `get_dashboard` | Get dashboard by UID | Read |
| `create_dashboard` | Create a new dashboard | Write |
| `update_dashboard` | Update a dashboard | Write |
| `delete_dashboard` | Delete a dashboard | Write |
| `star_dashboard` | Star a dashboard | Write |
| `unstar_dashboard` | Unstar a dashboard | Write |

### Folders (4)

| Tool | Description | Type |
|---|---|---|
| `list_folders` | List all folders | Read |
| `get_folder` | Get a folder by UID | Read |
| `create_folder` | Create a new folder | Write |
| `delete_folder` | Delete a folder by UID | Write |

### Data Sources (2)

| Tool | Description | Type |
|---|---|---|
| `list_datasources` | List all data sources | Read |
| `get_datasource` | Get a data source by UID | Read |

### Alerting (4)

| Tool | Description | Type |
|---|---|---|
| `list_alert_rules` | List all alert rules | Read |
| `get_alert_rule` | Get an alert rule by UID | Read |
| `delete_alert_rule` | Delete an alert rule by UID | Write |
| `list_contact_points` | List all contact points | Read |

### Annotations (3)

| Tool | Description | Type |
|---|---|---|
| `list_annotations` | List annotations with optional filters | Read |
| `create_annotation` | Create a new annotation | Write |
| `delete_annotation` | Delete an annotation by ID | Write |

### Teams (2)

| Tool | Description | Type |
|---|---|---|
| `search_teams` | Search teams by name | Read |
| `list_team_members` | List members of a team | Read |

### Service Accounts (1)

| Tool | Description | Type |
|---|---|---|
| `list_service_accounts` | List service accounts | Read |

### Snapshots (1)

| Tool | Description | Type |
|---|---|---|
| `list_snapshots` | List all dashboard snapshots | Read |

## How It Works

This plugin runs inside your Grafana tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
