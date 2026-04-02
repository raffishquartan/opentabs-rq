# Carta

OpenTabs plugin for Carta — gives AI agents access to Carta through your authenticated browser session.

## Install

```bash
opentabs plugin install carta
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-carta
```

## Setup

1. Open [app.carta.com](https://app.carta.com) in Chrome and log in
2. Open the OpenTabs side panel — the Carta plugin should appear as **ready**

## Tools

### User & Account (2)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get the authenticated Carta user profile | Read |
| `list_accounts` | List all Carta accounts the user has access to | Read |

### Portfolio (4)

| Tool | Description | Type |
|---|---|---|
| `list_companies` | List all companies in the portfolio | Read |
| `get_company_profile` | Get detailed profile for a company | Read |
| `get_entities` | Get detailed entity information for all companies | Read |
| `check_favourite` | Check whether a company is marked as a favourite | Read |

### Holdings (9)

| Tool | Description | Type |
|---|---|---|
| `get_holdings_dashboard` | Get a summary dashboard for holdings in a company | Read |
| `list_options` | List all stock option grants (ISOs, NSOs) | Read |
| `list_shares` | List all share certificates | Read |
| `list_rsus` | List all restricted stock unit (RSU) grants | Read |
| `list_equity_grants` | List all equity grants (unified view across types) | Read |
| `list_convertibles` | List all convertible instruments (notes, SAFEs) | Read |
| `list_warrants` | List all warrant holdings | Read |
| `list_sars` | List all stock appreciation rights (SARs) | Read |
| `list_pius` | List all profits interest units (PIUs) | Read |

### Tax & Documents (3)

| Tool | Description | Type |
|---|---|---|
| `get_tax_documents` | Get tax documents (1099s, K-1s, etc.) | Read |
| `get_qsbs_eligibility` | Get QSBS eligible sold shares for a company | Read |
| `get_witness_signatures` | Get pending witness signature requests | Read |

### Tasks & Communication (2)

| Tool | Description | Type |
|---|---|---|
| `get_tasks` | Get pending tasks requiring action | Read |
| `get_inbox_count` | Get unread message count in the inbox | Read |

## How It Works

This plugin runs inside your Carta tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
