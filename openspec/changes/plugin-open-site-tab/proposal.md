## Why

Plugin tools run inside a page of the plugin's site, so with no matching tab open a plugin tool call fails with "Tab closed" and the plugin cannot open its own first tab. The caller must first call `browser_open_tab` and wait for readiness, one extra call per cold start (sign-in, where needed, remains a manual step this change does not remove).

## What Changes

- New opt-in setting (default off): when enabled and a plugin tool call reaches the extension and the extension reports no matching tab, the platform opens the plugin's homepage in a background tab, waits a bounded time for it to become ready, and retries the call in that tab once.
- Applies only after the permission check has passed, never while permissions are skipped, only when the caller gave neither `tabId` nor `instance`, and only when the homepage is `https:` (or `http://localhost` / `http://127.0.0.1`) and matches the plugin's URL patterns, honouring its exclude patterns.
- At most one auto-opened tab per plugin per browser profile: concurrent calls share one open, the opened tab is remembered and never duplicated while it exists, and a per-plugin cooldown prevents repeated opens.
- With several browser profiles connected, the tab opens in a configured default profile; if none is configured the call returns an explicit error.
- `plugin_inspect` output and review guidance show the plugin's homepage and URL patterns, so the reviewer sees what the platform may open.
- Background tabs are not added to any tab group; grouping is out of scope.

## Capabilities

### New Capabilities
- `plugin-tab-provisioning`: when and how the platform opens a plugin's site tab on demand before running a tool call.

### Modified Capabilities

## Impact

- `platform/mcp-server`: plugin dispatch in `handlePluginToolCall` (`mcp-tool-dispatch.ts`), `plugin_inspect` response and review guidance, config parsing, `KNOWN_CONFIG_KEYS` and reload copy-to-state (`config.ts`, `reload.ts`), MCP instructions "Tab closed" guidance (`mcp-setup.ts`).
- `platform/browser-extension`: a `closed` discriminator on the no-matching-tab `-32001` error (`dispatch-helpers.ts`); optional `active` flag on `browser.openTab` (`browser-commands/tab-commands.ts`); `urlMatchesPatterns` imported from `platform/shared` instead of `tab-matching.ts`.
- `platform/shared`: hosts `urlMatchesPatterns` so server and extension share one matcher.
- `platform/cli`: `config set` key list, `KNOWN_KEYS` and help text.
- Docs and CLAUDE.md files. Deploy: server rebuild, extension rebuild and manual reload. No plugin changes.
- Delivered on `f/plugin-open-site-tab`, stacked on `f/approval-wait-visibility` (which ships first and touches the same config and CLI lines), pushed to the fork and optionally opened as a PR for review only; never merged into the fork's `main`. No version bump: platform versions are owned by upstream's release process and the fork never tags or publishes.
