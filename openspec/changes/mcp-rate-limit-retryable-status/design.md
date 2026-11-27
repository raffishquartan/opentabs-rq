## Context

Code references are to the tree after the fork is synced to upstream v0.0.115.

`checkEndpointRateLimit(state, endpoint, maxPerMinute)` (`platform/mcp-server/src/http-routes.ts:166`) is a sliding 60-second window per endpoint key, stored in `state.endpointCallTimestamps`, shared by all clients. `handleMcp` (`:701`) routes a POST carrying a known `mcp-session-id` to its transport; every other POST is checked against `/mcp-session-create` with a limit of 5 (`:729-731`) before the body is parsed, and is then either an `initialize` (new session), a stale session (`404`, `:787`) or a bad request (`400`). `handleGatewayMcp` (`:833`) repeats the same pattern with `/mcp/gateway-session-create` (`:854-856`). Both answer `new Response('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } })`. The administrative endpoints `/tools/call` (30 per minute), `/extension/reload` and `/plugin-settings` (10 per minute) use the same helper and response. Because the check precedes body parsing, stale-session and non-`initialize` POSTs consume the budget and are answered 429; existing tests pin that (`http-routes.test.ts:1119-1174`). The CLI stdio bridge (`platform/cli/src/commands/stdio-bridge.ts`) forwards any non-empty response body to stdout, so today a plain-text `Too Many Requests` reaches a stdio client as a non-JSON line.

The originating report (Claude Code 2.1.331, two occurrences) saw `opentabs (429): Error POSTing to endpoint: Too Many Requests` while the server was healthy. Claude Code's documentation states that remote MCP servers are retried with backoff (5 attempts, then for up to about a day) for transient errors (5xx, connection refused, timeout), and that auth and not-found errors are not retried; it does not mention 429 or `Retry-After`. Whether the retry applies at session start as well as on a mid-session reconnect is not documented either.

## Why 503 and not 429

- A 429 tells a well-behaved client to slow down, but the client in question (Claude Code) does not retry it: observed twice, the server was marked failed and all tools vanished until a manual `/mcp`. A 5xx is documented as transient and retried with backoff, which is the behaviour wanted when a burst of sessions briefly exhausts the limit.
- 503 also carries `Retry-After` semantically ("the service is temporarily unavailable"), so a client that honours the header waits exactly as long as needed.
- The status code is a deliberate departure from convention for MCP session creation only. The administrative endpoints keep 429 because their callers are the CLI and plugin tooling, which treat it correctly.
- The claim is verified, not assumed: tasks 2 and 3 measure Claude Code against 429 and 5xx before the change, and the result is recorded in this change folder. If no status code is retried, the fallback is a server-side admission queue instead of a status change.
- The code comments at the response site state this rationale in the same words so a later tidy-up does not revert it.

## Goals / Non-Goals

**Goals:**
- A burst of new MCP sessions never makes Claude Code drop OpenTabs permanently.
- Decisions rest on measured client behaviour, not inference.
- Clients that follow `Retry-After` are told when a slot actually frees.

**Non-Goals:**
- Changing the limit value or making it configurable (revisited only if task 2 shows normal use exceeds it after the other changes).
- Changing the administrative endpoints' 429 responses (their callers are the CLI and plugin tooling, not MCP clients).
- Per-client limits or a server-side admission queue (kept as the fallback if task 3 shows no status code is retried).
- Changes to Claude Code.

## Decisions

- **Measure before changing.** A stub Streamable-HTTP MCP endpoint (a small standalone Node script outside the repository) returns a configurable status for `initialize`: `429` with `Retry-After: 5`, `503` with `Retry-After: 5`, `503` without it, and `500`, for the first N attempts, then succeeds. It is run against the installed Claude Code (`claude --version` recorded) using a dedicated `--mcp-config` with `--strict-mcp-config`, so the user's own MCP configuration is not touched, in two scenarios: refused at session start, and refused on re-initialize after the stub answers `404` for a live session. Observed per case: whether and when Claude Code retries (request timestamps logged by the stub), whether `Retry-After` is honoured, the final state shown by `/mcp` or `claude mcp list`, and whether the tools return. Results go to `findings.md` in this change folder with the exact stub source summary, commands and version. Gate: if `503` is not retried in at least one scenario where `429` is not, implementation stops and the results go back to the user, with the admission-queue fallback as the alternative.
- **`503` with a computed `Retry-After`.** `503 Service Unavailable` is the transient-class status for "temporarily unable to handle the request". `Retry-After` is the number of seconds until the oldest timestamp in the window expires, rounded up, minimum 1, so a client that honours it is admitted on its first retry; the fixed 60 overstates the wait. Alternative: `500`; rejected because it signals a server fault and carries no standard retry semantics.
- **JSON-RPC error body.** The response is `{ jsonrpc: '2.0', error: { code: -32000, message: 'Server busy: too many new MCP sessions; retry after <N>s' }, id: null }` with `Content-Type: application/json`, matching the sibling `404` and `400` responses of the same handler and giving the stdio bridge a valid JSON-RPC line to forward.
- **Limit only what creates a session.** The body is parsed first; only `initialize` requests are checked against and counted toward the limit. Stale-session POSTs keep their `404` and non-`initialize` POSTs keep their `400` whatever the window holds. Neither allocates a server or transport, so limiting them protects nothing, and answering a stale session with anything but `404` delays the re-initialize the MCP transport rules require (after a server restart every connected client presents a stale session at once). The two tests that pin the old ordering are rewritten to the new behaviour.
- **One helper for both MCP handlers.** `handleMcp` and `handleGatewayMcp` call a single `sessionCreationBusyResponse(state, endpointKey)` (name settled in implementation) that runs the check and builds the `503`, so the two stay identical. The administrative endpoints keep calling `checkEndpointRateLimit` and returning `429`.
- **Rationale in code.** A comment on the helper states that MCP clients treat 4xx responses on the connection POST as permanent and 5xx as retryable (citing `findings.md` and the Claude Code version tested), which is why this limit answers `503` while the administrative endpoints answer `429`.
- **Branching and delivery.** `f/mcp-rate-limit-retryable-status` off `main`, independent of the other changes. This change folder is the branch's first commit (copied from the holding folder outside the repository); its tasks are ticked and it is archived on this branch, so it reaches `exec-branch` with the code. Pushed to the fork, optionally opened as a PR for review only, never merged into the fork's `main`; merged into `exec-branch` after `f/plugin-open-site-tab`.
- **No version bump.** Platform versions are owned by upstream's release process; the fork never tags or publishes.

## Risks / Trade-offs

- [Claude Code retries neither status at session start] -> the gate in task 3 stops implementation; findings and the queue fallback go to the user.
- [Retries from many clients arrive together when the window frees] -> `Retry-After` is computed per response, and Claude Code's own backoff spreads attempts; the limit still caps new sessions at 5 per minute.
- [Unlimited stale-session and non-`initialize` POSTs] -> they allocate nothing and are answered immediately; bearer authentication still applies first.
- [Behaviour drifts from upstream] -> carried as a fork branch; a candidate to offer upstream later (not in scope).

## Open Questions

Defaults applied by the planner; each can be overturned:

- Only `initialize` requests count toward the limit (stale-session and bad requests are not limited).
- The body is JSON-RPC rather than plain text.
- The limit value stays at 5 per minute.

Recorded user decisions (round 3): respond with a 5xx (expected `503` with `Retry-After`) rather than 429; test Claude Code empirically first; no platform version bump; sequenced last of the four feature changes, after `plugin-open-site-tab`, branched from `main`.
