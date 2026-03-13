# ClickUp

OpenTabs plugin for ClickUp — gives AI agents access to ClickUp through your authenticated browser session.

## Install

```bash
opentabs plugin install clickup
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-clickup
```

## Setup

1. Open [app.clickup.com](https://app.clickup.com) in Chrome and log in
2. Open the OpenTabs side panel — the ClickUp plugin should appear as **ready**

## Tools (11)

### Users (1)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get the authenticated user profile | Read |

### Workspaces (2)

| Tool | Description | Type |
|---|---|---|
| `get_workspace` | Get workspace details | Read |
| `get_workspace_members` | List workspace members | Read |

### Spaces (2)

| Tool | Description | Type |
|---|---|---|
| `get_spaces` | List spaces in a workspace | Read |
| `get_space` | Get space details by ID | Read |

### Folders (2)

| Tool | Description | Type |
|---|---|---|
| `get_folders` | List folders in a space | Read |
| `get_folder` | Get folder details by ID | Read |

### Lists (2)

| Tool | Description | Type |
|---|---|---|
| `get_lists` | List lists in a folder | Read |
| `get_list` | Get list details by ID | Read |

### Goals (1)

| Tool | Description | Type |
|---|---|---|
| `get_goals` | List workspace goals | Read |

### Custom Fields (1)

| Tool | Description | Type |
|---|---|---|
| `get_custom_fields` | List workspace custom fields | Read |

## How It Works

This plugin runs inside your ClickUp tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
