# YouTube

OpenTabs plugin for YouTube — gives AI agents access to YouTube through your authenticated browser session.

## Install

```bash
opentabs plugin install youtube
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-youtube
```

## Setup

1. Open [youtube.com](https://youtube.com) in Chrome and log in
2. Open the OpenTabs side panel — the YouTube plugin should appear as **ready**

## Tools (18)

### Search (1)

| Tool | Description | Type |
|---|---|---|
| `search_videos` | Search YouTube for videos | Read |

### Videos (3)

| Tool | Description | Type |
|---|---|---|
| `get_video` | Get video details by ID | Read |
| `like_video` | Like a video | Write |
| `unlike_video` | Remove a like from a video | Write |

### Feed (3)

| Tool | Description | Type |
|---|---|---|
| `get_home_feed` | Get personalized home feed | Read |
| `get_subscriptions_feed` | Get latest videos from subscriptions | Read |
| `get_watch_history` | Get recent watch history | Read |

### Channels (3)

| Tool | Description | Type |
|---|---|---|
| `get_channel` | Get channel details by ID | Read |
| `subscribe` | Subscribe to a channel | Write |
| `unsubscribe` | Unsubscribe from a channel | Write |

### Playlists (5)

| Tool | Description | Type |
|---|---|---|
| `list_playlists` | List your playlists | Read |
| `get_playlist` | Get playlist videos | Read |
| `create_playlist` | Create a new playlist | Write |
| `delete_playlist` | Delete a playlist | Write |
| `add_to_playlist` | Add a video to a playlist | Write |

### Comments (2)

| Tool | Description | Type |
|---|---|---|
| `get_video_comments` | Get comments on a video | Read |
| `create_comment` | Post a comment on a video | Write |

### Notifications (1)

| Tool | Description | Type |
|---|---|---|
| `get_notifications` | Get notification inbox | Read |

## How It Works

This plugin runs inside your YouTube tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
