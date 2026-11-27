## Why

The fork's `main` is 135 commits behind upstream release v0.0.115 (last common ancestor: release v0.0.106, 2026-05-01) and no longer follows its own documented branching strategy (`CLAUDE.fork.md` on the `f/fork-strategy-doc` branch). The strategy says `main` mirrors an upstream release tag exactly, each fork change lives on an `f/<feature>` branch, and `exec-branch` (main plus a merge of the fork's `f/` branches) is what the live server runs. In practice two fork commits landed directly on `main` in September 2026, the live server runs the primary checkout on `main` (v0.0.106 plus the approval dialog fix), and `exec-branch` was last rebuilt in May 2026. The fork's public history also contains home-directory paths in `CLAUDE.fork.md` (on `origin/f/fork-strategy-doc` and `origin/exec-branch`). Five planned changes (`fix-whatsapp-list-messages`, `approval-wait-visibility`, `plugin-open-site-tab`, `mcp-rate-limit-retryable-status`, `rebase-screenshot-tab-branches`) need current upstream code, so this sync comes first.

## What Changes

- Scrub the home-directory paths from the fork's history before anything is rebased: `git filter-repo --replace-text` over a fresh mirror clone replaces them with the placeholders `<primary-checkout>` and `<admin-worktree>`; all later rebasing and rebuilding uses the cleaned commits; a grep across every ref verifies the result. Backup tags stay local and are never pushed.
- Move the fork-only commits off `main` onto their own branches: the approval dialog fix (`472473fa`) becomes `f/improve-approval-ui`; the `openspec/` scaffold (`2347e3ec`) plus this change folder becomes `f/openspec`, which is merged into `exec-branch`. Each feature change folder is committed later on its own implementation branch, together with its code.
- Reset `main` to the latest upstream release tag (v0.0.115, `260bc756`) and force-push it with an explicit lease. Upstream `main` is one automated version-bump commit past that tag and is deliberately not used.
- Rebase the non-screenshot `f/` branches onto the new `main` (`f/fork-strategy-doc`, based on the rewritten v0.0.106 twin `b1e406d4`, uses `git rebase --onto main b1e406d4`) and rebuild `exec-branch` from scratch without the screenshot branches. The three screenshot branches are left untouched on `origin`; `rebase-screenshot-tab-branches` decides later whether they are still needed.
- Build, verify and switch the live checkout to `exec-branch`; restart the server by hand and reload the browser extension.
- Later changes become `f/` branches in this order: `f/fix-whatsapp-list-messages`, `f/approval-wait-visibility`, `f/plugin-open-site-tab` (stacked on `f/approval-wait-visibility`), `f/mcp-rate-limit-retryable-status`, then the screenshot rework. They merge into `exec-branch` in dependency order. `f/` branches may be pushed and opened as PRs for review only; nothing is ever merged into the fork's `main`, and the fork never tags or publishes.

No product behaviour changes beyond adopting upstream's commits up to v0.0.115 and setting aside the screenshot integration until `rebase-screenshot-tab-branches`.

## Capabilities

### New Capabilities

### Modified Capabilities

(none: a repository-maintenance change with no spec-level behaviour)

## Impact

- Git history: the fork's history is rewritten to remove home-directory paths; `origin/main` is force-pushed (fork only; never `upstream`). The PR #3 merge and the direct commits leave `main` but stay reachable from the new `f/` branches and local backup tags.
- Old, unscrubbed commits stay fetchable on GitHub by SHA and through `refs/pull/*` until GitHub garbage-collects them. The user chose not to request a GitHub purge.
- The rebased `f/` branches are force-pushed; `exec-branch` is force-pushed after rebuild. Every force-push needs explicit user confirmation.
- Live server: new build of server, CLI and extension; manual server restart and manual extension reload at `chrome://extensions/`. Until `rebase-screenshot-tab-branches` lands, the live `browser_screenshot_tab` is upstream's (base64 JSON or `filePath`), without the fork's MCP image content part or CLI image rendering.
- Upstream changes that overlap fork work: tool-name delimiter `__` and compact tool output (`ed02d9c3`), production config watching (`9f503ae2`), WebSocket crash safety (`c881dac0`).
- Plugin tool names change from `<plugin>_<tool>` to `<plugin>__<tool>`, so MCP client permission allow-lists naming plugin tools stop matching (private config, reported only).
- `CLAUDE.md` in the repo still describes a webhook auto-pull, a remote "ralph" server and a commit identity the fork does not use; whether those are current is out of scope here.
