<div align="center">

<a href="https://opentabs.dev">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/readme-banner-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/readme-banner-light.svg">
    <img alt="OpenTabs" src="assets/readme-banner-light.svg" width="600">
  </picture>
</a>

<br>

[Website](https://opentabs.dev) &nbsp;&middot;&nbsp; [Docs](https://opentabs.dev/docs) &nbsp;&middot;&nbsp; [Plugins](plugins/) &nbsp;&middot;&nbsp; [Discord](https://discord.gg/opentabs)

<br>

[![npm version](https://img.shields.io/npm/v/@opentabs-dev/cli?style=flat-square&color=FFDB33)](https://www.npmjs.com/package/@opentabs-dev/cli)
[![License: MIT](https://img.shields.io/github/license/opentabs-dev/opentabs?style=flat-square&color=FFDB33)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/opentabs-dev/opentabs?style=flat-square&color=FFDB33)](https://github.com/opentabs-dev/opentabs/stargazers)

</div>

&nbsp;

**This is not another Playwright wrapper.** Every web app has internal APIs — the same endpoints its own frontend calls. OpenTabs reverse-engineered them and exposed them as [MCP tools](https://modelcontextprotocol.io/). Your AI calls the same backend the web app calls — through your browser, using your existing session. No screenshots. No DOM scraping. No pixel-guessing.

<figure>
  <img src="assets/demo-hero.gif" alt="Demo: AI checks stocks, orders food, and sends a Discord message — all through the browser" />
  <figcaption><p align="center"><sub>AI checking Robinhood, ordering DoorDash, and messaging on Discord — all through open browser tabs</sub></p></figcaption>
</figure>

## Quick Start

You need [Node.js](https://nodejs.org/) 22+ and Chrome.

```bash
npm install -g @opentabs-dev/cli
opentabs start
```

First run prints MCP config blocks you can paste straight into [Claude Code](https://github.com/anthropics/claude-code), Cursor, or Windsurf. Load the Chrome extension from `~/.opentabs/extension` via `chrome://extensions/` (Developer mode → Load unpacked).

```bash
opentabs plugin install <plugin-name>
```

Five minutes, start to finish. See the [Quick Start guide](https://opentabs.dev/docs/quick-start) for the full walkthrough.

## 100+ Plugins, ~2,000 Tools

`discord_send_message` hits Discord's real backend — fast, deterministic, cheap on tokens. The knowledge gets packaged into a reusable plugin anyone can install.

Slack, Discord, GitHub, Jira, Notion, Figma, AWS, Stripe, Robinhood, DoorDash, Airbnb, and [a lot more](plugins/). Plus built-in browser tools (screenshots, clicking, typing, network capture) that work on any tab without a plugin.

## Build a Plugin

Point your AI at any website. It analyzes the page, discovers the APIs, scaffolds the code, and registers it. Most of the plugins in this repo were built by AI in minutes.

```bash
opentabs plugin create my-app --domain .example.com
cd my-app && npm install && npm run build
```

Publish yours to npm and anyone can `opentabs plugin install` it. Keep it local for internal tools. See the [Plugin Development guide](https://opentabs.dev/docs/guides/plugin-development).

## Security

- **Everything starts off.** Every plugin is disabled by default — not "ask for confirmation," actually off. Even the plugins I ship.
- **AI-assisted code review.** When you enable a plugin, the system offers to have your AI review the adapter source code first.
- **Version-aware.** When a plugin updates, permissions reset. New code, new review.
- **Three permission levels.** Off, Ask (confirmation dialog), or Auto (runs immediately). Set per-plugin or per-tool.
- **Runs locally.** No cloud. No telemetry. Everything in `~/.opentabs/`. Full audit log of every tool call.

## How This Was Built

OpenTabs was built entirely by AI agents — zero hand-written application code. Hundreds of structured PRDs executed by [Claude Code](https://github.com/anthropics/claude-code) workers running in parallel via [Ralph](https://github.com/snarktank/ralph). Every PRD is open-sourced: **[opentabs-dev/opentabs-prds](https://github.com/opentabs-dev/opentabs-prds)**.

## Docs

**[opentabs.dev/docs](https://opentabs.dev/docs)** — Quick Start, Plugin Development, SDK Reference, Browser Tools, CLI Reference, Architecture, FAQ.

## Contributing

```bash
git clone https://github.com/opentabs-dev/opentabs.git
cd opentabs && npm install && npm run build
npm run dev       # tsc watch + MCP server + extension
npm run check     # build + type-check + lint + knip + test
```

See the [Development Setup guide](https://opentabs.dev/docs/contributing/dev-setup).

## License

[MIT](LICENSE) — This project is not affiliated with or endorsed by any third-party service it integrates with. You are responsible for complying with the terms of service of any platform you connect to. See the [full disclaimer](https://opentabs.dev/docs/legal/disclaimer).

&nbsp;

<p align="center">Built with <a href="https://github.com/anthropics/claude-code">Claude Code</a>, <a href="https://github.com/anomalyco/opencode">OpenCode</a>, <a href="https://github.com/snarktank/ralph">Ralph</a>, and <a href="https://github.com/Logging-Studio/RetroUI">RetroUI</a>.</p>
