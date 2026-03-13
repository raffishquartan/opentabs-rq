# Expedia

OpenTabs plugin for Expedia — gives AI agents access to Expedia through your authenticated browser session.

## Install

```bash
opentabs plugin install expedia
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-expedia
```

## Setup

1. Open [expedia.com](https://www.expedia.com) in Chrome and log in
2. Open the OpenTabs side panel — the Expedia plugin should appear as **ready**

## Tools (12)

### Account (2)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get the signed-in user profile | Read |
| `navigate_to_account` | Open the account settings page | Write |

### Search (1)

| Tool | Description | Type |
|---|---|---|
| `search_locations` | Search for destinations by name | Read |

### Hotels (2)

| Tool | Description | Type |
|---|---|---|
| `search_hotels` | Search for hotels by destination and dates | Read |
| `navigate_to_hotel` | Open a hotel detail page in the browser | Write |

### Flights (1)

| Tool | Description | Type |
|---|---|---|
| `search_flights` | Navigate to flight search results | Read |

### Cars (1)

| Tool | Description | Type |
|---|---|---|
| `search_car_rentals` | Navigate to car rental search results | Read |

### Packages (1)

| Tool | Description | Type |
|---|---|---|
| `search_packages` | Navigate to vacation packages search | Read |

### Activities (1)

| Tool | Description | Type |
|---|---|---|
| `search_activities` | Navigate to activities search results | Read |

### Cruises (1)

| Tool | Description | Type |
|---|---|---|
| `search_cruises` | Navigate to cruise search results | Read |

### Trips (2)

| Tool | Description | Type |
|---|---|---|
| `list_trips` | List booked or planned trips | Read |
| `navigate_to_trips` | Open the trips/bookings page | Write |

## How It Works

This plugin runs inside your Expedia tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
