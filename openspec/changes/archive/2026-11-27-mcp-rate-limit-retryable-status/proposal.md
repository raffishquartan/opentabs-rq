## Why

The MCP endpoint answers `429 Too Many Requests` (`Retry-After: 60`) when more than 5 new-session POSTs reach `/mcp` within a minute, across all clients. Claude Code treats that response as a permanent failure: the server is marked failed, every OpenTabs tool disappears from the session, and only the user typing `/mcp` brings it back. This was observed on 2026-09-03 and 2026-11-25 (Claude Code 2.1.331) while `/health` returned 200 and a fresh client connected normally, so the server was up and only that session's connection was refused. Claude Code documents automatic retry with backoff for transient failures (5xx, connection refused, timeout); how it classifies 429 is undocumented, and the inference that it is non-transient has not been tested. Several Claude Code sessions, subagents and hook sessions starting within the same minute are enough to exceed the limit.

## What Changes

- First establish the facts: where the 429 comes from and what triggers it, and how Claude Code actually behaves against a stub Streamable-HTTP MCP endpoint returning 429 versus 5xx, with and without `Retry-After`, both at session start and on a mid-session reconnect. The results are recorded in this change folder before any code changes.
- When new-session creation on `/mcp` or `/mcp/gateway` is over its limit, the server answers `503 Service Unavailable` with a `Retry-After` header giving the seconds until a slot frees (at least 1), and a JSON-RPC error body, instead of `429` with a fixed 60 seconds.
- Only `initialize` requests count toward and are subject to the session-creation limit. A POST naming an unknown session gets the existing `404 Session not found` (so clients re-initialize per the MCP transport rules), and a POST that is neither gets the existing `400`, regardless of the limit.
- Code comments state why a 5xx is used rather than 429.
- The limit (5 per minute) and the other rate-limited endpoints (`/tools/call`, `/extension/reload`, `/plugin-settings`, which keep `429`) are unchanged.

## Capabilities

### New Capabilities
- `mcp-session-admission`: how the MCP HTTP endpoints respond when new-session creation exceeds its rate limit, and which requests that limit applies to.

### Modified Capabilities

## Impact

- `platform/mcp-server`: `handleMcp` and `handleGatewayMcp` and the rate-limit helper in `http-routes.ts`; `http-routes.test.ts` (existing 429 tests for `/mcp` change).
- Docs: the "Rate Limiting" section of `docs/content/docs/reference/mcp-server.mdx`; `platform/mcp-server/CLAUDE.md` if it describes the limit.
- `platform/cli` stdio bridge proxies the new JSON-RPC error body unchanged (checked, not modified).
- Delivered on `f/mcp-rate-limit-retryable-status` off `main` (independent of the other changes), pushed to the fork and optionally opened as a PR for review only (never merged into the fork's `main`), then merged into `exec-branch` after `f/plugin-open-site-tab`. No version bump: platform versions are owned by upstream's release process and the fork never tags or publishes.
