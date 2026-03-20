# Snowflake

OpenTabs plugin for Snowflake — run SQL queries, browse database schemas, and manage worksheets — gives AI agents access to Snowflake through your authenticated browser session.

## Install

```bash
opentabs plugin install snowflake
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-snowflake
```

## Setup

1. Open [app.snowflake.com](https://app.snowflake.com) in Chrome and log in
2. Open the OpenTabs side panel — the Snowflake plugin should appear as **ready**

## Tools (14)

### Account (2)

| Tool | Description | Type |
|---|---|---|
| `get_session` | Get current session context | Read |
| `diagnose` | Diagnose Snowflake connection state | Write |

### Queries (2)

| Tool | Description | Type |
|---|---|---|
| `run_query` | Execute a SQL query and return results | Write |
| `get_query` | Fetch additional result chunks for a query | Read |

### Schema (7)

| Tool | Description | Type |
|---|---|---|
| `browse_data` | List accessible databases | Read |
| `search_data` | Search databases by name pattern | Read |
| `list_schemas` | List schemas in a database | Read |
| `list_tables` | List tables in a schema | Read |
| `list_warehouses` | List available warehouses | Read |
| `get_object_details` | Get column details for a table or view | Read |
| `list_shared_objects` | List data shares | Read |

### Worksheets (2)

| Tool | Description | Type |
|---|---|---|
| `list_worksheets` | List saved worksheets | Read |
| `list_folders` | List worksheet folders | Read |

### Dashboards (1)

| Tool | Description | Type |
|---|---|---|
| `list_dashboards` | List Snowflake dashboards | Read |

## How It Works

This plugin runs inside your Snowflake tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
