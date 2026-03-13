# eBay

OpenTabs plugin for eBay — gives AI agents access to eBay through your authenticated browser session.

## Install

```bash
opentabs plugin install ebay
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-ebay
```

## Setup

1. Open [ebay.com](https://www.ebay.com) in Chrome and log in
2. Open the OpenTabs side panel — the eBay plugin should appear as **ready**

## Tools (8)

### Account (1)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get the authenticated eBay user profile | Read |

### Search (2)

| Tool | Description | Type |
|---|---|---|
| `search_items` | Search for items on eBay | Read |
| `search_suggestions` | Get autocomplete suggestions for search | Read |

### Items (1)

| Tool | Description | Type |
|---|---|---|
| `get_item` | Get details for an eBay item listing | Read |

### Watchlist (2)

| Tool | Description | Type |
|---|---|---|
| `get_watchlist` | Get your eBay watchlist items | Read |
| `watch_item` | Add an item to your eBay watchlist | Write |

### Users (1)

| Tool | Description | Type |
|---|---|---|
| `get_seller_profile` | Get an eBay seller's public profile | Read |

### Browse (1)

| Tool | Description | Type |
|---|---|---|
| `get_deals` | Get current eBay daily deals | Read |

## How It Works

This plugin runs inside your eBay tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
