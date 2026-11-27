## 1. Branch

- [x] 1.1 Create `f/mcp-rate-limit-retryable-status` from the synced `main` (v0.0.115), copy `openspec/changes/mcp-rate-limit-retryable-status/` from the holding folder and commit it as the branch's first commit. Verify: `git merge-base f/mcp-rate-limit-retryable-status main` equals `main`; `openspec validate mcp-rate-limit-retryable-status` passes on the branch; the privacy grep over the folder has no hits.

## 2. Find the source and the trigger

- [x] 2.1 Confirm every site in `platform/mcp-server/src` that returns `429` and which one produced the reported `Error POSTing to endpoint: Too Many Requests` (POST to `/mcp`, plain-text body, `Retry-After: 60`). Verify: sites and line numbers recorded in `findings.md`; no other component (proxy, extension) emits a 429 on `/mcp`.
- [x] 2.2 Establish what exceeds 5 new sessions per minute: count `MCP client connected` log lines and refused POSTs per minute in the server log around a reproduction where several Claude Code sessions (including subagents and hook sessions) start together, and after a server restart with clients connected. Verify: `findings.md` states the triggering pattern and whether stale-session or non-`initialize` POSTs contributed (counts only; no session content, paths or names).
- [x] 2.3 Check how the CLI stdio bridge (`platform/cli/src/commands/stdio-bridge.ts`) handles a non-2xx `/mcp` response body. Verify: behaviour recorded in `findings.md`.

## 3. Measure Claude Code's behaviour (before any code change)

- [x] 3.1 Write a stub Streamable-HTTP MCP endpoint (standalone Node script outside the repository, one test tool) that refuses `initialize` the first N times with a configurable status and headers, logs each request with a timestamp, and can answer `404` for a live session to force a re-initialize. Verify: a plain `initialize` against it succeeds and `tools/list` returns the tool.
- [x] 3.2 Run the installed Claude Code against the stub with a dedicated `--mcp-config` and `--strict-mcp-config` (the user's MCP configuration untouched) for each case: `429` with `Retry-After: 5`, `503` with `Retry-After: 5`, `503` without `Retry-After`, `500`; each at session start and on mid-session re-initialize. Verify: `findings.md` records `claude --version`, the exact commands, the stub's request timeline per case, whether `Retry-After` was honoured, the final `/mcp` or `claude mcp list` state, and whether the tool came back.
- [x] 3.3 Gate: if `503` is not retried in at least one scenario where `429` is not, stop and present `findings.md` to the user (fallback: server-side admission queue). Verify: the go/no-go decision and the user's answer, if asked, are recorded in `findings.md`.

## 4. Implementation

- [ ] 4.1 Add one helper used by `handleMcp` and `handleGatewayMcp` that checks the session-creation window and, when over the limit, returns `503` with `Retry-After` = seconds until the oldest timestamp expires (rounded up, minimum 1) and the JSON-RPC error body (`code: -32000`, message naming the retry delay), `Content-Type: application/json`. Comment on the helper why 5xx is used rather than 429, citing the measured Claude Code behaviour and version. Verify: both handlers call the helper; administrative endpoints still return `429`.
- [ ] 4.2 In both handlers, parse the body before the limit and apply the limit only to `initialize` requests; stale-session POSTs return the existing `404` and non-`initialize` POSTs the existing `400` regardless of the window. Verify: unit tests below.
- [ ] 4.3 Unit tests in `http-routes.test.ts` (failing first): the 6th `initialize` within a minute on `/mcp` returns `503` with a JSON-RPC body and a `Retry-After` between 1 and 60 that matches the oldest timestamp; `Retry-After` is 1 when the oldest timestamp is about to expire; an `initialize` after the window frees succeeds; with the window full, a stale-session POST returns `404` and a non-`initialize` POST returns `400`; neither consumes a slot; the same cases on `/mcp/gateway`; `/tools/call`, `/extension/reload` and `/plugin-settings` still return `429` with `Retry-After: 60`. Rewrite the two existing tests that pin the old ordering. Verify: `npm run test` passes.

## 5. Docs and verification

- [ ] 5.1 Update the "Rate Limiting" section of `docs/content/docs/reference/mcp-server.mdx` (MCP session creation returns `503` with a computed `Retry-After`; only `initialize` counts; administrative endpoints unchanged) and `platform/mcp-server/CLAUDE.md` if it describes the limit. Verify: `npm run build:docs` succeeds.
- [ ] 5.2 On the branch, run `npm run build`, `npm run type-check`, `npm run lint`, `npm run knip`, `npm run test`, `npm run test:e2e` from the repo root; all exit 0. Push the branch to the fork's `origin`; optionally open a PR for review only (never merged into `main`). No version bump: platform versions belong to upstream's release process.
- [ ] 5.3 Rebuild `exec-branch` per `CLAUDE.fork.md` with this branch merged after `f/plugin-open-site-tab`; run the six checks there (all exit 0); push after user confirmation; restart the server by hand (`node <primary-checkout>/platform/cli/dist/cli.js stop`, then `start --background`) and reload the extension.
- [ ] 5.4 Smoke test on the live server: send more than 5 `initialize` POSTs within a minute (bearer-authenticated script) and confirm the extra ones receive `503` with `Retry-After`, then start a Claude Code session during the busy window and confirm OpenTabs connects once a slot frees without the user typing `/mcp`. Verify: results appended to `findings.md`.

