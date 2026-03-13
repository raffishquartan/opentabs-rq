# Amplitude

OpenTabs plugin for Amplitude analytics — gives AI agents access to Amplitude through your authenticated browser session.

## Install

```bash
opentabs plugin install amplitude
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-amplitude
```

## Setup

1. Open [app.amplitude.com](https://app.amplitude.com) in Chrome and log in
2. Open the OpenTabs side panel — the Amplitude plugin should appear as **ready**

## Tools (15)

### Account (3)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get the authenticated user profile | Read |
| `get_org_data` | Get org data with apps, user, and plan info | Read |
| `list_orgs` | List all organizations | Read |

### Users (1)

| Tool | Description | Type |
|---|---|---|
| `list_users` | List organization members | Read |

### Spaces (2)

| Tool | Description | Type |
|---|---|---|
| `get_personal_space` | Get the user's personal workspace | Read |
| `list_spaces` | List all team spaces | Read |

### Search (1)

| Tool | Description | Type |
|---|---|---|
| `search_content` | Search charts, dashboards, cohorts, and more | Read |

### Analytics (2)

| Tool | Description | Type |
|---|---|---|
| `list_events` | Get event properties for an event type | Read |
| `get_color_palettes` | Get chart color palettes | Read |

### Usage (3)

| Tool | Description | Type |
|---|---|---|
| `get_event_volumes` | Get monthly event volume metrics | Read |
| `get_mtu_volumes` | Get monthly tracked user volume metrics | Read |
| `get_session_replay_volumes` | Get monthly session replay volume metrics | Read |

### Billing (2)

| Tool | Description | Type |
|---|---|---|
| `get_entitlements` | Get active org entitlements and quotas | Read |
| `get_report_quota` | Get report quota usage and limits | Read |

### Permissions (1)

| Tool | Description | Type |
|---|---|---|
| `check_permissions` | Check user RBAC permissions | Read |

## How It Works

This plugin runs inside your Amplitude tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
