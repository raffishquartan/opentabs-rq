# Microsoft Word

OpenTabs plugin for Microsoft Word Online — gives AI agents access to Microsoft Word through your authenticated browser session.

## Install

```bash
opentabs plugin install microsoft-word
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-microsoft-word
```

## Setup

1. Open [word.cloud.microsoft](https://word.cloud.microsoft) in Chrome and log in
2. Open the OpenTabs side panel — the Microsoft Word plugin should appear as **ready**

## Tools (27)

### Account (1)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get the current user profile | Read |

### Drive (1)

| Tool | Description | Type |
|---|---|---|
| `get_drive` | Get OneDrive details | Read |

### Documents (6)

| Tool | Description | Type |
|---|---|---|
| `get_active_document` | Get the currently open document | Read |
| `get_document_text` | Extract text from a Word document | Read |
| `create_document` | Create a new Word document with text | Write |
| `update_document` | Replace all text in a Word document | Write |
| `append_to_document` | Append paragraphs to a Word document | Write |
| `replace_text_in_document` | Find and replace text in a Word document | Write |

### Files (14)

| Tool | Description | Type |
|---|---|---|
| `get_file_content` | Read text content of a file | Read |
| `list_recent_documents` | List recent documents | Read |
| `list_children` | List files and folders | Read |
| `get_item` | Get file or folder details | Read |
| `search_files` | Search files and folders | Read |
| `create_folder` | Create a folder | Write |
| `upload_file` | Upload a text file to OneDrive | Write |
| `update_file_content` | Update a file's content | Write |
| `rename_item` | Rename a file or folder | Write |
| `move_item` | Move a file or folder | Write |
| `copy_item` | Copy a file or folder | Write |
| `delete_item` | Delete a file or folder | Write |
| `list_shared_with_me` | List files shared with me | Read |
| `get_preview_url` | Get a document preview URL | Read |

### Sharing (3)

| Tool | Description | Type |
|---|---|---|
| `create_sharing_link` | Create a sharing link for a file or folder | Write |
| `list_permissions` | List sharing permissions | Read |
| `delete_permission` | Remove a sharing permission | Write |

### Versions (2)

| Tool | Description | Type |
|---|---|---|
| `list_versions` | List file version history | Read |
| `restore_version` | Restore a file version | Write |

## How It Works

This plugin runs inside your Microsoft Word tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
