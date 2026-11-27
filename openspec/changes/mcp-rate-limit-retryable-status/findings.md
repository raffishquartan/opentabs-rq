# Findings: MCP session-creation rate limit (tasks 2 and 3)

Recorded 2026-11-27. Tree: `f/mcp-rate-limit-retryable-status` (upstream v0.0.115). Client measured: Claude Code 2.1.332. No product code was changed. Measurement scripts and raw logs are kept outside the repository (they contain local settings).

## Summary

- The reported `opentabs (429): Error POSTing to endpoint: Too Many Requests` is the `initialize` POST to `/mcp` refused by the session-creation limit in `handleMcp` (`http-routes.ts:729-730`).
- Every Claude Code connection sends two POSTs without a session id: a `server/discover` probe, then `initialize`. The limit counts both, so only two Claude Code connections fit in a minute. A third session, subagent or hook session starting within 60 s is refused. A session reconnecting after a server restart sends a stale-session POST plus two concurrent probe and `initialize` pairs (5 counted POSTs), enough to fill the window on its own.
- Claude Code 2.1.332 treats 429 as permanent and 5xx as transient, but only at session start: 429 is never retried there and the server is marked failed for the session; 503 and 500 are retried. On a mid-session reconnect (after a `404 Session not found`) every status is retried 5 times, after which 5xx keeps retrying in the background while 429 gives up permanently.
- `Retry-After` is ignored by Claude Code in every case.
- Gate 3.3: **GO**. 503 is retried at session start and in the mid-session background phase, where 429 is not. Caveat on the start-up retry window below.

## 2.1 Sources of 429

Every `429` in `platform/mcp-server/src` comes from `checkEndpointRateLimit` (`http-routes.ts:166`, sliding 60 s window per key in `state.endpointCallTimestamps`, shared by all clients), each answered `new Response('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } })` (plain text):

| Line | Handler | Key | Limit per minute |
|---|---|---|---|
| 468 | `handleToolCall` (`POST /tools/:name/call`) | `/tools/call` | 30 |
| 606 | `handleExtensionReload` | `/extension/reload` | 10 |
| 625 | `handlePluginSettings` | `/plugin-settings` | 10 |
| 730 | `handleMcp` (`POST /mcp`, no live session) | `/mcp-session-create` | 5 |
| 855 | `handleGatewayMcp` (`POST /mcp/gateway`, no live session) | `/mcp/gateway-session-create` | 5 |

- The reported error comes from line 730. The text `Error POSTing to endpoint: Too Many Requests` is the client SDK's message built from the plain-text body, and Claude Code prefixes the status (`opentabs (429)`). The stub reproduced the identical string (case A).
- Order inside `handleMcp`: bearer auth, then a POST whose `mcp-session-id` names a live transport is routed to it; every other POST is counted against the limit before the body is parsed. Counted therefore: `initialize`, Claude Code's `server/discover` probe (then answered 400), stale-session POSTs (then answered 404) and any other session-less POST (400). Refused POSTs are not counted. GET and DELETE are not limited.
- No other component emits 429 on `/mcp`. The browser extension has no 429 path; `platform/cli/src/commands/tool.ts:216` only reads 429 from `/tools/call`; `platform/plugin-sdk/src/fetch.ts` handles 429 from third-party sites. The dev proxy (dev mode only) forwards the worker's status but copies only `content-type`, so it drops `Retry-After`. Production (`opentabs start`) has no proxy.
- Refusals are not logged by the server, so they cannot be counted from `server.log`.

## 2.2 What exceeds the limit

Method: read-only analysis of the live server log (2026-08-05 to 2026-11-27, 13,528 `MCP client connected` lines, 11 server starts) plus POST counts per connection measured against the stub. The live server was not restarted or exercised, so there is no live reproduction; refused POSTs are not logged, so only admitted connects can be counted.

