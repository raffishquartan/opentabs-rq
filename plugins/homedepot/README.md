# Home Depot

OpenTabs plugin for The Home Depot — gives AI agents access to Home Depot through your authenticated browser session.

## Install

```bash
opentabs plugin install homedepot
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-homedepot
```

## Setup

1. Open [homedepot.com](https://www.homedepot.com) in Chrome and log in
2. Open the OpenTabs side panel — the Home Depot plugin should appear as **ready**

## Tools (10)

### Products (3)

| Tool | Description | Type |
|---|---|---|
| `search_products` | Search Home Depot products by keyword | Read |
| `get_product` | Get product details by item ID | Read |
| `navigate_to_product` | Navigate to a product page | Write |

### Stores (2)

| Tool | Description | Type |
|---|---|---|
| `search_stores` | Find stores near a ZIP code | Read |
| `get_store_context` | Get current store and delivery info | Read |

### Cart (4)

| Tool | Description | Type |
|---|---|---|
| `get_cart` | View shopping cart contents | Read |
| `get_saved_items` | Get Save For Later items | Read |
| `add_to_cart` | Add a product to cart | Write |
| `navigate_to_checkout` | Navigate to the checkout page | Write |

### Account (1)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get current user profile | Read |

## How It Works

This plugin runs inside your Home Depot tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
