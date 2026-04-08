# Linear

OpenTabs plugin for Linear — gives AI agents access to Linear through your authenticated browser session.

## Install

```bash
opentabs plugin install linear
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-linear
```

## Setup

1. Open [linear.app](https://linear.app) in Chrome and log in
2. Open the OpenTabs side panel — the Linear plugin should appear as **ready**

## Tools (59)

### Issues (22)

| Tool | Description | Type |
|---|---|---|
| `search_issues` | Search and filter issues | Read |
| `get_issue` | Get details of a single issue | Read |
| `create_issue` | Create a new issue in Linear | Write |
| `update_issue` | Update an existing issue | Write |
| `delete_issue` | Move an issue to the trash | Write |
| `archive_issue` | Archive an issue | Write |
| `batch_update_issues` | Update multiple issues at once | Write |
| `list_sub_issues` | List sub-issues of an issue | Read |
| `list_issue_history` | List issue change history | Read |
| `list_issue_relations` | List issue dependencies and relations | Read |
| `create_issue_relation` | Create a relation between two issues | Write |
| `delete_issue_relation` | Delete a relation between two issues | Write |
| `add_issue_label` | Add a label to an issue | Write |
| `remove_issue_label` | Remove a label from an issue | Write |
| `add_issue_subscriber` | Subscribe a user to an issue | Write |
| `remove_issue_subscriber` | Unsubscribe a user from an issue | Write |
| `set_issue_cycle` | Assign an issue to a cycle/sprint | Write |
| `move_issue_to_project` | Move an issue between projects | Write |
| `list_attachments` | List attachments on an issue | Read |
| `get_attachment` | Get details of a single attachment | Read |
| `create_attachment` | Link a URL to an issue | Write |
| `delete_attachment` | Delete an attachment | Write |

### Comments (4)

| Tool | Description | Type |
|---|---|---|
| `create_comment` | Add a comment to an issue | Write |
| `update_comment` | Update a comment | Write |
| `delete_comment` | Delete a comment | Write |
| `list_comments` | List comments on an issue | Read |

### Projects (12)

| Tool | Description | Type |
|---|---|---|
| `list_projects` | List all projects | Read |
| `get_project` | Get details of a project | Read |
| `create_project` | Create a new project | Write |
| `update_project` | Update a project | Write |
| `list_project_labels` | List labels on a project | Read |
| `list_project_updates` | List project status updates | Read |
| `create_project_update` | Post a project status update | Write |
| `delete_project_update` | Delete a project status update | Write |
| `list_milestones` | List project milestones | Read |
| `get_milestone` | Get details of a single milestone | Read |
| `create_milestone` | Create a new project milestone | Write |
| `update_milestone` | Update a project milestone | Write |

### Initiatives (4)

| Tool | Description | Type |
|---|---|---|
| `list_initiatives` | List initiatives | Read |
| `get_initiative` | Get details of a single initiative | Read |
| `create_initiative` | Create a new initiative | Write |
| `update_initiative` | Update an existing initiative | Write |

### Documents (4)

| Tool | Description | Type |
|---|---|---|
| `list_documents` | List documents | Read |
| `get_document` | Get details of a single document | Read |
| `create_document` | Create a new document | Write |
| `update_document` | Update an existing document | Write |

### Teams & Users (6)

| Tool | Description | Type |
|---|---|---|
| `list_teams` | List teams in the workspace | Read |
| `get_team` | Get details of a single team | Read |
| `list_team_members` | List members of a team | Read |
| `list_users` | List all users in the organization | Read |
| `get_user` | Get details of a single user | Read |
| `get_viewer` | Get the current user's profile | Read |

### Workflow (6)

| Tool | Description | Type |
|---|---|---|
| `list_workflow_states` | List workflow states for a team | Read |
| `list_labels` | List all issue labels | Read |
| `update_label` | Update a label | Write |
| `delete_label` | Delete a label | Write |
| `list_cycles` | List cycles for a team | Read |
| `get_cycle` | Get details of a single cycle | Read |

### Labels (1)

| Tool | Description | Type |
|---|---|---|
| `create_label` | Create a new label | Write |

## How It Works

This plugin runs inside your Linear tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