- **The probe doubles the cost of each connection.** Claude Code sends `POST /mcp {"method":"server/discover",...}` with no session id immediately before every `initialize`, including every retry and reconnect. OpenTabs counts it, then answers 400. Claude Code ignores the probe's result whatever its status (cases F, G). So each connection uses 2 of the 5 slots, and the third connection within 60 s has its probe admitted as the 5th and its `initialize` refused with 429.
- **The log shows that ceiling.** The highest number of admitted connects in any 60 s window was 5 on most days from 2026-08-06 to 2026-08-13, and 2 on every day since 2026-08-28 except one (3 on 2026-09-19). Since 2026-10-01, 1,505 of 7,281 connects were the second in their 60 s window. The two reported incidents (2026-09-03 and 2026-11-25) fall in the 2-per-minute period. When Claude Code started sending the probe was not established.
- **Bursts that reach three connections a minute:** several Claude Code sessions, subagents or `claude -p` hook sessions starting in the same minute. Connect volume is 100 to 280 a day with no overnight lull, which points to automated `claude` processes as well as interactive starts.
- **After a server restart:** a connected session's next POST carries a stale session id. It is counted (1), answered 404, and Claude Code then starts two concurrent reconnects, each a probe plus `initialize` (4 more). One session reconnecting fills the window; a second reconnecting session gets 429 on every attempt, gives up after 5 attempts within about 16 s (case M6) and stays failed. While the window is full, a stale POST gets 429 instead of 404, so the client does not know to re-initialize (case K1): its tool call fails with `Error POSTing to endpoint: Too Many Requests` and the server still shows as connected.
- **Contribution of non-initialize POSTs:** admitted `initialize` requests never exceeded 2 a minute since 2026-08-28. The probe (answered 400) accounts for the other half of the budget in steady state, and stale-session POSTs plus the duplicate concurrent reconnect account for most of it after a restart.

## 2.3 CLI stdio bridge and a non-2xx `/mcp` response

`platform/cli/src/commands/stdio-bridge.ts` `runBridge` never inspects `response.status`:

- For a request it writes any non-empty body to stdout. The current 429 body `Too Many Requests` reaches the stdio client as a non-JSON line, so the client's `initialize` never receives a JSON-RPC response and waits for its own timeout.
- The planned 503 body is a JSON-RPC error with `id: null`. The bridge forwards it as a valid line, but a client cannot match an `id: null` error to its pending `initialize`. A stdio client never sees the HTTP status, so Claude Code's 5xx retry does not apply through the bridge.
- `sessionId` is captured once from the first successful `initialize` and never cleared, so after a server restart every request goes out with the stale id and gets `404` with `id: null`; the bridge does not re-initialize.
- Only `fetch` failures (connection refused, timeout) become a JSON-RPC error with the request's `id`.
- Not in scope for this change (no change planned to the bridge); recorded for a possible follow-up.

## 3.1 Stub endpoint

A standalone Node script (built-ins only, no credentials, `127.0.0.1` on a free port in 39601-39652, never 9515), kept outside the repository. It implements Streamable-HTTP JSON-RPC over `POST /mcp`: `initialize`, notifications, `tools/list` (one tool), `tools/call`, `ping`; unknown session id gives `404` with the OpenTabs-style JSON-RPC body; a session-less non-initialize gives 400. The first N matching POSTs are refused with a configurable status, headers and the plain-text body `Too Many Requests`; the scope is either `initialize` only (the planned behaviour) or every session-less POST before the body is read (the current OpenTabs order). A mid-session mode forgets all sessions after the first `tools/call` (a simulated restart) and re-arms the refusals. Every request is logged with timestamp, method, path, session id prefix, JSON-RPC method and status. A self-test confirmed all behaviours.

## 3.2 Claude Code against the stub

Method: each case ran `claude -p --input-format stream-json --output-format stream-json --verbose --mcp-config <case> --strict-mcp-config --settings '{"disableAllHooks":true}' --model haiku --max-turns 8` from an empty directory, so the user's MCP configuration and the live OpenTabs server were not touched and no hook sessions were spawned. Per-server state was read with the `mcp_status` control request (the state `/mcp` shows). Total model cost about USD 0.21. Limitation: measured in `-p` (SDK) mode; the debug log shows the same MCP connection manager an interactive session uses, and the 429 result matches the two reported interactive incidents.

Times are seconds from the first attempt; every attempt is a probe followed within 10 ms by `initialize`.

### Session start (refused `initialize`)

