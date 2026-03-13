# Twitch

OpenTabs plugin for Twitch — browse streams, search channels and games, view clips and videos — gives AI agents access to Twitch through your authenticated browser session.

## Install

```bash
opentabs plugin install twitch
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-twitch
```

## Setup

1. Open [twitch.tv](https://www.twitch.tv) in Chrome and log in
2. Open the OpenTabs side panel — the Twitch plugin should appear as **ready**

## Tools (14)

### Users (2)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get the authenticated Twitch user profile | Read |
| `get_user_profile` | Get a Twitch user profile by login name | Read |

### Streams (3)

| Tool | Description | Type |
|---|---|---|
| `get_top_streams` | Get top live streams by viewer count | Read |
| `get_streams_by_game` | Get live streams for a game or category | Read |
| `get_stream` | Get live stream info for a channel | Read |

### Games (2)

| Tool | Description | Type |
|---|---|---|
| `get_top_games` | Get top games and categories by viewer count | Read |
| `get_game` | Get game/category details | Read |

### Search (2)

| Tool | Description | Type |
|---|---|---|
| `search_channels` | Search for Twitch channels | Read |
| `search_categories` | Search for games and categories | Read |

### Clips (2)

| Tool | Description | Type |
|---|---|---|
| `get_user_clips` | Get clips from a Twitch channel | Read |
| `get_game_clips` | Get top clips for a game or category | Read |

### Videos (2)

| Tool | Description | Type |
|---|---|---|
| `get_user_videos` | Get videos from a Twitch channel | Read |
| `get_video` | Get details about a specific video | Read |

### Chat (1)

| Tool | Description | Type |
|---|---|---|
| `get_channel_emotes` | Get subscription emotes for a channel | Read |

## How It Works

This plugin runs inside your Twitch tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
