## Context

Code references are to the tree after the fork is synced to upstream v0.0.115, with `approval-wait-visibility` beneath this branch.

`handlePluginToolCall` (`platform/mcp-server/src/mcp-tool-dispatch.ts`) runs the permission check (`off` early return, `runAskFlow` for `ask`), Ajv validation, the per-plugin concurrency counter, `sendInvocationStart`, `instance` to `tabId` resolution (an unknown or tab-less `instance` returns early), then `dispatchToExtension('tool.dispatch')`. The "closed" decision is made by the extension from a live `chrome.tabs.query`: `dispatchWithTabFallback` returns `-32001` with `No matching tab for plugin "<name>" (state: closed)` (`platform/browser-extension/src/dispatch-helpers.ts:113-118`), and the same code is used for "navigated away" and "tab closed before <op>" (`:138-176`). The extension matches URLs with `urlMatchesPatterns(url, urlPatterns, excludePatterns)` (`browser-extension/src/tab-matching.ts:12`). The server only adds the `Tab closed:` prefix (`mcp-tool-dispatch.ts:545`). The server's per-connection `tabMapping` is a cache updated by `tab.syncAll` / `tab.stateChanged`. `resolveConnection` (`extension-protocol.ts:185-226`) honours an explicit `connectionId` and otherwise falls back to `getAnyConnection` when no profile holds a tab. Each connection has a stable `connectionId` (generated once per profile in `chrome.storage.local`, shown by `extension_get_state`). `browser.openTab` (`platform/browser-extension/src/browser-commands/tab-commands.ts:37`, `chrome.tabs.create` at `:48`) opens an active, ungrouped tab. The side panel's "open plugin tab" (`background-message-handlers.ts:740`) also opens a homepage, but focuses or creates an active tab and applies no scheme check. `skipPermissions` (environment variable or side-panel toggle) lets unreviewed plugins pass the permission gate. Plugins may declare `homepage`; for settings-derived plugins both `homepage` and `urlPatterns` come from the user's own URL setting. `plugin_inspect` returns no homepage today.

## Goals / Non-Goals

**Goals:**
- With the setting enabled, one call to a permitted plugin tool works from a cold browser profile.
- No navigation to anything but the plugin's declared, pattern-matching homepage; no tab spam.

**Non-Goals:**
- Signing in on the user's behalf; closing tabs; a plugin-authored open-site API.
- Tab grouping: background tabs are not grouped by the platform. A user-environment grouping convention, if any, is out of scope.
- Disclosing a possible tab-open in the approval prompt (auto-open is opt-in, and the server cannot know authoritatively before dispatch whether the extension will report "closed").
- Per-plugin opt-out.

## Decisions