| Case | Refusal | `initialize` timeline | Retry-After honoured | Final state | Tool available |
|---|---|---|---|---|---|
| A | 429, `Retry-After: 5`, 3 times | 0 (429), no further request in 130 s | n/a | `failed`, `Error POSTing to endpoint: Too Many Requests` | No |
| B | 503, `Retry-After: 5`, 3 times | 0, 0.51, 2.02 (503); 6.04 (200) | No | `connected` by 10 s | Yes |
| C | 503, no header, 3 times | same as B | n/a | `connected` | Yes |
| D | 500, no header, 3 times | same as B | n/a | `connected` | Yes |
| E | 503, `Retry-After: 5`, always | 0, 0.51, 2.02, 6.02 (503), then none | No | `failed` to the end; no background retry | No; a model `ToolSearch` naming the server triggered one extra attempt |

- Start-up policy: initial attempt plus 3 retries at about 0.5, 1.5 and 4 s gaps (about 6 s in total), only for errors Claude Code labels transient; 429 is not in that class. After the last retry the server is `failed` and, unlike the mid-session case, no background retry follows.
- Recovery after a start-up failure: with 429 (case H) a `ToolSearch` made no request and the tool never came back. With 503 (case I) the same `ToolSearch` reconnected and the tool worked. A 5xx-failed server can be revived by naming it; a 429-failed one cannot.
- Probe refused as in the current OpenTabs order: a refused probe is ignored (case G), and retries behave as in B (case F).

### Mid-session re-initialize (first `tools/call` succeeds, then the stub forgets sessions)

The next call carries the old session id and gets 404. Claude Code logs `MCP session expired ... triggering reconnection` and starts two concurrent reconnects. The call that hit the 404 is reported to the model as `MCP server "stub" is not connected` and is not retried transparently.

| Case | Refusal of `initialize` after the 404 | Timeline | Final state | Tool back |
|---|---|---|---|---|
| M1b | 429, 3 times | 0.03 (2x 429), 1.2 (429), 3.7 (200) | `connected` | Yes |
| M2 | 503, `Retry-After: 5`, 3 times | 0.03, 0.9 (503), 2.9 (200) | `connected` | Yes |
| M3 | 503, no header, 3 times | similar | `connected` | Yes |
| M4 | 500, no header, 3 times | similar | `connected` | Yes |
| M5 | 503, always | 5 attempts to 15.9 s, then background retries at 33.8 and 69.9 | `failed`, retries continuing | No (stub never accepted) |
| M6 | 429, always | 5 attempts to 13.1 s, then `Reconnect gave up after 5 attempts`; no request in the next 95 s | `failed` permanently | No |
| M7 | 503, 6 times | 5 attempts to 13.5 s (503), background retry at 42.0 (200) | `failed`, then `connected` at 42 s without user action | Yes |

- Mid-session policy: 5 reconnect attempts with growing gaps for every status, including 429. After that, 5xx moves to background retries (about 18 to 28 s, then about 36 s) and recovers on its own; 429 gives up for the rest of the session.
- Stale POST refused instead of 404 (the current OpenTabs behaviour while the window is full): Claude Code does not treat it as session expiry, makes no `initialize`, returns the refusal as the tool error and keeps the server `connected` with the dead session; each later call repeats this until a POST finally gets 404 (cases K1, K2).

## 3.3 Gate

**GO.** At session start, 429 is not retried (server `failed`, tool never returns) while 503 with or without `Retry-After`, and 500, are retried and connect (B, C, D). Mid-session, after the 5 reconnect attempts, 503 keeps retrying in the background and recovers (M7) while 429 gives up (M6). The user was not asked, since the gate passed.

Caveats for implementation (task 4):

- `Retry-After` is ignored by Claude Code 2.1.332. A computed value still helps other clients but does not shape Claude Code's retries.
- Start-up retries last only about 6 s and are not followed by background retries. With a 60 s window, a 503 at start-up recovers only if a slot frees within about 6 s; otherwise the server ends `failed` for that session, though it can be revived by naming it, which a 429-failed one cannot. 503 therefore turns a permanent loss into a recoverable one but does not by itself guarantee start-up success during a burst.
- Counting only `initialize` (task 4.2) removes the probe and stale-session POSTs from the budget, raising the steady-state capacity from 2 to 5 Claude Code connections a minute, and makes a stale session always get the 404 that triggers re-initialization. The duplicate concurrent reconnect still costs 2 `initialize` requests per reconnecting session after a restart, so 3 or more sessions reconnecting within a minute still see 503s; the mid-session path recovers from those in the background.
- Whether the start-up gap needs more (a larger limit, or holding an `initialize` briefly until a slot frees) is a separate decision; the design keeps both out of scope.
