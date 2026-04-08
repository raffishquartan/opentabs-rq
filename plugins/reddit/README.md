# Reddit

OpenTabs plugin for Reddit — gives AI agents access to Reddit through your authenticated browser session.

## Install

```bash
opentabs plugin install reddit
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-reddit
```

## Setup

1. Open [www.reddit.com](https://www.reddit.com) in Chrome and log in
2. Open the OpenTabs side panel — the Reddit plugin should appear as **ready**

## Tools (22)

### User (3)

| Tool | Description | Type |
|---|---|---|
| `get_me` | Get the current user profile | Read |
| `list_user_content` | List a user's posts, comments, or saved items | Read |
| `get_user` | Get a user profile | Read |

### Posts (4)

| Tool | Description | Type |
|---|---|---|
| `list_posts` | List posts from a subreddit | Read |
| `get_post` | Get a post and its comments | Read |
| `search_posts` | Search Reddit posts | Read |
| `submit_post` | Submit a new post | Write |

### Comments (2)

| Tool | Description | Type |
|---|---|---|
| `submit_comment` | Post a comment or reply | Write |
| `get_comment_thread` | Get a comment and its replies | Read |

### Actions (6)

| Tool | Description | Type |
|---|---|---|
| `edit_text` | Edit a post or comment | Write |
| `delete` | Delete a post or comment | Write |
| `vote` | Vote on a post or comment | Write |
| `save` | Save or unsave a post/comment | Write |
| `hide` | Hide or unhide a post | Write |
| `report` | Report a post or comment | Write |

### Subreddits (5)

| Tool | Description | Type |
|---|---|---|
| `get_subreddit` | Get subreddit details | Read |
| `search_subreddits` | Search subreddits | Read |
| `list_subscriptions` | List subscribed subreddits | Read |
| `list_popular_subreddits` | List popular subreddits | Read |
| `subscribe` | Subscribe or unsubscribe from a subreddit | Write |

### Messages (2)

| Tool | Description | Type |
|---|---|---|
| `send_message` | Send a private message | Write |
| `read_inbox` | Read inbox messages | Read |

## How It Works

This plugin runs inside your Reddit tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
