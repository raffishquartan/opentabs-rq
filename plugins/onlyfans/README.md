# OnlyFans

OpenTabs plugin for OnlyFans — gives AI agents access to OnlyFans through your authenticated browser session.

## Install

```bash
opentabs plugin install onlyfans
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-onlyfans
```

## Setup

1. Open [onlyfans.com](https://onlyfans.com) in Chrome and log in
2. Open the OpenTabs side panel — the OnlyFans plugin should appear as **ready**

## Tools (21)

### Account (2)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get your OnlyFans profile | Read |
| `get_user_profile` | Get a user profile by username | Read |

### Feed (4)

| Tool | Description | Type |
|---|---|---|
| `get_feed` | Get your content feed | Read |
| `get_post` | Get a post by ID | Read |
| `get_user_posts` | Get posts from a user | Read |
| `like_post` | Like or unlike a post | Write |

### Users (3)

| Tool | Description | Type |
|---|---|---|
| `list_users` | Look up multiple users by ID | Read |
| `get_recommendations` | Get recommended creators | Read |
| `search_users` | Search for creators | Read |

### Subscriptions (3)

| Tool | Description | Type |
|---|---|---|
| `list_subscriptions` | List your active subscriptions | Read |
| `list_subscribers` | List your subscribers | Read |
| `list_expired_subscribers` | List recently expired subscribers | Read |

### Chat (3)

| Tool | Description | Type |
|---|---|---|
| `list_chats` | List your chat conversations | Read |
| `get_chat_messages` | Read messages in a chat | Read |
| `send_chat_message` | Send a message in a chat | Write |

### Lists (2)

| Tool | Description | Type |
|---|---|---|
| `list_user_lists` | Get your user lists | Read |
| `get_list_users` | Get users in a list | Read |

### Bookmarks (2)

| Tool | Description | Type |
|---|---|---|
| `list_bookmarks` | List your bookmarked posts | Read |
| `bookmark_post` | Bookmark or unbookmark a post | Write |

### Stories (1)

| Tool | Description | Type |
|---|---|---|
| `list_stories` | List active stories from creators | Read |

### Content (1)

| Tool | Description | Type |
|---|---|---|
| `list_streams` | Get the streams feed | Read |

## How It Works

This plugin runs inside your OnlyFans tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
