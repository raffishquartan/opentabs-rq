## 1. Branch

- [x] 1.1 Create `f/plugin-open-site-tab` from the tip of `f/approval-wait-visibility` (not from `main`), copy `openspec/changes/plugin-open-site-tab/` from the holding folder and commit it as the branch's first commit. Verify: `git merge-base` equals that tip; `openspec validate plugin-open-site-tab` passes on the branch; the privacy grep over the folder has no hits. If the base is later rebased, move this branch with `git rebase --onto <new-base-tip> <old-base-tip> f/plugin-open-site-tab`.

## 2. Shared and extension

- [x] 2.1 Move `urlMatchesPatterns` from `browser-extension/src/tab-matching.ts` to `platform/shared` (browser-safe entry point) and import it from there in the extension. Verify: existing tab-matching tests pass against the shared helper; knip reports no leftover export.
- [x] 2.2 Add `data: { reason: 'no_matching_tab' }` to the no-matching-tab `-32001` in `dispatch-helpers.ts`; leave the "navigated away" and "closed before" errors unchanged. Verify: extension unit test asserts the discriminator only on the no-match path.
- [x] 2.3 Add an optional `active` boolean to `browser.openTab` (default `true`) in `browser-commands/tab-commands.ts`. Verify: unit tests for default and `active: false`; `browser_open_tab` behaviour unchanged.

## 3. Server

- [x] 3.1 Add `pluginTabAutoOpen`, `pluginTabAutoOpenProfile`, `pluginTabAutoOpenWaitSeconds` to `parseConfigRecord` with the existing coerce-to-default pattern, to `KNOWN_CONFIG_KEYS`, to state and the reload copy-to-state block. Verify: `config.test.ts` cases for absent, valid and invalid values of each; reload test shows new values on state without restart.
- [x] 3.2 Implement preconditions and profile choice. Verify unit tests: setting off, `skipPermissions` active, `tabId` given, `instance` given and no homepage each return today's `Tab closed` text byte-identical and send no open; scheme rejection and pattern rejection (including an exclude-pattern hit, via the shared matcher) append the reason sentence; one profile; several with default; several without default; default not connected.
- [x] 3.3 Implement open-and-wait-and-retry on the `no_matching_tab` discriminator inside the existing `try` (slot held, invocation start sent), with the in-flight map, remembered `{ connectionId, tabId }` and cooldown keyed by `(plugin, connectionId)`, `browser.getTabInfo` probe on that connection, readiness waiter fed by `tab.stateChanged` and `tab.syncAll`, retry with explicit `connectionId` and `tabId`, an "Opening <homepage>" notice through the per-call progress reporter, and the not-ready error naming the tab. Verify unit tests: no tab -> background tab opened and one retry on the same connection; tab present -> no open; `-32001` without the discriminator -> no open; concurrent calls -> one open; remembered tab exists -> no open, not-ready error; remembered tab in profile A does not block an open in profile B; within cooldown -> no open; wait expiry -> not-ready error and no close; readiness via `tab.syncAll` resolves the wait; tab removed during wait -> `Tab closed`; URL-like tool input ignored; progress values stay strictly increasing across approval heartbeats, the open notice and tool progress. Permission `off` and denied cases are covered by the existing early returns; add assertions that no open is sent.
- [x] 3.4 Add `homepage` and `urlPatterns` to the `plugin_inspect` response and a sentence to the review guidance. Verify: `plugin_inspect` unit test asserts both fields.

## 4. CLI

- [x] 4.1 Add `handleConfigSet` branches for the three keys (boolean `true`/`false`; non-empty string; positive integer; other values rejected with an error) and add them to the supported keys, `KNOWN_KEYS` and help text in `platform/cli/src/commands/config.ts`. Verify CLI tests: valid values written; invalid values rejected; `config show` displays them; help text lists them.

## 5. E2E

- [x] 5.1 Add E2E tests with `pluginTabAutoOpen: true` in the test config: close all `e2e-test` tabs, call an `e2e-test__*` tool, it succeeds in a newly opened background tab; a second call opens no further tab; with a simulated second profile and a configured default the tab opens in the default (extend `e2e/multi-profile-routing.e2e.ts`), and without a default the explicit error is returned; with skip-permissions active no tab opens.
- [x] 5.2 Confirm the existing closed-tab tests pass unchanged with the default off: `e2e/tool-dispatch.e2e.ts`, `e2e/iife-injection.e2e.ts`, `e2e/dispatch-resilience.e2e.ts`, `e2e/multi-profile-routing.e2e.ts`, `e2e/multi-tab-targeting.e2e.ts`, `e2e/multi-connection.e2e.ts`, `e2e/multi-instance-robust.e2e.ts`, `e2e/npm-discovery.e2e.ts`, `e2e/tab-state-sync.e2e.ts`, `e2e/side-panel-data-flow.e2e.ts`, `e2e/side-panel-open-tab.e2e.ts`. Verify: all pass.

## 6. Docs and verification

- [x] 6.1 Update `platform/mcp-server/CLAUDE.md`, `platform/browser-extension/CLAUDE.md`, `platform/shared` docs if any, root `CLAUDE.md` (tab state and plugin review paragraphs), the docs site config reference, and the "Tab closed" guidance in `platform/mcp-server/src/mcp-setup.ts:283` with the setting, preconditions, skip-permissions exclusion, profile key, not-ready error and the note that background tabs are not grouped.
- [x] 6.2 On the branch, run `npm run build`, `npm run type-check`, `npm run lint`, `npm run knip`, `npm run test`, `npm run test:e2e` from the repo root; all exit 0. Push the branch to the fork's `origin`; optionally open a PR for review only (never merged into `main`). No version bump: platform versions belong to upstream's release process.
- [x] 6.3 After both platform changes have landed on their branches, rebuild `exec-branch` per `CLAUDE.fork.md` with `f/approval-wait-visibility` then `f/plugin-open-site-tab` merged (no screenshot branch is on `exec-branch`); run the six checks there (all exit 0); restart the server by hand (`node <primary-checkout>/platform/cli/dist/cli.js stop`, then `start --background`), reload the extension, and smoke-test a plugin call with no open tab and the setting enabled.