- **Server-side, triggered by the extension's authoritative "closed".** The extension adds `data: { reason: 'no_matching_tab' }` to the `-32001` it sends when `findAllMatchingTabs` returns nothing. The server acts only on that discriminator, never on its cached `tabMapping` and never on message text, so "navigated away" and "closed mid-call" keep today's behaviour. Alternative: open-if-closed inside the extension's dispatch. Rejected because the decision needs server-owned inputs (the setting, the homepage, the multi-profile choice across connections, the remembered tab and cooldown, MCP progress) that the extension does not have; pushing them to every extension duplicates state. The server path keeps one owner and adds one field to the extension. The side panel's open-tab path is not reused because it opens an active tab and has no scheme or pattern check.
- **Preconditions and error text.** Auto-open is skipped, and today's `Tab closed` error is returned byte-identical, when: the setting is off; `skipPermissions` is active; the caller gave `tabId` or `instance`; the plugin has no homepage. When the homepage is rejected, the `Tab closed` error gains one appended sentence naming the reason: the scheme is not `https:` (or `http:` on `localhost` / `127.0.0.1`), or the homepage does not match the plugin's patterns. The URL never comes from tool input.
- **Same matching as the extension.** `urlMatchesPatterns` moves from `browser-extension/src/tab-matching.ts` to `platform/shared` (browser-safe, pure) and both the extension and the server import it, so the homepage check honours `excludePatterns` exactly as tab matching does. For settings-derived plugins the check is tautological; it still rejects a mistyped homepage.
- **Disabled under `skipPermissions`.** With permissions skipped, unreviewed plugins reach dispatch; auto-open would then navigate to an unreviewed homepage. Auto-open is therefore off while `skipPermissions` is active.
- **Profile choice.** With one connection, use it. With several, the initial dispatch (when auto-open is enabled and no cached tab exists in any profile) targets the connection whose `connectionId` equals `pluginTabAutoOpenProfile`, so the extension that reports "closed" is the one that opens the tab. If several are connected and the key is unset or names a profile that is not connected, return a distinct error naming the key and the connected `connectionId`s.
- **Open, wait, retry once.** Send `browser.openTab { url: homepage, active: false }` to the chosen connection (new optional `active` flag, default `true`, so `browser_open_tab` is unchanged). Wait until that connection reports the plugin `ready` for the opened tab id, via a waiter resolved from both `tab.stateChanged` and `tab.syncAll` handling, bounded by `pluginTabAutoOpenWaitSeconds` (default 15). Then re-dispatch once with explicit `connectionId` and `tabId`. On expiry return a distinct error: tab `<id>` was opened at `<homepage>` but the plugin is not ready (sign in there and retry). The tab stays open.
- **Placement and progress.** The open-and-wait runs inside the existing `try`, after `sendInvocationStart` and with the concurrency slot held, so the audit entry and side-panel animation cover the whole call; a waiting call holds one slot for at most the wait bound. An `Opening <homepage> in a background tab` notification goes through the per-call monotonic progress reporter introduced by `approval-wait-visibility`.
- **No duplicates or spam, per profile.** The in-flight map, remembered tab and cooldown are keyed by `(plugin, connectionId)`, and the remembered value is `{ connectionId, tabId }`, because Chrome tab ids are per browser instance. Concurrent calls share one open. While `browser.getTabInfo` on that connection finds the remembered tab, no further tab opens and calls return the not-ready error naming it (covers a homepage that redirects to a sign-in page outside the patterns). A cooldown (60s, module constant) blocks a new open after the last one even if the remembered tab was closed.
- **Review visibility.** `plugin_inspect` includes `homepage` and `urlPatterns`, and the review guidance says the homepage may be opened automatically when the setting is on.
- **Config.** Three top-level keys parsed with the existing coerce-to-default pattern and no new schema: `pluginTabAutoOpen` (boolean, default `false`), `pluginTabAutoOpenProfile` (non-empty string, default unset), `pluginTabAutoOpenWaitSeconds` (positive integer, default 15). Added to `KNOWN_CONFIG_KEYS`, copied onto state on reload and read at call time, so changes apply on the next config reload. The CLI gains one `handleConfigSet` branch per key (boolean, non-empty string, positive integer; others rejected) plus supported keys, `KNOWN_KEYS` and help text.
- **Branching and delivery.** Built on `f/plugin-open-site-tab`, stacked on `f/approval-wait-visibility`; after that base is rebased, this branch moves with `git rebase --onto <new-base> <old-base>`. The branch is pushed to the fork and may be opened as a PR for review only; it is never merged into the fork's `main`. It reaches the live server via `exec-branch`, merged after its base.
- **No version bump.** Platform versions are owned by upstream's release process; the fork never tags or publishes. This reverses the earlier plan to end with a bump task, whose premise was wrong: the repo's bump mechanism publishes upstream's npm packages and pushes a release commit and tag to `main`.
- **OpenSpec artefacts.** This change folder is the branch's first commit (copied from the holding folder outside the repository); its tasks are ticked and it is archived on this branch, so it reaches `exec-branch` with the code. Because the branch is stacked, it also carries the `approval-wait-visibility` folder from its base.

## Risks / Trade-offs

- [Existing E2E tests assert "closed"] -> default off leaves them unchanged; task 5.2 runs them explicitly.
- [Heavy sites take longer than the wait bound] -> configurable bound; on expiry the tab stays open and a retry succeeds without a new tab.
- [Signed-out sites never become ready] -> remembered tab plus cooldown give one tab and a clear error, not repeated opens.
- [Prompt-injected agent loops calling a tool repeatedly] -> at most one auto-opened tab per plugin and profile per cooldown, only to the declared homepage.
- [User closes the tab mid-wait] -> waiter rejects on the tab's removal; the call returns the existing `Tab closed` error.
- [`mcp-tool-dispatch.ts` conflict with the screenshot branches] -> not on `exec-branch` at this point; resolved by `rebase-screenshot-tab-branches` if it keeps them.

## Open Questions

Defaults applied while the user was unavailable; each can be overturned:

- D1: no platform version bump; delivery is a review-only PR plus `exec-branch` merge, never a merge into the fork's `main`.
- D2: this change stays stacked on `approval-wait-visibility`.
- Screenshot branches (user decision, round 3, replaces D8): not merged into `exec-branch` by the sync; `rebase-screenshot-tab-branches`, sequenced last, resolves the `mcp-tool-dispatch.ts` conflict if it keeps them.
- OpenSpec location (user decision, round 3): this change folder is committed on `f/plugin-open-site-tab` with the code, not on `f/openspec`.
- D9: auto-open is disabled while `skipPermissions` is active.
