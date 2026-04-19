# NotebookLM

OpenTabs plugin for Google NotebookLM — gives AI agents access to NotebookLM through your authenticated browser session.

## Install

```bash
opentabs plugin install notebooklm
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-notebooklm
```

## Setup

1. Open [notebooklm.google.com](https://notebooklm.google.com) in Chrome and log in
2. Open the OpenTabs side panel — the NotebookLM plugin should appear as **ready**

## Tools (18)

### Notebooks (8)

| Tool | Description | Type |
|---|---|---|
| `list_notebooks` | List recent notebooks | Read |
| `get_notebook` | Get notebook details | Read |
| `create_notebook` | Create a new notebook | Write |
| `delete_notebook` | Delete notebooks | Write |
| `rename_notebook` | Rename a notebook | Write |
| `copy_notebook` | Copy a notebook | Write |
| `get_project_details` | Get notebook sharing details | Read |
| `navigate_to_notebook` | Open a notebook | Write |

### Notes (4)

| Tool | Description | Type |
|---|---|---|
| `get_notes` | Get notes in a notebook | Read |
| `create_note` | Create a note | Write |
| `update_note` | Update a note | Write |
| `delete_notes` | Delete notes | Write |

### Chat (2)

| Tool | Description | Type |
|---|---|---|
| `list_chat_sessions` | List chat sessions | Read |
| `get_notebook_guide` | Get AI summary of sources | Read |

### Sources (3)

| Tool | Description | Type |
|---|---|---|
| `add_source_url` | Add a website source | Write |
| `add_source_text` | Add text as a source | Write |
| `delete_sources` | Delete sources | Write |

### Account (1)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get current user info | Read |

## How It Works

This plugin runs inside your NotebookLM tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
