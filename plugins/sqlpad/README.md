# SQLPad

OpenTabs plugin for SQLPad — run SQL queries, browse database schemas, and manage saved queries — gives AI agents access to SQLPad through your authenticated browser session.

## Install

```bash
opentabs plugin install sqlpad
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-sqlpad
```

## Setup

1. Configure the plugin with `opentabs plugin configure sqlpad`
2. Open your configured URL in Chrome and log in
3. Open the OpenTabs side panel — the SQLPad plugin should appear as **ready**

## Configuration

Configure settings via `opentabs plugin configure sqlpad` or the side panel.

| Setting | Type | Required | Description |
|---|---|---|---|
| `instanceUrl` | url | Yes | The URL of your SQLPad instance (e.g., https://sqlpad.example.com) |

## Tools (12)

### Account (2)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get current user profile | Read |
| `list_users` | List all users | Read |

### Connections (2)

| Tool | Description | Type |
|---|---|---|
| `list_connections` | List all database connections | Read |
| `get_schema` | Get database schema (tables and columns) for a connection | Read |

### Queries (1)

| Tool | Description | Type |
|---|---|---|
| `run_query` | Execute a SQL query and return results | Write |

### Saved Queries (6)

| Tool | Description | Type |
|---|---|---|
| `list_saved_queries` | List all saved queries | Read |
| `get_saved_query` | Get saved query details by ID | Read |
| `create_saved_query` | Save a new SQL query | Write |
| `update_saved_query` | Update a saved query | Write |
| `delete_saved_query` | Delete a saved query | Write |
| `list_tags` | List all query tags | Read |

### History (1)

| Tool | Description | Type |
|---|---|---|
| `list_query_history` | List recent query execution history | Read |

## How It Works

This plugin runs inside your SQLPad tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
