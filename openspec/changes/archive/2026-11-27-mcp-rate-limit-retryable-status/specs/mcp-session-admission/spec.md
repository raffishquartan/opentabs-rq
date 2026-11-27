## Purpose
Defines how the MCP endpoints refuse new sessions when too many are created in a minute, so a burst of reconnecting clients never makes an MCP client give up on the server permanently.

**Rationale.** HTTP 429 is the conventional "too many requests" status, but Claude Code treats a 429 from the MCP endpoint as a permanent failure: it marks the server failed, removes every OpenTabs tool from the session, and only a manual `/mcp` restores it. This was observed twice (2026-09-03 and 2026-11-25, Claude Code 2.1.331) while `/health` returned 200 and a fresh client connected normally, so the server was healthy and only that session's connection was refused. Claude Code documents automatic retry with backoff (about a day) for transient failures, namely 5xx responses, connection refused and timeouts, and does not retry auth or not-found errors. The server therefore answers 503 Service Unavailable, which says "temporarily unable to take new sessions, try again", with a `Retry-After` header that gives the real time until a slot frees instead of a fixed 60 seconds. The limit itself (5 per minute) protects the server from session floods and is unchanged. Only `initialize` counts toward it because only `initialize` creates a session; a stale-session POST must keep getting 404 so that clients re-initialise as the MCP transport rules require. The behaviour of Claude Code against 429 versus 5xx is measured before any code changes (tasks 2 and 3), and the code comments restate this rationale so the status code is not "corrected" back to 429 later.

## ADDED Requirements

### Requirement: Retryable response when new-session creation is over its limit
When a new MCP session is requested on `/mcp` or `/mcp/gateway` and the session-creation limit for that endpoint (5 per rolling minute) is already reached, the server SHALL respond with HTTP status 503, a `Retry-After` header and a JSON-RPC error body, and SHALL NOT create a session. The `Retry-After` value SHALL be the whole number of seconds, rounded up and at least 1, until the oldest counted request leaves the window. The JSON-RPC error SHALL have code -32000, `id` null, and a message stating that the server is busy and naming the retry delay.

#### Scenario: Sixth initialize within a minute
- **WHEN** five `initialize` requests to `/mcp` were admitted in the last 60 seconds and a sixth arrives
- **THEN** the response has status 503, a JSON-RPC error body with code -32000, and a `Retry-After` header equal to the seconds until the oldest of the five is 60 seconds old, rounded up

#### Scenario: Slot about to free
- **WHEN** the limit is reached and the oldest counted request is 59.5 seconds old
- **THEN** the `Retry-After` header is 1

#### Scenario: Retry after the window frees
- **WHEN** a client refused with 503 retries after the `Retry-After` delay
- **THEN** its `initialize` is admitted and a session is created

#### Scenario: Gateway endpoint
- **WHEN** the same sequence is sent to `/mcp/gateway`
- **THEN** the responses match those of `/mcp`, counted against the gateway's own limit

### Requirement: Only initialize requests are subject to the session-creation limit
Only `initialize` requests SHALL be counted toward or refused by the session-creation limit. A POST naming a session the server does not know SHALL receive the 404 "Session not found" response, and any other POST without a valid session SHALL receive the 400 bad-request response, whether or not the limit is reached, and neither SHALL be counted.

#### Scenario: Stale session while the limit is reached
- **WHEN** the session-creation limit is reached and a POST arrives with an unknown `mcp-session-id`
- **THEN** the response is 404 "Session not found" and the count of the window is unchanged

#### Scenario: Non-initialize request while the limit is reached
- **WHEN** the session-creation limit is reached and a POST without a session id that is not an `initialize` request arrives
- **THEN** the response is 400 and the count of the window is unchanged

#### Scenario: Non-initialize requests do not use up the limit
- **WHEN** ten non-`initialize` POSTs without a session id arrive within a minute, followed by an `initialize`
- **THEN** the `initialize` is admitted

### Requirement: Administrative endpoint limits unchanged
The rate limits on `/tools/call`, `/extension/reload` and `/plugin-settings` SHALL keep responding with status 429 and `Retry-After: 60` when exceeded.

#### Scenario: Tool-call limit exceeded
- **WHEN** more than 30 requests reach `/tools/call` within a minute
- **THEN** the excess requests receive status 429 with `Retry-After: 60`
