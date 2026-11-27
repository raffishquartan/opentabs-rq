## Why

When a plugin tool's permission is `ask`, the call blocks until the user responds in the side panel. The server has no approval timeout: `sendConfirmationRequest` waits until the user decides or the extension disconnects, and the agent receives one "Waiting for user approval" progress notification at the start and nothing after. In the originating report, two `ask` calls blocked for about 120s each and then completed once approval arrived; while they waited, the calling agent could not tell an approval wait from a hung or slow tool. The only workaround in use was switching the plugin to `auto`, which gives up the safety of `ask`.

## What Changes

- While a plugin tool call awaits approval, the server sends an immediate progress notification and then a periodic heartbeat progress notification stating that approval is still awaited, the time elapsed and, when a timeout is configured, the time remaining.
- Add an opt-in approval timeout for plugin tools (new config key, default `0` = disabled). When set and it elapses, the call returns a distinct error saying approval was not given in time and the tool did not run.
- Whenever a pending approval settles (allow, deny or timeout) the server withdraws the prompt from every connected browser profile, so no stale prompt or badge remains; a late click has no effect.
- Browser tools (`browser_*`) keep their current approval behaviour: no heartbeat change, no timeout.
- No behaviour change for existing users unless they set the timeout; heartbeats are additive.

## Capabilities

### New Capabilities
- `tool-approval-visibility`: what a caller observes while a plugin tool call waits for `ask` approval, the optional approval timeout and its error, and withdrawal of settled prompts.

### Modified Capabilities

## Impact

- `platform/mcp-server`: `runAskFlow` and `handlePluginToolCall` (`mcp-tool-dispatch.ts`), `sendConfirmationRequest` (`extension-protocol.ts`), `handleConfirmationResponse` and `rejectAllPendingConfirmations` (`extension-handlers.ts`), pending-confirmation state (`state.ts`), config parsing, `KNOWN_CONFIG_KEYS` and reload copy-to-state (`config.ts`, `reload.ts`), MCP instructions text (`mcp-setup.ts`).
- `platform/browser-extension`: new `confirmation.cancel` notification through `known-methods.ts`, `message-router.ts` (calls `clearConfirmationBadge`), `side-panel/hooks/useServerNotifications.ts`.
- `platform/cli`: `config set` key list, `KNOWN_KEYS` and help text (`platform/cli/src/commands/config.ts`).
- Docs and CLAUDE.md files. Config changes take effect on the next config reload (config watching runs in production); no restart needed. Deploy: server rebuild, extension rebuild and manual reload.
- Delivered on `f/approval-wait-visibility` off `main`, pushed to the fork and optionally opened as a PR for review only (never merged into the fork's `main`), then merged into `exec-branch`. No version bump: platform versions are owned by upstream's release process and the fork never tags or publishes. Ships first; `plugin-open-site-tab` is stacked on this branch and touches the same config and CLI lines.
