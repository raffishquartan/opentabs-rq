# Telegram

OpenTabs plugin for Telegram — gives AI agents access to Telegram through your authenticated browser session.

## Install

```bash
opentabs plugin install telegram
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-telegram
```

## Setup

1. Open [web.telegram.org](https://web.telegram.org/k/) in Chrome and log in
2. Open the OpenTabs side panel — the Telegram plugin should appear as **ready**

## Tools (23)

### Account (1)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get your Telegram profile | Read |

### Conversations (4)

| Tool | Description | Type |
|---|---|---|
| `list_conversations` | List recent chats and conversations | Read |
| `get_conversation` | Get details about a conversation | Read |
| `mark_conversation_read` | Mark messages as read | Write |
| `set_typing` | Show typing indicator in a chat | Write |

### Messages (8)

| Tool | Description | Type |
|---|---|---|
| `get_messages` | Get messages from a chat | Read |
| `send_message` | Send a message to a chat | Write |
| `edit_message` | Edit a sent message | Write |
| `delete_messages` | Delete messages from a chat | Write |
| `forward_messages` | Forward messages to another chat | Write |
| `pin_message` | Pin a message in a chat | Write |
| `unpin_message` | Unpin a message in a chat | Write |
| `search_messages` | Search messages by keyword | Read |

### Contacts (4)

| Tool | Description | Type |
|---|---|---|
| `list_contacts` | List your Telegram contacts | Read |
| `search_contacts` | Search for users and chats | Read |
| `add_contact` | Add a user to contacts | Write |
| `delete_contact` | Remove a contact | Write |

### Users (3)

| Tool | Description | Type |
|---|---|---|
| `get_user` | Get a user profile by ID | Read |
| `get_user_profile` | Get detailed user profile with bio | Read |
| `resolve_username` | Look up a user or channel by @username | Write |

### Groups (3)

| Tool | Description | Type |
|---|---|---|
| `get_chat_info` | Get chat or channel details | Read |
| `get_chat_members` | List members of a group or channel | Read |
| `create_group` | Create a new group chat | Write |

## How It Works

This plugin runs inside your Telegram tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
