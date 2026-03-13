# Zendesk

OpenTabs plugin for Zendesk — gives AI agents access to Zendesk through your authenticated browser session.

## Install

```bash
opentabs plugin install zendesk
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-zendesk
```

## Setup

1. Open [zendesk.com](https://zendesk.com) in Chrome and log in
2. Open the OpenTabs side panel — the Zendesk plugin should appear as **ready**

## Tools (17)

### Tickets (7)

| Tool | Description | Type |
|---|---|---|
| `list_tickets` | List support tickets with pagination and sorting | Read |
| `get_ticket` | Get a single ticket by ID | Read |
| `create_ticket` | Create a new support ticket | Write |
| `update_ticket` | Update an existing ticket | Write |
| `delete_ticket` | Delete a ticket permanently | Write |
| `list_ticket_comments` | List comments on a ticket | Read |
| `add_ticket_comment` | Add a comment to a ticket | Write |

### Users (3)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get current user profile | Read |
| `get_user` | Get a user by ID | Read |
| `list_users` | List users with optional role filter | Read |

### Organizations (2)

| Tool | Description | Type |
|---|---|---|
| `list_organizations` | List organizations | Read |
| `get_organization` | Get an organization by ID | Read |

### Groups (1)

| Tool | Description | Type |
|---|---|---|
| `list_groups` | List groups | Read |

### Search (1)

| Tool | Description | Type |
|---|---|---|
| `search` | Search tickets, users, and organizations | Write |

### Views (2)

| Tool | Description | Type |
|---|---|---|
| `list_views` | List views | Read |
| `get_view_tickets` | Get tickets in a view | Read |

### Tags (1)

| Tool | Description | Type |
|---|---|---|
| `list_tags` | List tags | Read |

## How It Works

This plugin runs inside your Zendesk tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
