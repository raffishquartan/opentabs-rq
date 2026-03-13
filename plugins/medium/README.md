# Medium

OpenTabs plugin for Medium — gives AI agents access to Medium through your authenticated browser session.

## Install

```bash
opentabs plugin install medium
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-medium
```

## Setup

1. Open [medium.com](https://medium.com) in Chrome and log in
2. Open the OpenTabs side panel — the Medium plugin should appear as **ready**

## Tools (20)

### Account (2)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get your Medium profile | Read |
| `get_notification_count` | Get unread notification count | Read |

### Users (6)

| Tool | Description | Type |
|---|---|---|
| `get_user_profile` | Get a user profile by username | Read |
| `list_following` | List users you follow | Read |
| `list_followers` | List your followers | Read |
| `follow_user` | Follow a user | Write |
| `unfollow_user` | Unfollow a user | Write |
| `get_recommended_publishers` | Get recommended accounts to follow | Read |

### Posts (4)

| Tool | Description | Type |
|---|---|---|
| `get_post` | Get a post by ID | Read |
| `search_posts` | Search for posts by keyword | Read |
| `get_tag_feed` | Get posts by tag | Read |
| `get_post_responses` | Get comments on a post | Read |

### Interactions (1)

| Tool | Description | Type |
|---|---|---|
| `clap_post` | Clap a post | Write |

### Tags (4)

| Tool | Description | Type |
|---|---|---|
| `list_recommended_tags` | Get recommended tags | Read |
| `search_tags` | Search for tags by keyword | Read |
| `follow_tag` | Follow a tag | Write |
| `unfollow_tag` | Unfollow a tag | Write |

### Collections (2)

| Tool | Description | Type |
|---|---|---|
| `get_collection` | Get a publication by ID | Read |
| `search_collections` | Search for publications by keyword | Read |

### Reading List (1)

| Tool | Description | Type |
|---|---|---|
| `get_reading_list` | Get your saved posts | Read |

## How It Works

This plugin runs inside your Medium tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
