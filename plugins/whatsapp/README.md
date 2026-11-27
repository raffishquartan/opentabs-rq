# WhatsApp

OpenTabs plugin for WhatsApp Web — gives AI agents access to WhatsApp through your authenticated browser session.

## Install

```bash
opentabs plugin install whatsapp
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-whatsapp
```

## Setup

1. Open [web.whatsapp.com](https://web.whatsapp.com) in Chrome and log in
2. Open the OpenTabs side panel — the WhatsApp plugin should appear as **ready**

## Tools (21)

### Account (1)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get the current WhatsApp user profile | Read |

### Chats (8)

| Tool | Description | Type |
|---|---|---|
| `list_chats` | List all WhatsApp chats | Read |
| `get_chat` | Get a single chat by ID | Read |
| `archive_chat` | Archive or unarchive a chat | Write |
| `pin_chat` | Pin or unpin a chat | Write |
| `mute_chat` | Mute or unmute a chat | Write |
| `mark_chat_read` | Mark a chat as read or unread | Write |
| `delete_chat` | Delete a chat | Write |
| `clear_chat` | Clear all messages from a chat | Write |

### Messages (5)

| Tool | Description | Type |
|---|---|---|
| `list_messages` | List messages in a chat | Read |
| `send_message` | Send a text message | Write |
| `star_message` | Star or unstar messages | Write |
| `delete_message` | Delete messages locally | Write |
| `revoke_message` | Unsend messages for everyone | Write |

### Contacts (4)

| Tool | Description | Type |
|---|---|---|
| `list_contacts` | List all contacts | Read |
| `get_contact` | Get a single contact by ID | Read |
| `block_contact` | Block a contact | Write |
| `unblock_contact` | Unblock a contact | Write |

### Groups (3)

| Tool | Description | Type |
|---|---|---|
| `create_group` | Create a new group chat | Write |
| `get_group_invite_link` | Get group invite link | Read |
| `revoke_group_invite_link` | Revoke and regenerate group invite link | Write |

### `list_messages` output

Returns the most recent `limit` messages (default 20, max 100), oldest first. When fewer messages are held in the tab, earlier history is loaded repeatedly, stopping at the limit, when a load adds nothing, or after 10 loads.

Each message includes:

| Field | Meaning |
|---|---|
| `text` | Body of a text message; caption of an image, video or document (empty if none); empty for all other media. Never contains thumbnail data. |
| `media_type` | `null` for text messages, otherwise WhatsApp's raw message type (e.g. `image`, `video`, `document`, `ptt` for a voice note, `sticker`, `location`) |
| `timestamp` | UTC Unix seconds |
| `timestamp_local` | Europe/London local time, ISO 8601 with offset (e.g. `2026-07-01T12:00:00+01:00`) |
| `sender` | Author in group chats, the other party for incoming 1:1 messages, the user for own messages |
| `sender_name` | Saved contact name, else the sender's self-declared name, else short name, else empty |

The raw `body` field is not returned. The response also includes `total_loaded`, `history_complete` (false only when loading earlier history failed) and, on failure, `history_error` with the cause; the messages already held are still returned.

## Development

```bash
npm test             # unit tests (Vitest)
npm run type-check   # source and test files
```

## How It Works

This plugin runs inside your WhatsApp tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
