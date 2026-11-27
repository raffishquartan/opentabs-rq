## 1. Branch and baseline

- [ ] 1.1 Create `f/approval-wait-visibility` from the synced `main` (v0.0.115), copy `openspec/changes/approval-wait-visibility/` from the holding folder and commit it as the branch's first commit. Verify: `git merge-base f/approval-wait-visibility main` equals `main`; `openspec validate approval-wait-visibility` passes on the branch; the privacy grep over the folder has no hits.
- [ ] 1.2 Set an `e2e-test` or other test plugin tool to `ask`, call it from Claude Code without answering, and record: whether the client gives up and after how long, its `MCP_TOOL_TIMEOUT` value, and whether progress notifications reset its request timeout. Verify: findings recorded in the PR description (no personal data).

## 2. Server

- [ ] 2.1 Add `approvalTimeoutSeconds` to `parseConfigRecord` using the existing coerce-to-default pattern (non-negative integer, else 0), to `KNOWN_CONFIG_KEYS`, to state, and to the reload copy-to-state block. Verify: `config.test.ts` cases for absent, valid, negative, fractional and string values; a reload test shows the new value on state without restart.
- [ ] 2.2 Add `timerId` to `PendingConfirmation` and a `settlePendingConfirmation` helper that clears the timer, deletes the entry, broadcasts `confirmation.cancel { id }` and resolves/rejects; route `handleConfirmationResponse`, `rejectAllPendingConfirmations` and the timer through it. Verify unit tests: timeout rejects with `ApprovalTimeoutError`; a decision clears the timer; a disconnect clears the timer; 0 sets no timer; cancel is broadcast on allow, deny and timeout; nothing is sent after settlement; a decision for an unknown id is a no-op.
- [ ] 2.3 Add the per-call monotonic progress reporter in `handlePluginToolCall`, used by the approval notice, heartbeats and forwarded tool progress (offset by the value at hand-over). Verify tests: a sequence of heartbeats then tool progress `1/5` is strictly increasing; without a progress token nothing is sent.
- [ ] 2.4 Add the options argument to `runAskFlow` (reporter, timeout) and pass it only from `handlePluginToolCall`. Verify tests (fake timers): heartbeats every 10s with elapsed/remaining text; interval cleared on every settlement; browser-tool call site sends only the initial `0/1` notification and never times out.
- [ ] 2.5 Map `ApprovalTimeoutError` to the distinct result in `runAskFlow`. Verify tests: timeout text differs from denial and from "not connected"; a non-timeout rejection still yields the "not connected" text; the tool handler is never invoked after a timeout.

## 3. Extension

- [ ] 3.1 Add `confirmation.cancel` to `PASSTHROUGH_METHODS` (`known-methods.ts`) and `SIDE_PANEL_METHODS` (`message-router.ts`). Verify: the known-methods invariant test passes and a new test shows the method reaches the side panel.
- [ ] 3.2 In `message-router.ts`, next to the `confirmation.request` handling, call `clearConfirmationBadge(params.id)` on `confirmation.cancel`; in `side-panel/hooks/useServerNotifications.ts`, remove the prompt. Verify unit tests: badge cleared, id removed from the `pendingConfirmations` map, prompt removed, prompt not re-hydrated on panel reopen, no permission persisted.

## 4. CLI

- [ ] 4.1 Add a `handleSetApprovalTimeoutSeconds` branch to `handleConfigSet` (non-negative integer, otherwise rejected with an error) and add the key to the supported keys, `KNOWN_KEYS` and help text in `platform/cli/src/commands/config.ts`. Verify CLI tests: valid value written; negative, fractional and non-numeric values rejected; `config show` displays it; help text lists it.

## 5. E2E

- [ ] 5.1 Add E2E tests with `approvalTimeoutSeconds` set to 2 in the test config: an unattended plugin `ask` call returns the timeout error and the dialog disappears; with a second profile simulated by a raw WebSocket (as in `e2e/multi-profile-routing.e2e.ts`), allowing in the real profile delivers `confirmation.cancel { id }` to the simulated one (badge and panel removal are covered by the unit tests in 3.2).
- [ ] 5.2 Confirm the existing confirmation tests (`e2e/permissions.e2e.ts`, `e2e/security.e2e.ts` disconnect-during-ask cases) pass unchanged with the default of 0. Verify: both files pass.

## 6. Docs and verification

- [ ] 6.1 Update `platform/mcp-server/CLAUDE.md` (heartbeat, timeout key, timeout error, "applies on config reload", and correct the stale "production mode has no config watching" statement), `platform/browser-extension/CLAUDE.md`, root `CLAUDE.md` (permission model paragraph), the docs site config reference, and the MCP instructions "Error Handling" block in `platform/mcp-server/src/mcp-setup.ts`.
- [ ] 6.2 On the branch, run `npm run build`, `npm run type-check`, `npm run lint`, `npm run knip`, `npm run test`, `npm run test:e2e` from the repo root; all exit 0. Push the branch to the fork's `origin`; optionally open a PR for review only (never merged into `main`). No version bump: platform versions belong to upstream's release process.
- [ ] 6.3 Rebuild `exec-branch` per `CLAUDE.fork.md` with this branch merged (no screenshot branch is on `exec-branch`); run the six checks there (all exit 0); restart the server by hand (`node <primary-checkout>/platform/cli/dist/cli.js stop`, then `start --background`), reload the extension, and smoke-test one `ask` plugin call showing heartbeats.

