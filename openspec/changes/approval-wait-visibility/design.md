## Context

Code references are to the tree after the fork is synced to upstream v0.0.115.

`runAskFlow` (`platform/mcp-server/src/mcp-tool-dispatch.ts:187`) sends one progress notification ("Waiting for user approval in the OpenTabs side panel") and awaits `sendConfirmationRequest` (`extension-protocol.ts:411`), whose doc comment states there is no timeout. Any rejection is mapped to "requires approval but the extension is not connected". `runAskFlow` is called for browser tools (`:279`) and plugin tools (`:369`). Pending entries live in `state.pendingConfirmations` and settle in `handleConfirmationResponse` (`extension-handlers.ts:863`) or `rejectAllPendingConfirmations` (`:885`, called from `extension-protocol.ts:674`, `http-routes.ts:1223`, `shutdown.ts:78`). `confirmation.request` is broadcast to every connected profile. The extension filters inbound methods twice: `ALL_ALLOWED_METHODS` in the offscreen document (`known-methods.ts:97-106`) and `SIDE_PANEL_METHODS` (`message-router.ts:155`); the side panel re-hydrates pending prompts from the background map on open (`side-panel/App.tsx:280`). Config is hand-parsed in `parseConfigRecord` with coerce-to-default for invalid values (for example `updateCheckIntervalMinutes`, `config.ts:244-248`), and config watching runs in production, re-running `loadConfig` and copying values onto state (`reload.ts:271-347`).

## Goals / Non-Goals

**Goals:**
- The caller can always tell an approval wait from a slow or hung tool.
- Optional bound on approval waits for users who want one.
- No stale prompts in any profile after a prompt settles.

**Non-Goals:**
- Returning "awaiting approval" immediately and resuming later (MCP has no call-resumption protocol).
- Changing browser-tool approval behaviour, the approval UI layout or the permission model.
- Per-plugin timeouts; tab grouping.

## Decisions

