# Google Docs

OpenTabs plugin for Google Docs — gives AI agents access to Google Docs through your authenticated browser session.

## Install

```bash
opentabs plugin install google-docs
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-google-docs
```

## Setup

1. Open [docs.google.com](https://docs.google.com/document/) in Chrome and log in
2. Open the OpenTabs side panel — the Google Docs plugin should appear as **ready**

## Tools (19)

### Account (1)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get the current Google user profile | Read |

### Documents (9)

| Tool | Description | Type |
|---|---|---|
| `get_current_document` | Get the document open in the editor | Read |
| `get_document` | Get document metadata and tabs | Read |
| `get_document_text` | Read the plain text of a document | Read |
| `create_document` | Create a new Google Doc | Write |
| `copy_document` | Copy a Google Doc | Write |
| `update_document_title` | Rename a Google Doc | Write |
| `trash_document` | Move a document to the trash | Write |
| `restore_document` | Restore a trashed document | Write |
| `delete_document` | Permanently delete a document | Write |

### Library (2)

| Tool | Description | Type |
|---|---|---|
| `list_recent_documents` | List recently viewed Google Docs | Read |
| `search_documents` | Search Google Docs by title or content | Read |

### Comments (7)

| Tool | Description | Type |
|---|---|---|
| `list_comments` | List comments on a document | Read |
| `create_comment` | Add a comment to a document | Write |
| `reply_to_comment` | Reply to a comment thread | Write |
| `resolve_comment` | Resolve a comment thread | Write |
| `reopen_comment` | Reopen a resolved comment thread | Write |
| `delete_comment` | Delete a comment thread | Write |
| `delete_reply` | Delete a reply from a comment thread | Write |

## How It Works

This plugin runs inside your Google Docs tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