- **Visibility first, timeout opt-in.** Heartbeats are the primary change; the timeout defaults to `0` (disabled), because the observed waits completed after about 120s and a default bound would have failed them. Alternative: 60s default; rejected for that reason.
- **One monotonic progress reporter per call.** MCP requires `progress` to increase strictly per token. Today the approval notice sends `0/1` and tool progress is forwarded verbatim afterwards, so any heartbeat would be followed by lower values. `handlePluginToolCall` creates a per-call reporter that owns the token and the last value sent: heartbeats advance it by one each, and forwarded tool progress is offset by the value at hand-over (progress `base + p`, total `base + total`). `plugin-open-site-tab` reuses the same reporter. A test spans approval heartbeats then tool progress.
- **Heartbeat in `runAskFlow`, plugin path only.** `runAskFlow` gains an options argument used only by `handlePluginToolCall`: `{ reporter, timeoutSeconds }`. The browser-tool call site passes nothing and behaves as today. The immediate notification stays; a 10s interval (a module constant, not config) then sends a heartbeat through the reporter with a message such as `Still waiting for user approval in the OpenTabs side panel (30s elapsed, 90s until timeout)`; the "until timeout" part appears only when a timeout is set. Sent only when the client supplied a progress token. The interval is cleared in a `finally`.
- **Timer stored on the pending entry.** `sendConfirmationRequest(..., { timeoutMs })` stores `timerId` on the `PendingConfirmation` entry. A single `settlePendingConfirmation(state, id, outcome)` helper clears the timer, deletes the entry, broadcasts `confirmation.cancel { id }` and then resolves or rejects. `handleConfirmationResponse`, `rejectAllPendingConfirmations` and the timer all go through it, so no site can leak a timer or skip the cancel. On timeout it rejects with a typed `ApprovalTimeoutError`.
- **Cancel on every settlement.** `confirmation.cancel` is broadcast after allow, deny and timeout, which also clears the dead prompt and badge left today in other profiles when one profile answers. `rejectAllPendingConfirmations` also broadcasts to whatever connections remain (none after the last disconnect; all of them at shutdown); extensions additionally clear their own badges on disconnect.
- **Extension handling.** `confirmation.cancel` is added to `PASSTHROUGH_METHODS` (`known-methods.ts`) and `SIDE_PANEL_METHODS` (`message-router.ts`). `message-router.ts` handles it next to `confirmation.request` (`:883-887`) by calling `clearConfirmationBadge(params.id)`, which also deletes the id from the `pendingConfirmations` map the side panel re-hydrates from (`confirmation-badge.ts:89-96`), so reopening the panel does not resurrect it. `useServerNotifications.ts` removes the prompt from the side-panel list.
- **Late clicks.** A decision for an unknown id is a no-op on the server (already true by lookup; pinned by a test). The prompt is withdrawn on settlement, so a late click occurs only within the delivery race or with a panel that missed the cancel; this is accepted and documented, with no toast.
- **Distinct error text** from `runAskFlow` when the rejection is `ApprovalTimeoutError`: `Tool <name> was not approved within <N>s; it did not run. Retry to prompt the user again.` Every other rejection keeps the existing "not connected" text. Not a new MCP error code, matching sibling results.
- **Config.** New top-level key `approvalTimeoutSeconds`, parsed with the existing coerce-to-default pattern (non-negative integer, otherwise `0`), added to `KNOWN_CONFIG_KEYS`, copied onto `state` in the reload block, and read from `state` at call time so a change applies on the next config reload. No config schema is introduced. The CLI gains a `handleSetApprovalTimeoutSeconds` branch in `handleConfigSet` (non-negative integer, otherwise rejected), plus the key in its supported keys, `KNOWN_KEYS` and help text.
- **Branching and delivery.** Built on `f/approval-wait-visibility` off `main`; `plugin-open-site-tab` is stacked on its tip, so the shared `config.ts`, CLI and docs lines conflict only once. The branch is pushed to the fork and may be opened as a PR for review only; it is never merged into the fork's `main`. It reaches the live server by a rebuild of `exec-branch`. The screenshot branches are not on `exec-branch` at this point; their `mcp-tool-dispatch.ts` conflict with this change is resolved by `rebase-screenshot-tab-branches` if that change keeps them.
- **No version bump.** Platform versions are owned by upstream's release process; the fork never tags or publishes. This reverses the earlier plan to end with a bump task, whose premise was wrong: the repo's bump mechanism publishes upstream's npm packages and pushes a release commit and tag to `main`.
- **OpenSpec artefacts.** This change folder is the branch's first commit (copied from the holding folder outside the repository); its tasks are ticked and it is archived on this branch, so it reaches `exec-branch` with the code.

## Risks / Trade-offs

- [Clients may ignore progress or not reset their request timeout on progress] -> task 1.2 records Claude Code's behaviour; heartbeats still make the wait visible in transcripts and logs.
- [Approval at the instant of timeout] -> single-threaded settle through one helper; first settlement wins, the later one no-ops.
- [One of several profiles disconnects while its prompt is pending] -> the server rejects pending confirmations only when no connections remain (`http-routes.ts:1216-1219`); the promise stays pending until another profile answers or the timeout (if set) fires. That profile clears its own badge on disconnect. Documented, not changed.
- [Heartbeat noise in long waits] -> one message per 10s, only with a progress token.

## Open Questions

Defaults applied while the user was unavailable; each can be overturned:

- D1: no platform version bump; delivery is a review-only PR plus `exec-branch` merge, never a merge into the fork's `main`.
- D2: `plugin-open-site-tab` is stacked on this branch.
- Screenshot branches (user decision, round 3, replaces D8): not merged into `exec-branch` by the sync; `rebase-screenshot-tab-branches`, sequenced last, resolves its conflict with this change if it keeps them.
- OpenSpec location (user decision, round 3): this change folder is committed on `f/approval-wait-visibility` with the code, not on `f/openspec`.
